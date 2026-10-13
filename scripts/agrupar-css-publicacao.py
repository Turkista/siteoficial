#!/usr/bin/env python3
"""Agrupa folhas CSS locais consecutivas no artefato publicado, preservando a cascata."""
from hashlib import sha256
from pathlib import Path
import re
import sys

LINK_GROUP = re.compile(r"(?:<link\b[^>]*>\s*){2,}", re.IGNORECASE)
ATTR = re.compile(r"""(?<![-\w:])([\w:-]+)\s*=\s*(["'])(.*?)\2""", re.IGNORECASE)
LINK_TAG = re.compile(r"<link\b[^>]*>", re.IGNORECASE)


def attributes(tag: str) -> dict[str, str]:
    return {name.lower(): value for name, _, value in ATTR.findall(tag)}


def resolve_css(href: str, html_file: Path, root: Path) -> Path | None:
    if not href or href.startswith(("http://", "https://", "//", "data:", "#")):
        return None
    if "?" in href or "#" in href:
        return None
    path = (root / href.lstrip("/")) if href.startswith("/") else (html_file.parent / href)
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return None
    return path.resolve()


def bundle_group(match: re.Match, html_file: Path, root: Path) -> tuple[str, int]:
    original = match.group(0)
    tags = LINK_TAG.findall(original)
    parsed_all = [attributes(tag) for tag in tags]

    # Agrupar somente as folhas stylesheet iniciais e consecutivas. Se houver
    # preload ou outro tipo de link logo depois, ele permanece na mesma posição.
    stylesheet_count = 0
    for attrs in parsed_all:
        if attrs.get("rel", "").lower() != "stylesheet":
            break
        stylesheet_count += 1
    if stylesheet_count < 2:
        return original, 0

    css_tags = tags[:stylesheet_count]
    parsed = parsed_all[:stylesheet_count]
    media_values = {attrs.get("media", "all") for attrs in parsed}
    if len(media_values) != 1:
        return original, 0

    files = []
    for attrs in parsed:
        css_file = resolve_css(attrs.get("href", ""), html_file, root)
        if not css_file or not css_file.is_file():
            return original, 0
        css = css_file.read_text(encoding="utf-8")
        # Não agrupar folhas com URLs relativas ou imports: preservar a semântica.
        if re.search(r"url\s*\(|@import\b", css, re.IGNORECASE):
            return original, 0
        files.append(css.strip())

    combined = "\n\n".join(files) + "\n"
    digest = sha256(combined.encode("utf-8")).hexdigest()[:12]
    filename = f"__css-bundle-{digest}.css"
    (html_file.parent / filename).write_text(combined, encoding="utf-8", newline="\n")
    media = next(iter(media_values))
    media_attr = "" if media == "all" else f' media="{media}"'
    replacement = f'<link rel="stylesheet" href="{filename}"{media_attr}>'

    remainder = "\n".join(tags[stylesheet_count:])
    if remainder:
        replacement += "\n" + remainder
    replacement += "\n"
    return replacement, stylesheet_count - 1


def optimize_html(content: str, html_file: Path, root: Path) -> tuple[str, int]:
    count = 0

    def replace(match: re.Match) -> str:
        nonlocal count
        updated, saved = bundle_group(match, html_file, root)
        count += saved
        return updated

    return LINK_GROUP.sub(replace, content), count


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    if not root.is_dir():
        print(f"ERRO: diretório não encontrado: {root}", file=sys.stderr)
        return 2
    pages = links_saved = 0
    for html_file in sorted(root.rglob("*.html")):
        try:
            original = html_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        optimized, saved = optimize_html(original, html_file, root)
        if saved:
            html_file.write_text(optimized, encoding="utf-8", newline="\n")
            pages += 1
            links_saved += saved
            print(f"CSS agrupado: {html_file.relative_to(root)} ({saved} requisição(ões) a menos)")
    print(f"CSS agrupado: {links_saved} requisição(ões) a menos em {pages} página(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
