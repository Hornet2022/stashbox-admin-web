#!/usr/bin/env bash
# e2e-backend.sh — 起/停 admin-web 端到端测试专用的后端实例。
#
# 为什么要单独一套：
#
# playwright 的 e2e 打的是 **生产** api-gateway（:8100），于是每次跑 e2e 都会往
# 生产库写数据。一次全量跑实测造出 51 个用户、49 篇文章、45 条软删音色和一堆
# 试听文件，只能事后手工清理。后端 pytest 那边已经隔离到 stashbox_test 了
# （backend/tests/conftest.py），admin-web 这边还欠着。
#
# 本脚本起的这套（四个服务，缺一不可）：
#   stashbox_e2e 库（跑 alembic，seed migration 自带 admin 账号）
#   redis db 14
#   user-service    :18101
#   content-service :18102
#   ai-service      :18103
#   api-gateway     :18100
#
# ⚠️ 四个都必须起。之前只起了 ai-service + api-gateway，而网关只覆盖了
# AI_SERVICE_URL，CONTENT_SERVICE_URL / USER_SERVICE_URL 回落到 .env 里的生产
# 8102/8101 —— 结果 /api/v1/admin/tts/voices 全部转发到生产 content-service，
# 测试 9 项全绿的同时把音色写进了生产库（实测 7→11 行）。**只改端口不够，
# 必须把网关的每个上游都显式指到 e2e 实例上。**
#
# 端口刻意避开生产的 8100-8104，两套可以并存；端口选 181xx 而不是 8xxx，
# 是为了不和本机的 :8000/:8008/:8010/:8011（embedding/tts/rerank）撞。
#
# 用法：
#   bash e2e-backend.sh up       # 起（已起则跳过）+ 隔离自检；含蒸馏 worker
#   bash e2e-backend.sh down     # 停（含 worker；生产 8100-8104 与生产 worker 不受影响）
#   bash e2e-backend.sh reset    # 删库重建（用例之间要干净起点时用）
#   bash e2e-backend.sh status
#   bash e2e-backend.sh ensure   # e2e 前置检查，不在就拉起
#   bash e2e-backend.sh verify   # 只跑隔离自检
#   bash e2e-backend.sh worker status  # 只看 worker（会同时报出生产 worker 在不在）
#   bash e2e-backend.sh worker down    # 只停 worker
set -uo pipefail

BACKEND=/Users/hornet/work/stashbox/backend
PY="${BACKEND}/.venv/bin/python"
E2E_DB=stashbox_e2e
PROD_DB=stashbox
E2E_REDIS_DB=14
GW_PORT=18100
USER_PORT=18101
CONTENT_PORT=18102
AI_PORT=18103
RUN_DIR=/tmp/stashbox-e2e-backend
mkdir -p "${RUN_DIR}" "${RUN_DIR}/audio"

# 所有服务共用的隔离 env：不覆盖这三个就等于没隔离。
ISO_ENV=(
  "POSTGRES_DB=${E2E_DB}"
  "REDIS_DB=${E2E_REDIS_DB}"
  # ⚠️ REDIS_URL 必须显式给，而且**不能省**。
  #
  # 两个子系统读 redis 配置的方式不一样，只有这里两个都对才谈得上隔离：
  #   · 应用服务（user/content/ai/gateway）读 common/config.py，
  #     由 REDIS_HOST / REDIS_PORT / REDIS_DB / REDIS_PASSWORD **拼装** redis_url，
  #     不读 REDIS_URL（extra="ignore"）；
  #   · Arq 队列（dispatcher.enqueue_job 与 worker.WorkerSettings）走
  #     ai-service/arq_settings.py 的 load_arq_config()，**只读 REDIS_URL**，
  #     不读 REDIS_DB —— 缺省硬编码 `redis://localhost:6379/0`。
  #
  # 所以只设 REDIS_DB=14 的结果是：服务读写 db 14，蒸馏任务却入队到 **db 0**，
  # 也就是生产的队列；而 e2e 库里 distilled_articles 永远停在 queued/pending。
  # 实测症状：POST /api/v1/distill/start 返回 200，但 **`job_id` 是空字符串**
  # （入队没发生），随后 /api/v1/distill/{id} 一直 pending 到超时。
  #
  # 这正是本文件顶部记的那类事故的同一形状（上游没全指到 e2e 实例），
  # 只是这次漏的是队列而不是 HTTP 上游。
  "REDIS_URL=redis://localhost:6379/${E2E_REDIS_DB}"
  "PYTHONPATH=/Users/hornet/work"
  "USER_SERVICE_URL=http://127.0.0.1:${USER_PORT}"
  "CONTENT_SERVICE_URL=http://127.0.0.1:${CONTENT_PORT}"
  "AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}"
  "STASHBOX_ALLOW_DEV_JWT=1"
  # 打开 POST /api/v1/auth/token（dev token 端点），跨端用例要靠它。
  #
  # 为什么非开不可：cross-device.spec.ts 里的 DEVICE_USER_ID 硬编码为 1，
  # 它断言的是「后台改 user 1 → App 端立刻看到」。而 App 的登录只有
  # wechat-login 一条路，服务端按 `wx_<code>` **查/建**用户 —— 传什么 code
  # 都只能拿到/造出 `wx_xxx` 的新用户，**永远映射不到 user 1**
  # （e2e 库里 user 1 的 open_id 是 seed 建的 `admin_seed`）。
  # 结果就是：App 登录后是个陌生账号，后台改 user 1 的配额它看不见，
  # 跨端断言必假红，且红得毫无道理。
  #
  # 安卓 debug 包为此专门留了「联调登录」按钮，点的就是这个端点。
  # 双重门控的另一侧也满足：e2e 网关读 backend/.env 的 ENVIRONMENT=dev，
  # 不是 prod（api-gateway/main.py 里 env 变量 + 非 prod 两者缺一即 403）。
  # 这套后端只监听 127.0.0.1、只连 stashbox_e2e 库，不对外暴露。
  "STASHBOX_ALLOW_DEV_TOKEN=1"
  # 存储必须显式钉在 local。2026-10-02 起 storage 工厂的缺省从 local 改成 oss
  # （对齐 config.py / api-gateway，原先只有这一处是 local），于是 e2e 会去连
  # **生产** SeaweedFS —— 而 voice-library.spec.ts 会真上传参考音频，
  # 隔离测试就直接写进生产 bucket 了。e2e 一律写 ${RUN_DIR}/audio。
  "STORAGE_PROVIDER=local"
  "LOCAL_AUDIO_DIR=${RUN_DIR}/audio"
  # 公开 URL 必须指向 e2e 自己的 gateway（18100）。不设的话 LocalStorage
  # 会 fallback 到 .env 的 PUBLIC_GATEWAY_URL=http://192.168.3.100:8100 ——
  # 于是 e2e 造出来的试听产物 URL 指向**生产** gateway，必然 404
  # （e2e gateway 明明挂载成功、文件也在，只是没人去它那儿取）。
  "LOCAL_STORAGE_PUBLIC_URL=http://127.0.0.1:${GW_PORT}/audio"
  # content-service 在本地模式下会**改写** audio_url 的 host：
  # main.py 的 _to_article_response / audio-url 端点里，只要 storage_provider=local
  # 且原 URL 含 localhost/127.0.0.1，就换成 `PUBLIC_GATEWAY_URL` + 原 path。
  #
  # 这个改写本身是对的（真机的 localhost 指向设备自己，连不到宿主），但它**丢掉原 URL
  # 的端口**。e2e 里真机是靠 `adb reverse tcp:18100 tcp:18100` 访问隔离后端的 ——
  # 也就是说对设备而言正确的地址恰恰就是 127.0.0.1:18100。改写一旦生效，真机拿到的
  # 就变成别的端口，连不上。
  #
  # 不设时的实测后果：接口返回 http://192.168.3.100:8100/audio/...（.env 里的旧值，
  # 本机 LAN IP 早已变成 172.16.5.28），真机 ExoPlayer 报
  # `ConnectException: Failed to connect to /192.168.3.100:8100` → Source error。
  # 所以这里必须显式指到 e2e 网关，让改写后的结果正好等于设备可达的地址。
  "PUBLIC_GATEWAY_URL=http://127.0.0.1:${GW_PORT}"
  # ENABLE_LOCAL_AUDIO_MOUNT=1：让 gateway 把 /audio/* 挂到 LOCAL_AUDIO_DIR，
  # 否则上面拼出来的 URL 取不到文件。
  "ENABLE_LOCAL_AUDIO_MOUNT=1"
)

export PGPASSWORD="${PGPASSWORD:-stashbox_dev}"
psql_base() { psql -h localhost -U stashbox -d "${1:-postgres}" -tAc "$2"; }

port_pid() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }
port_code() { curl -s -m 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$1/healthz" 2>/dev/null; }

# 起一个脱离当前 shell 的长驻进程。
# macOS 没有 setsid（实测 `setsid: command not found`），改用 python 的
# subprocess start_new_session=True —— 它内部就是 setsid(2)。判据是进程被
# init(ppid=1) 收养且 pgid 独立，父 bash 退出后不受 SIGHUP 影响。
spawn_detached() {
  local outfile="$1"; shift
  python3 - "${outfile}" "$@" <<'PY'
import subprocess, sys
outfile, cmd = sys.argv[1], sys.argv[2:]
with open(outfile, "ab", buffering=0) as f:
    subprocess.Popen(cmd, start_new_session=True,
                     stdin=subprocess.DEVNULL, stdout=f, stderr=f)
PY
}

# start_svc <名字> <端口> <工作目录> <import:app>
start_svc() {
  local name="$1" port="$2" dir="$3" target="$4"
  if [[ -n "$(port_pid "${port}")" ]]; then
    echo "• ${name} :${port} 已在跑"
    return 0
  fi
  echo "▶ 起 ${name} :${port}（db=${E2E_DB} redis=${E2E_REDIS_DB}）"
  # 用 export 而不是 `env VAR=v ...`：env 只能调外部程序，调不了 shell 函数
  # spawn_detached（实测 env: spawn_detached: No such file or directory）。
  # export 写在子 shell 里，不会污染父进程环境。
  ( cd "${dir}" && \
    export "${ISO_ENV[@]}" && \
    spawn_detached "${RUN_DIR}/${name}.out" \
      "${PY}" -u -m uvicorn "${target}" --host 127.0.0.1 --port "${port}" )
}

wait_ready() {
  local -a ports=("$@")
  echo -n "  等待就绪"
  local p
  for _ in $(seq 1 60); do
    sleep 1
    local all_ok=1
    for p in "${ports[@]}"; do
      [[ "$(port_code "${p}")" == "200" ]] || { all_ok=0; break; }
    done
    if [[ ${all_ok} == "1" ]]; then
      echo " ✅"
      return 0
    fi
    echo -n "."
  done
  echo " ✗"
  for p in "${ports[@]}"; do echo "    :${p} → $(port_code "${p}")"; done
  echo "  日志在 ${RUN_DIR}/"
  return 1
}

# ═══════════════════════════════════════════════════════════════════════════
# Arq worker（蒸馏队列消费者）
# ═══════════════════════════════════════════════════════════════════════════
#
# 为什么必须有它：原来这个脚本只起 4 个 HTTP 服务，**不起 worker**。于是
# 蒸馏任务即使成功入队也没人消费，文章永远停在 distilling —— 症状和
# 「入队失败」几乎一样，极难分辨。
#
# 为什么必须按环境变量识别、不能按进程名：
# `pkill -f "arq worker.WorkerSettings"` 会把**生产** worker 一起杀掉 ——
# 本机和生产跑的是同一个命令串（只有环境不同）。这个坑踩过一次：重启隔离
# worker 时顺手 pkill 了生产 worker，生产蒸馏停了十几分钟。生产环境未必
# 有任务在跑（那次恰好没有），但下一次就未必。
#
# 所以下面所有"找出隔离 worker"的逻辑，都要求**环境里带 REDIS_URL 且指向
# db ${E2E_REDIS_DB}** 这个独有标记；裸的进程名匹配一律不用。
WORKER_PID_FILE="${RUN_DIR}/worker.pid"
# `import stashbox.backend.*` 要的是**仓库的父目录**（.../work），不是仓库根 ——
# 少退一层就会得到 .../work/stashbox，于是 ModuleNotFoundError: No module named
# 'stashbox'。BACKEND=<repo>/backend，所以要退两层。
WORKER_PKG_PARENT="$(dirname "$(dirname "${BACKEND}")")"

# 隔离 worker 的独有环境标记（e2e 与生产的 REDIS_URL 不同）。
worker_env_marker() { echo "REDIS_URL=redis://localhost:6379/${E2E_REDIS_DB}"; }

# 列出**仅** e2e 自己的 worker pid；生产 worker 不匹配，绝不会被返回。
find_isolated_workers() {
  local pid marker
  marker="$(worker_env_marker)"
  for pid in $(pgrep -f "arq worker.WorkerSettings" 2>/dev/null); do
    if ps eww -p "${pid}" 2>/dev/null | tr ' ' '\n' | grep -qx -- "${marker}"; then
      echo "${pid}"
    fi
  done
}

# 优先用 pid 文件（最精确）；没有就退回按环境标记扫描，清掉孤儿进程。
# 找不到时返回非 0 —— 调用方（status / up）要用退出码判断，别拿到空串当 pid 用。
worker_pid() {
  local pid found
  if [[ -f "${WORKER_PID_FILE}" ]]; then
    pid="$(cat "${WORKER_PID_FILE}" 2>/dev/null)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null \
       && ps eww -p "${pid}" 2>/dev/null | tr ' ' '\n' | grep -qx -- "$(worker_env_marker)"; then
      echo "${pid}"; return 0
    fi
    rm -f "${WORKER_PID_FILE}"
  fi
  found="$(find_isolated_workers | head -1)"
  [[ -n "${found}" ]] || return 1
  echo "${found}"
}

cmd_worker_up() {
  local pid
  if pid="$(worker_pid)"; then
    echo "• e2e arq worker 已在跑 (pid=${pid}，db=${E2E_DB} redis=${E2E_REDIS_DB})"
    return 0
  fi
  echo "▶ 起 e2e arq worker（db=${E2E_DB} redis=${E2E_REDIS_DB}）"
  # PYTHONPATH 要同时含仓库**父目录**与 ai-service 目录：前者让 `stashbox.*`
  # 绝对导入可用，后者让顶层模块（dispatcher / worker / tasks）可导入。
  ( cd "${BACKEND}" && \
    export "${ISO_ENV[@]}" && \
    export PYTHONPATH="${WORKER_PKG_PARENT}:${BACKEND}/ai-service" && \
    spawn_detached "${RUN_DIR}/worker.out" \
      "${PY}" -u -m arq worker.WorkerSettings )
  sleep 2
  if pid="$(worker_pid)"; then
    echo "${pid}" > "${WORKER_PID_FILE}"
    echo "  worker pid=${pid} → 日志 ${RUN_DIR}/worker.out"
  else
    echo "✗ worker 没起来，看 ${RUN_DIR}/worker.out"
    return 1
  fi
}

cmd_worker_down() {
  local pid found
  found="$(find_isolated_workers)"
  if [[ -z "${found}" && ! -f "${WORKER_PID_FILE}" ]]; then
    echo "• e2e arq worker 未在跑（生产 worker 未受影响）"
    rm -f "${WORKER_PID_FILE}"
    return 0
  fi
  # pid 文件里的那个也要停（即使它已不在环境扫描结果里）
  if [[ -f "${WORKER_PID_FILE}" ]]; then
    pid="$(cat "${WORKER_PID_FILE}" 2>/dev/null)"
    [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null && found="${found}"$'\n'"${pid}"
  fi
  for pid in $(echo "${found}" | sort -u); do
    # 二次确认：命令行仍像 arq worker 才动手。pid 会被系统回收复用，
    # 光凭 pid 文件就 kill 有可能打到后来占了这个 pid 的无关进程。
    if ps -p "${pid}" -o command= 2>/dev/null | grep -q "arq worker.WorkerSettings"; then
      kill "${pid}" 2>/dev/null && echo "  停 e2e arq worker (pid=${pid})"
    fi
  done
  sleep 1
  rm -f "${WORKER_PID_FILE}"
  echo "• 已停（生产 arq worker 不受影响）"
}

cmd_worker_status() {
  local pid
  if pid="$(worker_pid)"; then
    echo "e2e arq worker: 在跑 (pid=${pid}，db=${E2E_DB} redis=${E2E_REDIS_DB})"
  else
    echo "e2e arq worker: 未在跑"
  fi
  # 顺带报一下**生产** worker 的存在，让"少了一个"能一眼看出来 ——
  # 但绝不碰它。
  local ppid
  for ppid in $(pgrep -f "arq worker.WorkerSettings" 2>/dev/null); do
    if ! ps eww -p "${ppid}" 2>/dev/null | tr ' ' '\n' | grep -qx -- "$(worker_env_marker)"; then
      echo "生产 arq worker: 在跑 (pid=${ppid})"
    fi
  done
}

ensure_db() {
  if [[ "$(psql_base postgres "SELECT 1 FROM pg_database WHERE datname='${E2E_DB}'")" != "1" ]]; then
    echo "▶ 建库 ${E2E_DB}"
    psql_base postgres "CREATE DATABASE \"${E2E_DB}\" OWNER \"stashbox\"" >/dev/null
  fi

  # 迁移判据：**看 alembic 版本**，不是「users 表在不在」。
  #
  # 原来判的是「users 表存在吗」→ 存在就**永远不迁移**。
  # 于是代码加了新迁移（0040 给 articles 加 manual_tags 列）后，
  # e2e 库一直停在旧版本，而服务跑的是新代码 ⇒ 每个碰 articles 表的请求
  # 都 500（`column articles.manual_tags does not exist`）——
  # 症状像「服务坏了」，根因是「库没迁移」，而 `up` 还照常报 ✅ 就绪。
  #
  # 2026-10-25 实测：e2e 库落后 **7 个迁移**（0033 → 0040），
  # 集成测试因此稳定红，而它们是 `skip_in_ci` 的 ⇒ CI 从不跑 ⇒ 没人发现。
  #
  # ⚠️ 「有表但没有 alembic_version」是另一回事：那不是 alembic 建的库，
  # 跑 upgrade head 会在已有表上 CREATE TABLE 而失败 —— 这时要**跳过并说清**，
  # 而不是把迁移错误当成「库坏了」。
  local head cur have
  head=$( cd "${BACKEND}" && PYTHONPATH=/Users/hornet/work "${PY}" -m alembic heads 2>/dev/null \
          | tail -1 | awk '{print $1}' )
  cur=$(psql_base "${E2E_DB}" "SELECT version_num FROM alembic_version LIMIT 1" 2>/dev/null)
  if [[ -z "${cur}" ]]; then
    have=$(psql_base "${E2E_DB}" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users'" 2>/dev/null)
    if [[ "${have:-0}" == "0" ]]; then
      echo "▶ 跑 alembic（含 seed，自带 admin 账号）"
      ( cd "${BACKEND}" && PYTHONPATH=/Users/hornet/work POSTGRES_DB=${E2E_DB} REDIS_DB=${E2E_REDIS_DB} \
        "${PY}" -m alembic upgrade head > "${RUN_DIR}/alembic.out" 2>&1 ) \
        || { echo "✗ 迁移失败，见 ${RUN_DIR}/alembic.out"; return 1; }
    else
      echo "⚠ ${E2E_DB} 有表但没有 alembic_version —— 不是 alembic 建的库，跳过迁移"
    fi
  elif [[ "${cur}" != "${head}" ]]; then
    echo "▶ 迁移 ${E2E_DB}：${cur} → ${head}"
    ( cd "${BACKEND}" && PYTHONPATH=/Users/hornet/work POSTGRES_DB=${E2E_DB} REDIS_DB=${E2E_REDIS_DB} \
      "${PY}" -m alembic upgrade head > "${RUN_DIR}/alembic.out" 2>&1 ) \
      || { echo "✗ 迁移失败，见 ${RUN_DIR}/alembic.out"; return 1; }
  fi
  seed_data
}

# e2e 基线数据。
#
# 为什么需要：alembic 的 seed 只建出 admin 账号，而用例是照着「库里已经有一批
# 文章、有个婷婷音色」写的。空库跑下来 6 个用例假失败（既有音色渲染、试听、
# 文章操作按钮……）—— 看着像代码坏了，其实是缺夹具。
#
# 幂等：全部用 WHERE NOT EXISTS 守 keyed 值，重复跑不会造重复行。
# 婷婷音色的参考音频指向真实 wav，试听用例要真的能合成出音频。
seed_data() {
  local ref_wav="${BACKEND}/data/voices/tingting_ref.wav"
  if [[ ! -f "${ref_wav}" ]]; then
    echo "✗ 参考音频不在: ${ref_wav}（试听用例需要它才能真合成）"
    return 1
  fi

  local before
  before=$(psql_base "${E2E_DB}" "SELECT (SELECT count(*) FROM tts_voices) || '/' || (SELECT count(*) FROM articles)" 2>/dev/null)

  psql -h localhost -U stashbox -d "${E2E_DB}" -q -v ON_ERROR_STOP=1 > "${RUN_DIR}/seed.out" 2>&1 <<SQL
-- 测试用户（文章有 user_id 外键）。tier 只能取
-- free/student/member/pro/operator/admin —— users_tier_check 会拒掉别的。
INSERT INTO users (open_id, nickname, tier, email)
SELECT 'e2e_seed_user', 'E2E 测试用户', 'free', 'e2e-user@stashbox.local'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE open_id = 'e2e_seed_user');

-- 婷婷音色：与生产同配置（is_default 唯一索引只约束未软删的）。
-- id 没有默认值（平时由应用生成 ttsv_<24hex>），这里显式给一个可读的。
INSERT INTO tts_voices (id, slug, display_name, description, ref_audio_url, ref_text, is_default, is_active, sort_order)
SELECT 'ttsv_e2e_seed_tingting0001', 'tingting-v2', '婷婷（e2e 基线）', 'e2e 基线音色', '${ref_wav}',
       '今天天气不错，我们一起来看看这条新闻讲了什么内容。', true, true, 10
WHERE NOT EXISTS (SELECT 1 FROM tts_voices WHERE slug = 'tingting-v2');

-- 三篇文章，覆盖 ready / failed / pending 三种状态：
-- 文章管理页的「操作」列按钮按状态渲染，空表会让那条用例假失败。
-- created_at/updated_at 显式给 now() —— 这两列的库默认值是冻结的
-- （seed 迁移 SET DEFAULT 的后遗症，所有行都显示同一个历史时间戳）。
INSERT INTO articles (id, user_id, url, title, source, status, raw_content, audio_url, created_at, updated_at)
-- raw_content 是 jsonb 列（生产里存的就是 JSON null），所以用 to_jsonb 把
-- 普通文本包成 JSON 字符串；NULL 仍是 NULL。
SELECT t.id, u.id, t.url, t.title, t.source, t.status, to_jsonb(t.raw_content), t.audio_url, now(), now()
FROM (VALUES
  ('art_e2e0000000000000001', 'https://example.com/e2e/ready',   'e2e 已就绪文章', 'wechat_mp', 'ready',   '正文内容：这是一条已就绪的 e2e 测试文章。', 'http://192.168.3.100:8333/stashbox-audio/e2e/ready.mp3'),
  ('art_e2e0000000000000002', 'https://example.com/e2e/failed',  'e2e 失败文章',   'web',       'failed',  '正文内容：这是一条失败的 e2e 测试文章。',   NULL),
  ('art_e2e0000000000000003', 'https://example.com/e2e/pending', 'e2e 待处理文章', 'wechat',    'pending', NULL,                                      NULL)
) AS t(id, url, title, source, status, raw_content, audio_url)
CROSS JOIN (SELECT id FROM users WHERE open_id = 'e2e_seed_user' LIMIT 1) u
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.id = t.id);
SQL
  local rc=$?
  if [[ ${rc} != "0" ]]; then
    echo "✗ 基线数据播种失败，见 ${RUN_DIR}/seed.out"
    tail -5 "${RUN_DIR}/seed.out"
    return 1
  fi

  local after
  after=$(psql_base "${E2E_DB}" "SELECT (SELECT count(*) FROM tts_voices) || '/' || (SELECT count(*) FROM articles)" 2>/dev/null)
  if [[ "${before}" != "${after}" ]]; then
    echo "▶ 基线数据已就位（音色/文章：${before} → ${after}）"
  fi
}

# ---------------------------------------------------------------------------
# 隔离自检：往网关打一个唯一 slug 的 canary，看它落到哪个库，然后删掉。
#
# 为什么非要写一次真数据：光看进程 env 不足以证明隔离 —— 网关的每个上游都得
# 真的指对。而「测试全绿但数据进生产」这个坑已经咬过两次，静态检查挡不住。
# canary 用唯一 slug + 事后硬删，判定是确定的。
# ---------------------------------------------------------------------------
verify_isolation() {
  local canary="e2e-canary-$$-$(date +%s)"
  echo "▶ 隔离自检（canary=${canary}）"

  local tok
  tok=$(curl -s -m 10 -X POST "http://127.0.0.1:${GW_PORT}/api/v1/admin/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@stashbox.local","password":"admin@stashbox123"}' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)
  if [[ -z "${tok}" ]]; then
    echo "✗ 自检跳过：拿不到 e2e 网关的 admin token（:${GW_PORT} 登录失败）"
    return 1
  fi

  local code
  code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' \
    -X POST "http://127.0.0.1:${GW_PORT}/api/v1/admin/tts/voices" \
    -H "Authorization: Bearer ${tok}" -H 'Content-Type: application/json' \
    -d "{\"slug\":\"${canary}\",\"display_name\":\"canary\",\"ref_audio_url\":\"http://x/a.wav\",\"ref_text\":\"canary\"}")

  if [[ "${code}" != "200" && "${code}" != "201" ]]; then
    echo "✗ 自检失败：canary 写入返回 HTTP ${code}"
    return 1
  fi

  local in_e2e in_prod
  in_e2e=$(psql_base "${E2E_DB}"   "SELECT count(*) FROM tts_voices WHERE slug='${canary}'" 2>/dev/null)
  in_prod=$(psql_base "${PROD_DB}"  "SELECT count(*) FROM tts_voices WHERE slug='${canary}'" 2>/dev/null)

  # 硬删 canary：软删会留下一行，污染后续计数对比。
  psql_base "${E2E_DB}"  "DELETE FROM tts_voices WHERE slug='${canary}'" >/dev/null 2>&1
  psql_base "${PROD_DB}" "DELETE FROM tts_voices WHERE slug='${canary}'" >/dev/null 2>&1

  if [[ "${in_e2e}" == "1" && "${in_prod}" == "0" ]]; then
    echo "  ✅ canary 只落在 ${E2E_DB}（生产 0），已清理"
    return 0
  fi
  echo "  ✗✗ canary 落错库：${E2E_DB}=${in_e2e} ${PROD_DB}=${in_prod}"
  if [[ "${in_prod}" == "1" ]]; then
    echo "     → e2e 正在往生产库写东西，别跑测试！"
    echo "     → 多半是某个 *_SERVICE_URL 回落到了 .env 的 8101/8102/8103"
  fi
  echo "     → canary 已从两边删除"
  return 1
}

cmd_up() {
  ensure_db || return 1
  start_svc user-service    "${USER_PORT}"    "${BACKEND}"           "user-service.main:app"
  start_svc content-service "${CONTENT_PORT}" "${BACKEND}"           "content-service.main:app"
  start_svc ai-service      "${AI_PORT}"      "${BACKEND}/ai-service" "main:app"
  start_svc api-gateway     "${GW_PORT}"      "${BACKEND}"           "api-gateway.main:app"
  wait_ready "${USER_PORT}" "${CONTENT_PORT}" "${AI_PORT}" "${GW_PORT}" || return 1
  echo "  e2e 后端就绪: http://127.0.0.1:${GW_PORT}"
  # worker 跟着一起起：蒸馏任务入队后没人消费的话，文章会永远停在
  # distilling，而症状和"入队失败"几乎一样 —— 排查成本极高。
  cmd_worker_up || { echo "✗ worker 没起来，蒸馏链路不可用"; return 1; }
  verify_isolation
}

cmd_ensure() {
  # e2e 跑之前的前置检查：后端不在就拉起来，且**每次都自检隔离**。
  # 以前这里是静默的 —— 后端没起时前端还指着 8100（生产），于是 e2e 悄悄把
  # 数据写进了生产库，踩了两次才定位到。
  local need_up=0 p
  for p in "${USER_PORT}" "${CONTENT_PORT}" "${AI_PORT}" "${GW_PORT}"; do
    [[ "$(port_code "${p}")" == "200" ]] || need_up=1
  done
  if [[ ${need_up} == "1" ]]; then
    echo "e2e 后端未就绪，自动拉起"
    cmd_up || { echo "✗ 起不来，先跑 'bash e2e-backend.sh up' 看 ${RUN_DIR}/"; return 1; }
  else
    echo "• e2e 后端已就绪（:${GW_PORT}）"
    verify_isolation
  fi
}

cmd_down() {
  local p pid
  for p in "${GW_PORT}" "${AI_PORT}" "${CONTENT_PORT}" "${USER_PORT}"; do
    pid=$(port_pid "${p}")
    [[ -n "${pid}" ]] && { kill "${pid}" 2>/dev/null; echo "  停 :${p} (pid=${pid})"; }
  done
  sleep 2
  cmd_worker_down
  echo "• 已停（生产 8100-8104 不受影响）"
}

cmd_reset() {
  cmd_down
  echo "▶ 重建 ${E2E_DB}"
  psql_base postgres "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${E2E_DB}' AND pid<>pg_backend_pid()" >/dev/null
  psql_base postgres "DROP DATABASE IF EXISTS \"${E2E_DB}\"" >/dev/null
  cmd_up
}

cmd_status() {
  local p
  for p in "${USER_PORT}" "${CONTENT_PORT}" "${AI_PORT}" "${GW_PORT}"; do
    printf "  :%-6s %s\n" "${p}" "$(port_code "${p}")"
  done
  echo "  db ${E2E_DB}:   users=$(psql_base "${E2E_DB}" 'SELECT count(*) FROM users' 2>/dev/null || echo '?')  voices=$(psql_base "${E2E_DB}" 'SELECT count(*) FROM tts_voices' 2>/dev/null || echo '?')"
  echo "  db ${PROD_DB}:  users=$(psql_base "${PROD_DB}" 'SELECT count(*) FROM users' 2>/dev/null || echo '?')  voices=$(psql_base "${PROD_DB}" 'SELECT count(*) FROM tts_voices' 2>/dev/null || echo '?')  ← 生产，e2e 不该碰"
  echo "  生产网关 :8100 → $(curl -s -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:8100/healthz 2>/dev/null)"
}

case "${1:-up}" in
  up)     cmd_up ;;
  ensure) cmd_ensure ;;
  down)   cmd_down ;;
  reset)  cmd_reset ;;
  status) cmd_status ;;
  verify) verify_isolation ;;
  worker)
    case "${2:-status}" in
      up)     cmd_worker_up ;;
      down)   cmd_worker_down ;;
      status) cmd_worker_status ;;
      *) echo "用法: $0 worker {up|down|status}"; exit 2 ;;
    esac
    ;;
  *) echo "用法: $0 {up|down|reset|status|ensure|verify|worker up|down|status}"; exit 2 ;;
esac
