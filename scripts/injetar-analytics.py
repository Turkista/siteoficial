#!/usr/bin/env python3
"""Injeta a tag do Google Analytics 4 em todas as páginas HTML públicas.

A injeção acontece no artefato final do GitHub Pages, depois das páginas
geradas pelo CMS, evitando manter a mesma tag duplicada em dezenas de
arquivos estáticos.
"""

from pathlib import Path\nimport sys

MEASUREMENT_ID = "G-1CYRSP6V63"

TAG = f"""<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());

  gtag('config', '{MEASUREMENT_ID}');
</script>"""

EXCLUDED_DIRS = {
    ".git",
    ".github",
    "painel-produtos",
    "scripts",
    "config",
    "docs",
    "src",
    "_site",
}

def deve_processar(path: Path) -> bool:
    return path.suffix.lower() == ".html" and not any(part in EXCLUDED_DIRS for part in path.parts)

def main():
    alterados = 0
    ignorados = 0

    for path in Path(".").rglob("*.html"):
        if not deve_processar(path):
            continue

        texto = path.read_text(encoding="utf-8")
        if MEASUREMENT_ID in texto:
            ignorados += 1
            continue

        if "</head>" not in texto.lower():
            print(f"[AVISO] </head> não encontrado: {path}")
            continue

        pos = texto.lower().find("</head>")
        texto = texto[:pos] + TAG + "\n" + texto[pos:]
        path.write_text(texto, encoding="utf-8")
        alterados += 1
        print(f"[GA4] {path}")

    print(f"Google Analytics: {alterados} página(s) atualizada(s), {ignorados} já possuíam a tag.")

if __name__ == "__main__":
    main()
