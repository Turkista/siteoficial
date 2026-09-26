#!/usr/bin/env python3
"""Gera sitemap.xml preservando URLs fixas e regenerando somente conteúdo dinâmico."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.turkista.com.br"
OUT = ROOT / "sitemap.xml"
BLOG_LEGADO = ROOT / "config" / "blog-legado.json"

CABECALHO = """<?xml version="1.0" encoding="UTF-8"?>
<!--
  Gerado por scripts/gerar-sitemap.py.
  As URLs de produto são refeitas a partir de src/content/produtos/*.json
  (somente status "publicado"). URLs institucionais e artigos legados
  existentes no sitemap são preservados.
  politica-de-privacidade.html e 404.html ficam fora de propósito.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
"""

def extrair_urls_fixas(conteudo):
    """Preserva todos os blocos existentes que não sejam URLs de produto."""
    blocos = re.findall(r"  <url>.*?</url>", conteudo, re.S)
    return [bloco for bloco in blocos if "/produto/" not in bloco]

def loc_do_bloco(bloco):
    match = re.search(r"<loc>(.*?)</loc>", bloco, re.S)
    return match.group(1) if match else ""

def entrada_produto(produto):
    url = f"{BASE}/produto/{produto['slug']}.html"
    linhas = [f"    <loc>{url}</loc>"]

    data = produto.get("dataAtualizacao") or produto.get("dataCriacao")
    if data:
        linhas.append(f"    <lastmod>{data}</lastmod>")

    for imagem in produto.get("imagens", []):
        arquivo = imagem.get("arquivo")
        if arquivo:
            linhas.append(
                f"    <image:image><image:loc>{BASE}/assets/produtos/{arquivo}</image:loc></image:image>"
            )

    return "  <url>\n" + "\n".join(linhas) + "\n  </url>"

def entrada_artigo(slug, lastmod=None):
    linhas = [f"    <loc>{BASE}/blog/{slug}.html</loc>"]
    if lastmod:
        linhas.append(f"    <lastmod>{lastmod}</lastmod>")
    linhas.append("    <changefreq>monthly</changefreq>")
    linhas.append("    <priority>0.6</priority>")
    return "  <url>\n" + "\n".join(linhas) + "\n  </url>"

def main():
    existente = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    fixas = extrair_urls_fixas(existente)

    # Categorias geradas pelo CMS devem permanecer no sitemap mesmo que
    # tenham sido adicionadas depois da última versão publicada.
    urls_fixas = {loc_do_bloco(bloco) for bloco in fixas}
    for chave in ("praia", "surf", "turk-fit"):
        url = f"{BASE}/{chave}.html"
        if url not in urls_fixas and (ROOT / f"{chave}.html").exists():
            fixas.insert(
                min(5, len(fixas)),
                f"  <url>\n"
                f"    <loc>{url}</loc>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>0.9</priority>\n"
                f"  </url>"
            )
            urls_fixas.add(url)

    produtos_dir = ROOT / "src" / "content" / "produtos"
    produtos = []
    for path in sorted(produtos_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("status") == "publicado":
            produtos.append(data)

    artigos_dir = ROOT / "src" / "content" / "artigos"
    artigos = []
    for path in sorted(artigos_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("status") == "publicado" and data.get("slug"):
            artigos.append(data)

    blocos_artigos = []
    urls_existentes = {loc_do_bloco(bloco) for bloco in fixas}
    for artigo in artigos:
        url = f"{BASE}/blog/{artigo['slug']}.html"
        if url not in urls_existentes:
            blocos_artigos.append(
                entrada_artigo(
                    artigo["slug"],
                    artigo.get("dataAtualizacao") or artigo.get("dataCriacao"),
                )
            )
            urls_existentes.add(url)

    entradas_produtos = [
        entrada_produto(produto)
        for produto in sorted(produtos, key=lambda item: item["slug"])
    ]

    corpo = "\n".join(fixas + blocos_artigos + entradas_produtos)
    OUT.write_text(CABECALHO + corpo + "\n</urlset>\n", encoding="utf-8")
    print(f"Sitemap gerado: {OUT}")
    print(f"Produtos publicados: {len(entradas_produtos)}")
    print(f"Artigos novos publicados: {len(blocos_artigos)}")

if __name__ == "__main__":
    main()
