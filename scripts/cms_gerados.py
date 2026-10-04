"""Utilitários para controlar arquivos HTML gerados pelo CMS.

Os geradores só podem remover arquivos que tenham sido marcados explicitamente
como gerados por eles. Isso evita apagar páginas HTML criadas manualmente.
"""
from pathlib import Path

MARCADORES = {
    "produto": "<!-- CMS-GENERATED: produto -->",
    "artigo": "<!-- CMS-GENERATED: artigo -->",
    "linha": "<!-- CMS-GENERATED: linha -->",
}

def marcar(html, tipo):
    return MARCADORES[tipo] + "\n" + html

def limpar_gerados(diretorio, tipo, slugs_atuais):
    marcador = MARCADORES[tipo]
    removidos = []
    atuais = {f"{slug}.html" for slug in slugs_atuais}
    for caminho in Path(diretorio).glob("*.html"):
        if caminho.name in atuais:
            continue
        try:
            conteudo = caminho.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if marcador in conteudo:
            caminho.unlink()
            removidos.append(caminho.name)
    return removidos
