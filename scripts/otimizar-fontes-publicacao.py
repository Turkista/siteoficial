#!/usr/bin/env python3
"""Torna assíncrono o CSS do Google Fonts no HTML do artefato publicado."""
from pathlib import Path
import re
import sys

# Captura somente folhas de estilo CSS2 do Google Fonts, sem tocar em outras
# folhas, links preload existentes ou fallbacks dentro de <noscript>.
FONT_LINK = re.compile(
    r"<link\b(?=[^>]*\bhref=[\"'](https://fonts\.googleapis\.com/css2\?([^\"']+))[\"'])"
    r"(?=[^>]*\brel=[\"']stylesheet[\"'])[^>]*>",
    re.IGNORECASE,
)


def otimizar_html(conteudo: str) -> tuple[str, int]:
    alterados = 0

    def substituir(match: re.Match) -> str:
        nonlocal alterados
        antes = conteudo[:match.start()]
        if antes.lower().rfind("<noscript") > antes.lower().rfind("</noscript>"):
            return match.group(0)

        url = match.group(1).replace("display=swap", "display=optional")
        bloco = (
            f"""<link rel="preload" as="style" href="{url}" onload="this.onload=null;this.rel='stylesheet'">\n"""
            f'<noscript><link rel="stylesheet" href="{url}"></noscript>'
        )
        alterados += 1
        return bloco

    return FONT_LINK.sub(substituir, conteudo), alterados


def main() -> int:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    if not raiz.is_dir():
        print(f"ERRO: diretório não encontrado: {raiz}", file=sys.stderr)
        return 2

    arquivos = 0
    links = 0
    for arquivo in sorted(raiz.rglob("*.html")):
        try:
            original = arquivo.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        novo, quantidade = otimizar_html(original)
        if quantidade:
            arquivo.write_text(novo, encoding="utf-8", newline="\n")
            arquivos += 1
            links += quantidade
            print(f"Fontes assíncronas: {arquivo.relative_to(raiz)} ({quantidade})")

    print(f"Google Fonts: {links} folha(s) convertida(s) em {arquivos} arquivo(s) HTML.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
