#!/usr/bin/env python3
"""
前端 API 调用 ↔ 网关 ROUTES / 后端签名 契约比对 —— CP-NEW.24 + 2026-10 扩展。

背景：cp-new-15 拆分 api/admin.ts 时曾把 8 个端点的路径/方法臆写漂移
（push-notifications / tts test / llm test / articles 系 / createTag），
单测照抄错误代码全部自洽通过，只有真实浏览器 + 真实网关才暴露。
本脚本做机械比对，把这类问题拦在提交前。

2026-10 扩展（bug #10）：原版只比对 **method + path**，对 query 参数名完全无感。
于是 `Articles.tsx` 发 `page`/`size`、后端签名是 `limit`/`offset` 这种漂移
能长期存活 —— FastAPI 静默丢弃未知参数，页面永远只拿到第一页，而页脚照常
打印真实 total，看起来一切正常；本脚本还一路报「通过 ✅」。
现在追加一层比对：前端实际传的 query 参数名 ⊆ 后端签名接受的参数名。

2026-10-21 扩展（文档 R2）：把**安卓端**也纳入校验。

之前这个脚本只扫 admin-web（`src/api/**`）。安卓那 11 个 Retrofit 接口
完全不在校验范围内 —— 也就是说安卓侧的路径漂移可以长期存活，
直到真机上调不通才发现。工程总览 §6 R2 记的就是这件事。

安卓的写法不一样：
- 路径在注解里：``@POST("api/v1/articles")``（**没有前导斜杠**）
- 占位符是 Retrofit 的字面量：``api/v1/articles/{id}``（不是 ``${...}``）

所以要单独一套归一化：补前导斜杠 + 把 ``{xxx}`` 也换成 ``{P}``，
才能和网关的 ``{xxx} → {P}`` 对齐。

用法：
  python3 scripts/check-endpoint-contract.py [网关config.py路径]

默认网关路径：../stashbox/backend/api-gateway/config.py
退出码：0 = 全部对齐；1 = 存在调用但网关未注册，或 query 参数名对不上。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
FRONT_GLOBS = ["src/api/admin/*.ts", "src/api/*.ts"]
BACKEND = ROOT.parent / "stashbox" / "backend"
DEFAULT_GW = BACKEND / "api-gateway" / "config.py"

# 用户侧端点：走网关 fallback 前缀匹配，不在显式 ROUTES 里也合法
FALLBACK_OK = re.compile(r"^/api/v1/(articles|tags|notifications|distill/|favorites|auth/)")

# 后端被扫的服务源码（网关自身不含业务签名）
BACKEND_GLOBS = [
    "content-service/*.py",
    "user-service/*.py",
    "ai-service/*.py",
    "api-gateway/*.py",
]

# FastAPI 依赖注入的参数名：不是 query param
DEPENDENCY_NAMES = {"user", "db", "session", "request", "response", "raw_request"}

# ── 安卓端 Retrofit 接口（2026-10-21 补上，文档 §6 R2）────────────────
ANDROID_ROOT = ROOT.parent / "stashbox-android"
ANDROID_API_GLOB = "app/src/main/kotlin/com/tingxia/audio/data/remote/*.kt"
_RETROFIT_RE = re.compile(r'@(GET|POST|PUT|DELETE|PATCH)\(\s*"([^"]+)"')

# 安卓侧走网关**兜底路由**也能到的前缀。
# 兜底的判据在 api-gateway/main.py 的 _resolve_target()：
#   segment in ("user", "subscription")  → user-service
#   segment in ("articles", "tags", "callback") → content-service
#   segment == "distill"                  → ai-service
#   其余 → 404「接口不存在」
# 注意 **"users"（复数）不在这个白名单里** —— /api/v1/users/... 必须显式注册，
# 否则会拿到 404，而客户端的 404 分支会把它误报成「文章被删除」。
ANDROID_FALLBACK_OK = re.compile(
    r"^/api/v1/(articles|tags|callback|distill|user|subscription)(/|$)"
)


def load_frontend_calls() -> set[str]:
    calls: set[str] = set()
    for pattern in FRONT_GLOBS:
        for f in sorted(ROOT.glob(pattern)):
            if f.name.startswith("_") or ".test." in f.name:
                continue
            src = f.read_text()
            for m in re.finditer(r"apiClient\.(get|post|put|delete)\(\s*[`']([^`']+)[`']", src):
                path = re.sub(r"\$\{[^}]+\}", "{P}", m.group(2))
                calls.add(f"{m.group(1)} {path}")
    return calls


def load_android_calls() -> set[str]:
    """安卓端 Retrofit 接口调用 → "METHOD /path" 集合。

    归一化两处：
    - 补前导斜杠（Retrofit 的注解路径不带）
    - ``{id}`` → ``{P}``（和网关那侧保持一致，否则同一个路径对不上）
    """
    calls: set[str] = set()
    if not ANDROID_ROOT.exists():
        return calls
    for f in sorted(ANDROID_ROOT.glob(ANDROID_API_GLOB)):
        if f.name.startswith("_"):
            continue
        src = f.read_text()
        for m in _RETROFIT_RE.finditer(src):
            path = m.group(2)
            if not path.startswith("/"):
                path = "/" + path
            path = re.sub(r"\{[a-zA-Z_]+\}", "{P}", path)
            calls.add(f"{m.group(1).lower()} {path}")
    return calls


# ---------------------------------------------------------------------------
# query 参数名提取
# ---------------------------------------------------------------------------

def _ts_object_keys(body: str) -> set[str]:
    """从 `{ a?: string; b?: number }` 形态的对象类型字面量里取键名。"""
    return {
        k.strip()
        for k in re.findall(r"^\s*([A-Za-z_$][\w$]*)\??\s*:", body, flags=re.M)
    }


def _braced_after(text: str, start: int) -> str | None:
    """返回 `text[start]` 处 `{` 配对到的那段内容（含大括号，不含外层）。"""
    if start >= len(text) or text[start] != "{":
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1: i]
    return None


def _type_literal_keys(argsrc: str, name: str) -> set[str] | None:
    """在函数签名里找 `name: { ... }` 或 `name = { ... }`，返回对象键。

    找不到返回 None（调用方据此判定「无法确定」，宁可漏报也不制造噪音）。
    """
    m = re.search(rf"\b{re.escape(name)}\b\s*[:=]\s*", argsrc)
    if not m:
        return None
    brace = argsrc.find("{", m.end())
    if brace == -1:
        return None
    body = _braced_after(argsrc, brace)
    return _ts_object_keys(body) if body is not None else None


def load_frontend_params() -> dict[str, set[str]]:
    """`METHOD /path` → 前端实际传的 query 参数名。

    处理三种写法：
      1. `apiClient.get(p, { params })`          —— 取所在函数形参的类型标注
      2. `apiClient.get(p, { params: {...} })`   —— 内联对象
      3. `apiClient.get(p)`                     —— 不传 params（空集）

    只在能**确定**参数名时报出来；解析不出来宁可漏报，也不制造噪音。
    """
    out: dict[str, set[str]] = {}
    for pattern in FRONT_GLOBS:
        for f in sorted(ROOT.glob(pattern)):
            if f.name.startswith("_") or ".test." in f.name:
                continue
            src = f.read_text()
            for m in re.finditer(r"apiClient\.(get|post|put|delete)\(\s*[`']([^`']+)[`']", src):
                path = re.sub(r"\$\{[^}]+\}", "{P}", m.group(2))
                key = f"{m.group(1)} {path}"

                # 调用括号内到语句结束
                tail = src[m.end(): m.end() + 200]
                # 2) 内联 { params: { ... } }
                inline = re.search(r"params\s*:\s*\{", tail)
                if inline:
                    depth, start = 0, inline.end() - 1
                    for i in range(start, len(tail)):
                        if tail[i] == "{":
                            depth += 1
                        elif tail[i] == "}":
                            depth -= 1
                            if depth == 0:
                                out[key] = _ts_object_keys(tail[start + 1: i])
                                break
                    continue
                # 1) `{ params }` 简写 → 往上找所在函数形参标注
                if re.match(r"\s*,\s*\{[^}]*\bparams\b", tail):
                    head = src[: m.start()]
                    fn = None
                    for fm in re.finditer(
                        r"(?:async\s+)?function\s+\w+\s*\(([^)]*)\)", head, flags=re.S
                    ):
                        fn = fm
                    argsrc = fn.group(1) if fn else ""
                    keys = _type_literal_keys(argsrc, "params")
                    out[key] = keys if keys is not None else set()
                    continue
                out.setdefault(key, set())
    return out


def _signature_after(text: str, start: int) -> str | None:
    """取 `def name(...)` 的形参列表内容，括号配对（`Depends(...)` 里有括号）。"""
    m = re.search(r"def\s+\w+\s*\(", text[start: start + 1200])
    if not m:
        return None
    open_at = start + m.end() - 1
    depth = 0
    for i in range(open_at, min(len(text), open_at + 2000)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[open_at + 1: i]
    return None


def _split_top_level(text: str) -> list[str]:
    """按**顶层**逗号切分形参列表。

    不能直接 `split(",")`：`Query(default=None, alias="from")` 和
    `Depends(require_admin_or_operator)` 内部都有逗号，直接切会把一个形参
    劈成两半 —— 那样既认不出 alias，还会把 `alias` 误当成一个 query 参数。
    """
    out: list[str] = []
    depth = 0
    buf: list[str] = []
    for ch in text:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            out.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    if buf:
        out.append("".join(buf))
    return out


def load_backend_params() -> dict[str, set[str]]:
    """`METHOD /path` → FastAPI handler 接受的 query 参数名。

    只认无 `Depends/Body/Path` 默认值、且不是路径参数、名字不在
    DEPENDENCY_NAMES 里的形参 —— 那才是 query param。
    `Query(alias="x")` 要按 alias 记：`from_` 是 Python 关键字，前端发的
    是 `from`，记形参名会误报（项目自己的 docstring 记过这个坑）。
    """
    out: dict[str, set[str]] = {}
    for pattern in BACKEND_GLOBS:
        for f in sorted(BACKEND.glob(pattern)):
            src = f.read_text()
            for m in re.finditer(
                r"@(app|router)\.(get|post|put|delete|patch)\(\s*[\"'](/api[^\"']*)[\"']",
                src,
            ):
                method = m.group(2).lower()
                raw_path = m.group(3)
                norm = re.sub(r"\{[^}]+\}", "{P}", raw_path)
                key = f"{method} {norm}"

                sig = _signature_after(src, m.end())
                if not sig:
                    continue
                params: set[str] = set()
                path_params = set(re.findall(r"\{([^}]+)\}", raw_path))
                for raw in _split_top_level(sig):
                    raw = raw.strip()
                    if not raw:
                        continue
                    name = raw.split(":")[0].split("=")[0].strip()
                    if not name or name in path_params or name in DEPENDENCY_NAMES:
                        continue
                    if re.search(r"\bDepends\(|\bBody\(|\bPath\(", raw):
                        continue
                    alias = re.search(r'Query\([^)]*alias\s*=\s*["\']([^"\']+)["\']', raw)
                    params.add(alias.group(1) if alias else name)
                out[key] = params
    return out


def load_gateway_routes(gw_path: Path) -> set[str]:
    cfg = gw_path.read_text()
    routes: set[str] = set()
    for block in re.split(r"Route\(", cfg)[1:]:
        strs = re.findall(r'"([^"]+)"', block[:220])
        # 方法白名单必须含 PATCH —— 网关**有**注册 PATCH 路由
        # （如 Route("PATCH", "/api/v1/favorites/{favorite_id}", ...)），
        # 漏了它会让"安卓调 PATCH"被误报成"未注册"。
        if len(strs) >= 2 and strs[0] in ("GET", "POST", "PUT", "DELETE", "PATCH") and strs[1].startswith("/api"):
            routes.add(f"{strs[0].lower()} {re.sub(r'\{[a-z_]+\}', '{P}', strs[1])}")
    return routes


# ---------------------------------------------------------------------------
# 网关**自己**挂上去的路由（app.include_router(...)）
# ---------------------------------------------------------------------------
#
# 为什么必须单独处理：
#
# 网关的路由有**两个**来源，只看第一个会漏掉一整类：
#   ① `api-gateway/config.py` 的 ROUTES 表 —— 代理到下游服务；
#   ② `app.include_router(X)` —— 把某个 router **直接挂在网关自己身上**，
#      由网关自己处理（例：`common/event_collect.py` 的
#      `router = APIRouter(prefix="/api/v1/events")` → `POST /api/v1/events/collect`，
#      它需要网关自己的 DB 会话，所以不能代理给下游）。
#
# 实测踩过（2026-10-25）：安卓端新增埋点上报后，本脚本报
#   「post /api/v1/events/collect（!! 未注册）」
# 而端点**明明是通的** —— ��是本脚本只认 ROUTES 表。
#
# ⇒ 这里补上 ② 的解析。它是**文本解析**（不是 import 网关），
# 所以不需要后端的 venv —— 与本脚本「纯 stdlib、CI 单仓也能跑」的定位一致。

_GW_MAIN = BACKEND / "api-gateway" / "main.py"

_IMPORT_AS_RE = re.compile(
    r"^from\s+([\w.]+)\s+import\s+(\w+)(?:\s+as\s+(\w+))?\s*$", re.M
)


def _module_file(dotted: str) -> Path | None:
    """`stashbox.backend.common.event_collect` → `<backend>/common/event_collect.py`。

    逐级去掉前缀去试：仓库根包名（`stashbox`）与 `backend` 这类
    「不是源码目录」的段名在不同布局下不一样，所以不写死。
    """
    parts = dotted.split(".")
    for cut in range(len(parts)):
        rel = Path(*parts[cut:])
        cand = BACKEND / rel.parent / f"{rel.name}.py"
        if cand.exists():
            return cand
    return None


def load_gateway_mounted_routes() -> set[str]:
    """网关用 `app.include_router(...)` 直接挂上去的路由 → "METHOD /path" 集合。"""
    if not _GW_MAIN.exists():
        return set()
    src = _GW_MAIN.read_text()
    mounted: set[str] = set()

    for inc in re.finditer(r"app\.include_router\(\s*(\w+)\s*(?:,\s*prefix\s*=\s*[\"']([^\"']+)[\"'])?", src):
        alias, extra_prefix = inc.group(1), inc.group(2) or ""
        # 反查这个别名是从哪个模块的哪个符号 import 来的
        imp = None
        for m in _IMPORT_AS_RE.finditer(src):
            sym, as_name = m.group(2), m.group(3)
            if as_name == alias or (as_name is None and sym == alias):
                imp = (m.group(1), sym)
                break
        if not imp:
            continue
        module_path = _module_file(imp[0])
        if module_path is None:
            continue
        mod_src = module_path.read_text()
        symbol = imp[1]

        # router 自身的 prefix：APIRouter(prefix="/api/v1/events")
        pm = re.search(
            rf"{re.escape(symbol)}\s*=\s*APIRouter\((.*?)\)", mod_src, re.S
        )
        router_prefix = ""
        if pm:
            am = re.search(r"""prefix\s*=\s*["']([^"']+)["']""", pm.group(1))
            router_prefix = am.group(1) if am else ""

        for rm in re.finditer(
            rf'@{re.escape(symbol)}\.(get|post|put|delete|patch)\(\s*"([^"]+)"',
            mod_src,
        ):
            method = rm.group(1).upper()
            path = router_prefix + extra_prefix + rm.group(2)
            if not path.startswith("/"):
                path = "/" + path
            mounted.add(f"{method.lower()} {re.sub(r'\{[a-z_]+\}', '{P}', path)}")
    return mounted


def main() -> int:
    gw_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_GW
    if not gw_path.exists():
        print(f"[contract] 网关 config 不存在：{gw_path}（跳过，非错误）")
        return 0

    front = load_frontend_calls()
    gw = load_gateway_routes(gw_path) | load_gateway_mounted_routes()
    missing = sorted(front - gw)
    real_missing = [x for x in missing if not FALLBACK_OK.search(x.split(" ", 1)[1])]

    print(f"[contract] 前端调用 {len(front)} 条 / 网关注册 {len(gw)} 条")
    for x in missing:
        path = x.split(" ", 1)[1]
        tag = "fallback 可达" if FALLBACK_OK.search(path) else "!! 未注册"
        print(f"  - {x}  （{tag}）")

    # ---- 安卓端 Retrofit 调用比对（文档 §6 R2）----
    android = load_android_calls()
    android_missing = sorted(android - gw)
    android_real_missing = [
        x for x in android_missing if not ANDROID_FALLBACK_OK.search(x.split(" ", 1)[1])
    ]
    if android:
        print(f"[contract] 安卓调用 {len(android)} 条")
        for x in android_missing:
            path = x.split(" ", 1)[1]
            tag = "fallback 可达" if ANDROID_FALLBACK_OK.search(path) else "!! 未注册"
            print(f"  - {x}  （{tag}）")

    # ---- query 参数名比对（bug #10）----
    front_params = load_frontend_params()
    back_params = load_backend_params()
    param_errors: list[tuple[str, set[str], set[str]]] = []
    for key, sent in sorted(front_params.items()):
        if not sent:
            continue
        if key in back_params:
            accepted = back_params[key]
            extra = sent - accepted
            if extra:
                param_errors.append((key, extra, accepted))

    if param_errors:
        print()
        print("[contract] query 参数名比对：")
        for key, extra, accepted in param_errors:
            print(f"  !! {key}")
            print(f"       前端多传：{', '.join(sorted(extra))}")
            print(f"       后端接受：{', '.join(sorted(accepted)) or '（无）'}")
        print(
            "     FastAPI 会静默丢弃未知 query 参数 —— 这类漂移不会报错，"
            "只会让筛选/分页悄悄失效。"
        )

    if real_missing or param_errors or android_real_missing:
        if real_missing:
            print(f"[contract] 失败：{len(real_missing)} 条 admin 调用在网关无注册")
        if android_real_missing:
            print(
                f"[contract] 失败：{len(android_real_missing)} 条安卓调用在网关无注册"
                "（且不在兜底路由能到的前缀里）"
            )
        if param_errors:
            print(f"[contract] 失败：{len(param_errors)} 条调用存在 query 参数名漂移")
        return 1
    print("[contract] 通过 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())