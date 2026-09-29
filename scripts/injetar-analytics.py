from pathlib import Path
import sys

GA_ID = "G-1CYRSP6V63"

GA_TAG = f"""<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());

  gtag('config', '{GA_ID}');
</script>
"""

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


def deve_ignorar(path: Path, raiz: Path) -> bool:
    try:
        partes = path.relative_to(raiz).parts
    except ValueError:
        return True

    return any(parte in EXCLUDED_DIRS for parte in partes)


def injetar_analytics(raiz: Path) -> int:
    alterados = 0

    for arquivo in raiz.rglob("*.html"):
        if deve_ignorar(arquivo, raiz):
            continue

        try:
            conteudo = arquivo.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        if GA_ID in conteudo:
            continue

        if "</head>" not in conteudo.lower():
            continue

        posicao = conteudo.lower().find("</head>")

        novo_conteudo = (
            conteudo[:posicao]
            + GA_TAG
            + conteudo[posicao:]
        )

        arquivo.write_text(
            novo_conteudo,
            encoding="utf-8",
            newline="\n",
        )

        alterados += 1
        print(f"Analytics inserido: {arquivo}")

    return alterados


def main() -> None:
    if len(sys.argv) > 1:
        raiz = Path(sys.argv[1]).resolve()
    else:
        raiz = Path(__file__).resolve().parent.parent

    if not raiz.exists():
        raise SystemExit(f"Diretório não encontrado: {raiz}")

    print(f"Aplicando GA4 em: {raiz}")

    alterados = injetar_analytics(raiz)

    print(f"Concluído. Arquivos alterados: {alterados}")


if __name__ == "__main__":
    main()