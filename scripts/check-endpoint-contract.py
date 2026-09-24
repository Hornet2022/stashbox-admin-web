#!/usr/bin/env python3
"""
前端 API 调用 ↔ 网关 ROUTES 契约比对 —— CP-NEW.24。

背景：cp-new-15 拆分 api/admin.ts 时曾把 8 个端点的路径/方法臆写漂移
（push-notifications / tts test / llm test / articles 系 / createTag），
单测照抄错误代码全部自洽通过，只有真实浏览器 + 真实网关才暴露。
本脚本做机械比对，把这类问题拦在提交前。

用法：
  python3 scripts/check-endpoint-contract.py [网关config.py路径]

默认网关路径：../stashbox/backend/api-gateway/config.py
退出码：0 = 全部对齐；1 = 存在前端调用但网关未注册（需人工确认 fallback）。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONT_GLOBS = ["src/api/admin/*.ts", "src/api/*.ts"]
DEFAULT_GW = ROOT.parent / "stashbox" / "backend" / "api-gateway" / "config.py"

# 用户侧端点：走网关 fallback 前缀匹配，不在显式 ROUTES 里也合法
FALLBACK_OK = re.compile(r"^/api/v1/(articles|tags|notifications|distill/|favorites|auth/)")


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


def load_gateway_routes(gw_path: Path) -> set[str]:
    cfg = gw_path.read_text()
    routes: set[str] = set()
    for block in re.split(r"Route\(", cfg)[1:]:
        strs = re.findall(r'"([^"]+)"', block[:220])
        if len(strs) >= 2 and strs[0] in ("GET", "POST", "PUT", "DELETE") and strs[1].startswith("/api"):
            routes.add(f"{strs[0].lower()} {re.sub(r'\{[a-z_]+\}', '{P}', strs[1])}")
    return routes


def main() -> int:
    gw_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_GW
    if not gw_path.exists():
        print(f"[contract] 网关 config 不存在：{gw_path}（跳过，非错误）")
        return 0

    front = load_frontend_calls()
    gw = load_gateway_routes(gw_path)
    missing = sorted(front - gw)
    real_missing = [x for x in missing if not FALLBACK_OK.search(x.split(" ", 1)[1])]

    print(f"[contract] 前端调用 {len(front)} 条 / 网关注册 {len(gw)} 条")
    for x in missing:
        path = x.split(" ", 1)[1]
        tag = "fallback 可达" if FALLBACK_OK.search(path) else "!! 未注册"
        print(f"  - {x}  （{tag}）")
    if real_missing:
        print(f"[contract] 失败：{len(real_missing)} 条 admin 调用在网关无注册")
        return 1
    print("[contract] 通过 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())