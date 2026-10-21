#!/usr/bin/env python3
"""
跨端**响应字段**契约比对 —— 安卓 DTO ↔ 后端 Pydantic 模型（2026-10-21 新增）。

背景
----
现有的 `check-endpoint-contract.py` 比对的是 **method + path** 和 **query 参数名**，
**不比对响应体里的字段名**。于是这类漂移完全在检测盲区里：

- 客户端声明了一个后端**从来不发**的字段 → 客户端永远拿到默认值，
  界面上就是个"莫名其妙是 0 / 空"的地方，**不报错**；
- 后端加了字段但客户端没跟上 → 客户端少一块信息，同样不报错。

2026-10-21 的真机 E2E 就撞上了一个：服务端 `ConsentStateResponse` 多了
`current_privacy_policy_version`，安卓 DTO 没有 —— 当时是人工比对发现的。

做法
----
**按端点**配对，而不是按类名配对（类名配对会出 Request↔Response 之类的错配）：

1. 扫后端各服务源码 → `(METHOD, path) -> {请求模型, 响应模型}`
2. 扫安卓 Retrofit 接口 → `(METHOD, path) -> {请求 DTO, 响应 DTO}`
3. path 里的 `{xxx}` 统一归一成 `{P}`（安卓写 `{id}`、后端写 `{article_id}`）
4. 逐个端点比对**字段名**

判定规则（只对"确定性错误"判失败，避免噪声）
-------------------------------------------
- **失败**：客户端 DTO 里**没有默认值**的字段，后端模型里**没有**这个字段
  → 客户端要求一个服务端从来不发的东西，**必然**静默拿默认值
- **失败**：客户端请求 DTO 里**没有默认值**的字段，后端请求模型里**没有**
  → 同上
- **提示（不判失败）**：后端模型有、客户端 DTO 没有的字段
  → 客户端落后于服务端。值得知道，但不一定错（客户端可能用不到）

CLI
---
    python3 scripts/check_response_fields.py
    python3 scripts/check_response_fields.py --verbose

退出码：0 = 没有确定性错误；1 = 有。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND = ROOT / "stashbox" / "backend"
ANDROID = ROOT / "stashbox-android" / "app" / "src" / "main"

SERVICE_DIRS = ("api-gateway", "user-service", "content-service", "ai-service")

# ── 路径归一 ────────────────────────────────────────────────────────────
_PATH_PARAM = re.compile(r"\{[^{}]+\}")


def norm_path(path: str) -> str:
    """把 path 模板归一：去掉前导斜杠、{xxx} → {P}。"""
    p = path.strip()
    if not p.startswith("/"):
        p = "/" + p
    p = _PATH_PARAM.sub("{P}", p)
    return p


# ── 后端：Pydantic 模型 → 字段集 ───────────────────────────────────────
def backend_models() -> dict[str, dict]:
    """{模型类名: {"fields": set, "required": set}}"""
    out: dict[str, dict] = {}
    for svc in SERVICE_DIRS:
        d = BACKEND / svc
        if not d.is_dir():
            continue
        for f in d.glob("*.py"):
            src = f.read_text(encoding="utf-8", errors="ignore")
            for m in re.finditer(
                r"class (\w+)\(([^)]*BaseModel[^)]*)\):\n((?:[ \t]+.*\n|\n)*)", src
            ):
                name, _bases, body = m.group(1), m.group(2), m.group(3)
                fields: set[str] = set()
                required: set[str] = set()
                for fm in re.finditer(r"^\s{4}(\w+)\s*:\s*([^=\n]+?)(?:\s*=\s*(.+))?$", body, re.M):
                    fname, ftype, fdefault = fm.group(1), fm.group(2), fm.group(3)
                    if fname.startswith("_") or fname in ("model_config", "class Config"):
                        continue
                    # 认 Pydantic 的 alias / serialization_alias ——
                    # 那才是**线上 JSON 里的键名**，比 python 属性名更权威。
                    json_name = fname
                    am = re.search(
                        r"alias\s*=\s*[\"\']([^\"\']+)[\"\']", fdefault or ""
                    ) or re.search(
                        r"serialization_alias\s*=\s*[\"\']([^\"\']+)[\"\']", fdefault or ""
                    )
                    if am:
                        json_name = am.group(1)
                    fields.add(json_name)
                    if fdefault is None:
                        required.add(json_name)
                if fields:
                    out.setdefault(name, {"fields": fields, "required": required})
    return out


# ── 后端：路由 → (请求模型, 响应模型) ───────────────────────────────────
def backend_routes(models: dict[str, dict]) -> dict[tuple[str, str], dict]:
    """{(METHOD, norm_path): {"response": 模型名, "request": 模型名}}"""
    routes: dict[tuple[str, str], dict] = {}
    for svc in SERVICE_DIRS:
        d = BACKEND / svc
        if not d.is_dir():
            continue
        for f in d.glob("*.py"):
            src = f.read_text(encoding="utf-8", errors="ignore")
            for m in re.finditer(
                r'@app\.(get|post|put|delete|patch)\(\s*"([^"]+)"(.*?)\)\s*'
                r"(?:async\s+)?def\s+(\w+)\s*\((.*?)\)\s*(?:->|:)",
                src,
                re.S,
            ):
                method = m.group(1).upper()
                path = m.group(2)
                deco_tail = m.group(3) or ""
                params = m.group(5) or ""
                resp = None
                rm = re.search(r"response_model\s*=\s*(\w+)", deco_tail)
                if rm:
                    resp = rm.group(1)
                req = None
                for pm in re.finditer(r"(\w+)\s*:\s*(\w+)", params):
                    if pm.group(2) in models:
                        req = pm.group(2)
                        break
                routes[(method, norm_path(path))] = {"response": resp, "request": req}
    return routes


# ── 安卓：@Serializable data class → 字段集 ───────────────────────────
def android_dtos() -> dict[str, dict]:
    """{DTO 类名: {"fields": set, "required": set}}"""
    out: dict[str, dict] = {}
    for f in ANDROID.rglob("*.kt"):
        src = f.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(
            r"@Serializable\s+(?:data\s+)?class\s+(\w+)\s*\((.*?)\n\s*\)", src, re.S
        ):
            name, body = m.group(1), m.group(2)
            fields: set[str] = set()
            required: set[str] = set()
            for fm in re.finditer(
                r"\bval\s+(\w+)\s*:\s*([^,\n=]+)(,\s*val\s+\w+\s*:\s*[^,\n=]+)*\s*(=\s*[^,\n]+)?",
                body,
            ):
                pass
            # 逐个 "val name: Type" 解析，并看它后面有没有 "= 默认值"
            # 先把 @SerialName("x") 和它后面的 val 关联起来 ——
            # kotlinx.serialization 序列化出去的是 **@SerialName 的值**，
            # 不是 Kotlin 属性名（`val articleId` → JSON "article_id"）。
            # 不认这个的话，比对全是假阳性。
            serial_names = {
                m.group(2): m.group(1)
                for m in re.finditer(
                    r'@SerialName\(\s*"([^"]+)"\s*\)\s*\n?\s*(?:@\w+\([^)]*\)\s*\n?\s*)*val\s+(\w+)',
                    body,
                )
            }
            for fm in re.finditer(r"\bval\s+(\w+)\s*:\s*([A-Za-z0-9_?.<> \[\]]+)\s*(=\s*[^,\n)]+)?", body):
                fname = fm.group(1)
                if fname in ("val", "var"):
                    continue
                json_name = serial_names.get(fname, fname)
                fields.add(json_name)
                if fm.group(3) is None:
                    required.add(json_name)
            if fields:
                out.setdefault(name, {"fields": fields, "required": required})
    return out


# ── 安卓：Retrofit 接口 → (METHOD, path) → {请求 DTO, 响应 DTO} ─────────
def android_routes(dtos: dict[str, dict]) -> dict[tuple[str, str], dict]:
    routes: dict[tuple[str, str], dict] = {}
    remote = ANDROID / "kotlin" / "com" / "tingxia" / "audio" / "data" / "remote"
    if not remote.is_dir():
        return routes
    for f in remote.glob("*.kt"):
        src = f.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(
            r'@(GET|POST|PUT|DELETE|PATCH)\(\s*"([^"]+)"\s*\)\s*'
            r"suspend\s+fun\s+(\w+)\s*\((.*?)\)\s*:\s*([\w?.<>]+)",
            src,
            re.S,
        ):
            method = m.group(1).upper()
            path = m.group(2)
            params = m.group(4) or ""
            ret = m.group(5)
            req = None
            bm = re.search(r"@Body\s+\w+\s*:\s*(\w+)", params)
            if bm:
                req = bm.group(1)
            resp = ret if ret in dtos else None
            routes[(method, norm_path(path))] = {"response": resp, "request": req}
    return routes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    be_models = backend_models()
    be_routes = backend_routes(be_models)
    ap_dtos = android_dtos()
    ap_routes = android_routes(ap_dtos)

    if not ap_routes:
        print("[fields] 没解析到安卓 Retrofit 接口 —— 路径不对？", file=sys.stderr)
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    compared = 0

    for key, ap_side in sorted(ap_routes.items()):
        be_side = be_routes.get(key)
        if not be_side:
            continue  # 网关/后端没有这个端点 —— 由路径比对脚本负责
        compared += 1

        for side, label in (("response", "响应"), ("request", "请求")):
            ap_model = ap_side.get(side)
            be_model = be_side.get(side)
            if not ap_model or not be_model:
                continue
            if ap_model not in ap_dtos or be_model not in be_models:
                continue
            ap_info = ap_dtos[ap_model]
            be_info = be_models[be_model]
            where = f"{key[0]} {key[1]} ({label} {ap_model} ↔ {be_model})"

            # 客户端要求、后端没有 → 必然静默拿默认值
            missing = ap_info["required"] - be_info["fields"]
            for fld in sorted(missing):
                errors.append(
                    f"{where}\n"
                    f"    客户端必填字段 `{fld}` 在后端模型里不存在 —— "
                    f"服务端永远不会发这个字段，客户端只能拿到默认值"
                )
            # 后端有、客户端没有 → 客户端落后（只提示）
            behind = be_info["fields"] - ap_info["fields"]
            if behind:
                warnings.append(f"{where}\n    后端有但客户端 DTO 没有的字段：{', '.join(sorted(behind))}")

    print(f"[fields] 比对端点 {compared} 个（安卓 {len(ap_routes)} 条 / 后端 {len(be_routes)} 条）")
    if args.verbose:
        for w in warnings:
            print("  ~ 提示:", w)
    if errors:
        print()
        print("[fields] 确定性错误：")
        for e in errors:
            print("  !!", e)
        print()
        print(f"[fields] 失败：{len(errors)} 处字段契约不一致")
        return 1
    print(f"[fields] 通过 ✅（提示 {len(warnings)} 处：后端字段比客户端多，客户端可能落后）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
