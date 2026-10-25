#!/usr/bin/env python3
"""
跨端**事件名**契约比对 —— 安卓上报的事件名 ↔ 后端 EventName 枚举（2026-10-25 新增）。

背景
----
2026-10-25 实测踩过两件事，都是「事件名」的问题，而且**都不报错**：

① 客户端上报了一个后端枚举里没有的名字
   → 后端 `_validate_event_name` 返回 400 → 埋点**静默丢失**。
   （App 不报错、后台不报错，只是某个指标一直是空的 —— 最难查的一类。）

② 客户端用了**服务端已经在打**的事件名
   → 一次播放变成两条 → 任何按该事件计数的指标**翻倍**。
   实测：安卓端音频启动埋点用了 `audio_play_start`，而服务端
   `content-service/main.py` 在「取音频直链」时已经打了同一个名字 ⇒
   A/B 报表（完听率 = audio_complete / audio_play_start、复听率 = ≥2 次）
   会**完听率掉一半、复听率把「播放 1 次」误判成「复听过」**。
   两个事件测的其实是**两件不同的事**（取到直链 vs 真的出声）。

检查项
------
A. 客户端上报的事件名 ⊆ 后端 `EventName` 枚举
   （对不上 = 后端 400 = 埋点静默丢失）

B. 客户端上报的事件名 ∩ 服务端主动打的事件名 = ∅
   （同名 = 计数翻倍。ALLOWED_SAME_NAME 里是「确实想同名」的例外。）

用法
---
    python3 scripts/check-event-names.py
    python3 scripts/check-event-names.py --verbose

退出码：0 = 通过；1 = 有问题。

缺仓时**跳过**（与同目录另两个脚本一致：CI 只 checkout 一个仓）。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND = ROOT / "stashbox" / "backend"
ANDROID = ROOT / "stashbox-android" / "app" / "src" / "main"

# 客户端与服务端**故意**同名的例外。
# 留空 = 一律不允许同名（同名几乎总是计数翻倍，见文件头的 ②）。
ALLOWED_SAME_NAME: dict[str, str] = {}


def backend_event_enum() -> set[str]:
    """后端 `EventName` 枚举的全部**值**（线上的事件名）。"""
    src = (BACKEND / "common" / "events.py").read_text(encoding="utf-8")
    m = re.search(r"class\s+EventName\b.*?\n(?=\S|\Z)", src, re.S)
    if not m:
        return set()
    return set(re.findall(r'^\s+[A-Z][A-Z0-9_]*\s*=\s*"([a-z0-9_]+)"', m.group(0), re.M))


def backend_emitted_events() -> set[str]:
    """服务端**主动打**的事件名（track / track_simple 调用里出现的）。

    只认 track/track_simple 的调用 —— 别处出现的 `EventName.X`
    （比如判断、注释里的举例）不代表服务端会打这一条。
    """
    out: set[str] = set()
    for f in BACKEND.rglob("*.py"):
        rel = f.relative_to(BACKEND).as_posix()
        if rel.startswith("tests/") or rel == "common/events.py":
            continue
        src = f.read_text(encoding="utf-8", errors="ignore")
        # track(...) / track_simple(...) 的参数里出现 EventName.X。
        # 允许一层嵌套括号（Depends(...) 之类）。
        for m in re.finditer(
            r"\btrack(?:_simple)?\((?:[^()]|\([^()]*\))*?EventName\.([A-Z][A-Z0-9_]*)",
            src,
            re.S,
        ):
            out.add(m.group(1))
    return out


def android_client_events() -> dict[str, str]:
    """安卓端**上报用**的事件名：{常量名: 线上事件名}。

    只认 `data/analytics/AnalyticsSink.kt` 里的 `object EventNames` ——
    那是客户端上报的**唯一**出处（其它地方不该硬编码事件名字符串）。
    """
    f = ANDROID / "kotlin" / "com" / "tingxia" / "audio" / "data" / "analytics" / "AnalyticsSink.kt"
    if not f.exists():
        return {}
    src = f.read_text(encoding="utf-8")
    m = re.search(r"object\s+EventNames\s*\{(.*?)\n\}", src, re.S)
    if not m:
        return {}
    return dict(
        re.findall(r'const\s+val\s+(\w+)\s*=\s*"([a-z0-9_]+)"', m.group(1))
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    if not BACKEND.exists():
        print(f"[events] 后端仓不存在：{BACKEND}（跳过，非错误）")
        return 0
    if not ANDROID.exists():
        print(f"[events] 安卓仓不存在：{ANDROID}（跳过，非错误）")
        return 0

    enum_values = backend_event_enum()
    emitted = backend_emitted_events()
    client = android_client_events()

    if not client:
        print("[events] 没解析到安卓端 EventNames —— 路径不对？", file=sys.stderr)
        return 1

    # 枚举名 → 线上值（服务端主动打的那些）
    enum_src = (BACKEND / "common" / "events.py").read_text(encoding="utf-8")
    enum_map = dict(
        re.findall(r'^\s+([A-Z][A-Z0-9_]*)\s*=\s*"([a-z0-9_]+)"', enum_src, re.M)
    )
    emitted_values = {enum_map.get(name, name) for name in emitted}

    print(f"[events] 后端枚举 {len(enum_values)} 个 / 服务端主动打 {len(emitted_values)} 个 / 客户端上报 {len(client)} 个")

    errors: list[str] = []

    # ── A. 客户端事件名必须在后端枚举里 ────────────────────────────────
    for const, value in sorted(client.items()):
        if value not in enum_values:
            errors.append(
                f"安卓端 {const} = \"{value}\" 不在后端 EventName 枚举里\n"
                f"    ⇒ 上报会被后端判 400（invalid event_name）⇒ **埋点静默丢失**"
                f"（App 不报错、后台不报错，只是指标一直是空的）"
            )

    # ── B. 不能与服务端主动打的事件同名 ────────────────────────────────
    for const, value in sorted(client.items()):
        if value in emitted_values and value not in ALLOWED_SAME_NAME:
            errors.append(
                f"安卓端 {const} = \"{value}\" 与**服务端主动打**的事件同名\n"
                f"    ⇒ 一次行为会变成两条 ⇒ 按该事件计数的指标**翻倍**\n"
                f"      （实测：A/B 报表的完听率掉一半、复听率把「播放 1 次」误判成「复听过」）\n"
                f"    ⇒ 除非两个事件测的确实是**两件不同的事**，否则必须用独立事件名"
            )

    if errors:
        print()
        print("[events] 事件名契约不一致：")
        for e in errors:
            print("  !!", e)
        print()
        print(f"[events] 失败：{len(errors)} 处")
        return 1

    if args.verbose:
        for const, value in sorted(client.items()):
            tag = "（服务端也在打，但已在白名单）" if value in ALLOWED_SAME_NAME else ""
            print(f"  ✓ {const} = {value} {tag}")
    print("[events] 通过 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
