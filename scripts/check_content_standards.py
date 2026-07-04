#!/usr/bin/env python3
"""Fail the build if tracked product content contains an EM-DASH or an EMOJI (ADR-0067).

Felipe's standing rule for every product: no emojis and no em-dashes in repo content. Both read as
an AI tell and are banned from product content (code, docs, UI strings, commit-tracked files alike), ADR-0067.
This guard enforces it structurally so no product, and the template itself, can drift.

What it flags (precise, to avoid punishing legitimate glyphs):
  - EM-DASH  U+2014  and HORIZONTAL BAR U+2015  (the banned dashes).
  - EMOJI: any codepoint in the Supplementary emoji/pictograph planes U+1F000..U+1FAFF, plus the
    emoji-presentation selector U+FE0F. This catches the pictographic emojis while intentionally
    NOT touching functional glyphs products do use: the info mark U+24D8 (the ADR-0058 modal button),
    the middot U+00B7 (Felipe's preferred separator), arrows like U+2197, check/cross marks, stars.

Not flagged: the ASCII double hyphen "--" (ubiquitous and legitimate in CLI flags and code) and the
en-dash U+2013. The rule as stated is em-dash + emoji; keep enforcement to exactly that.

Scanned set = git-tracked text files only. Exit 1 on any hit, printing file:line:col.
"""
from __future__ import annotations

import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SELF = "scripts/check_content_standards.py"

BANNED_DASHES = {0x2014, 0x2015}  # em dash, horizontal bar
EMOJI_SELECTOR = 0xFE0F


def is_emoji(cp: int) -> bool:
    return 0x1F000 <= cp <= 0x1FAFF or cp == EMOJI_SELECTOR


TEXT_SUFFIXES = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".md", ".json",
    ".css", ".html", ".yml", ".yaml", ".toml", ".txt", ".cfg", ".ini", ".svg",
}


def tracked_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return [ln.strip() for ln in out.stdout.splitlines() if ln.strip()]


def main() -> int:
    hits: list[str] = []
    for rel in tracked_files():
        if rel == SELF or Path(rel).suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            lines = (ROOT / rel).read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeDecodeError):
            continue
        for lineno, line in enumerate(lines, 1):
            for col, ch in enumerate(line, 1):
                cp = ord(ch)
                if cp in BANNED_DASHES:
                    hits.append(f"  {rel}:{lineno}:{col}  em-dash (U+{cp:04X})")
                elif is_emoji(cp):
                    # print the codepoint + Unicode name, never the raw glyph (a Windows cp1252
                    # console cannot encode an emoji and would crash the guard).
                    name = unicodedata.name(ch, "unnamed")
                    hits.append(f"  {rel}:{lineno}:{col}  emoji (U+{cp:04X} {name})")

    if not hits:
        print("check_content_standards: OK, no em-dash or emoji in tracked content.")
        return 0

    print("::error::banned characters found (no em-dash, no emoji in product content, ADR-0067):")
    for h in hits:
        print(h)
    print("\nReplace an em-dash with a comma, colon, semicolon, period, parentheses, or a middot "
          "as the sense requires. Remove emojis. This applies to code, docs, and UI strings alike.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
