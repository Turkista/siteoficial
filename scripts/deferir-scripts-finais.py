#!/usr/bin/env python3
"""Adiciona defer a scripts locais no fim do documento, preservando a ordem."""
from pathlib import Path
import re
import sys

SCRIPT_TAG = re.compile(r"<script\b[^>]*\bsrc\s*=\s*([\"'])(.*?)\1[^>]*>", re.IGNORECASE)
ATTR = re.compile(r"""(?<![-\w:])([\w:-]+)\s*=\s*(["'])(.*?)\2""", re.IGNORECASE)


def optimize_html(content: str) -> tuple[str, int]:
    main_end = content.lower().rfind("</main>")
    body_end = content.lower().rfind("</body>")
    if main_end < 0 or body_end < 0 or body_end <= main_end:
        return content, 0
    count = 0

    def replace(match: re.Match) -> str:
        nonlocal count
        tag = match.group(0)
        if match.start() < main_end or match.start() > body_end:
            return tag
        attrs = {name.lower(): value for name, _, value in ATTR.findall(tag)}
        src = attrs.get("src", "")
        if not src or src.startswith(("http://", "https://", "//", "data:")):
            return tag
        if any(name in attrs or re.search(rf"\b{name}\b", tag, re.IGNORECASE) for name in ("async", "defer", "nomodule")):
            return tag
        count += 1
        return tag[:-1] + " defer>"

    return SCRIPT_TAG.sub(replace, content), count


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    if not root.is_dir():
        print(f"ERRO: diretório não encontrado: {root}", file=sys.stderr)
        return 2
    pages = scripts = 0
    for html in sorted(root.rglob("*.html")):
        try:
            original = html.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        optimized, changed = optimize_html(original)
        if changed:
            html.write_text(optimized, encoding="utf-8", newline="\n")
            pages += 1
            scripts += changed
            print(f"Scripts defer: {html.relative_to(root)} ({changed})")
    print(f"Scripts locais adiados: {scripts} em {pages} página(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
