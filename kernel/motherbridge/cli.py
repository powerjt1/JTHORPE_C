"""MotherBridge CLI — add, validate, and list agents in the prompt library.

Usage:
  python -m motherbridge new --name Zoe --title "Localization Architect"
  python -m motherbridge validate
  python -m motherbridge list
"""
from __future__ import annotations

import argparse
import sys

from .prompts import PromptLibrary
from .scaffold import DEFAULT_PROMPTS_DIR, create_agent
from .validation import validate_file, validate_library


def _cmd_new(args: argparse.Namespace) -> int:
    try:
        path = create_agent(args.name, args.title, prompts_dir=args.dir,
                            number=args.number, overwrite=args.overwrite)
    except FileExistsError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    issues = validate_file(path)
    status = "OK" if not issues else "created with issues: " + "; ".join(issues)
    print(f"created {path}  [{status}]")
    print("Fill in the sections, then commit the file — the kernel auto-discovers it.")
    return 0


def _cmd_validate(args: argparse.Namespace) -> int:
    if args.files:
        results = {f: validate_file(f) for f in args.files}
    else:
        results = validate_library(args.dir)
    bad = 0
    for name, issues in results.items():
        if issues:
            bad += 1
            print(f"FAIL {name}")
            for i in issues:
                print(f"     - {i}")
        else:
            print(f"OK   {name}")
    print(f"\n{len(results) - bad}/{len(results)} valid")
    return 1 if bad else 0


def _cmd_list(args: argparse.Namespace) -> int:
    lib = PromptLibrary(args.dir)
    for doc in lib.load():
        print(f"{doc.id}  v{doc.version:<8}  {doc.name} — {doc.title}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="motherbridge", description="MotherBridge prompt-library tools.")
    p.add_argument("--dir", default=str(DEFAULT_PROMPTS_DIR),
                   help="prompts directory (default: docs/motherbridge/prompts)")
    sub = p.add_subparsers(dest="command", required=True)

    n = sub.add_parser("new", help="scaffold a new agent prompt")
    n.add_argument("--name", required=True)
    n.add_argument("--title", required=True)
    n.add_argument("--number", type=int, default=None, help="MB number (default: next available)")
    n.add_argument("--overwrite", action="store_true")
    n.set_defaults(func=_cmd_new)

    v = sub.add_parser("validate", help="validate agent prompt(s)")
    v.add_argument("files", nargs="*", help="specific files (default: whole library)")
    v.set_defaults(func=_cmd_validate)

    l = sub.add_parser("list", help="list agents the kernel sees")
    l.set_defaults(func=_cmd_list)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
