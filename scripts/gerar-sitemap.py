#!/usr/bin/env python3
"""Gera sitemap.xml de forma determinística a partir das fontes do site."""
import json
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.turkista.com.br"
OUT = ROOT / "sitemap.xml"
EXCLUIDAS = {"politica-de-privacidade.html", "404.html"}

def add_url(parent, path, lastmod=None, priority="0.8"):
    url = SubElement(parent, "url")
    SubElement(url, "loc").text = f"{BASE}/{path}"
    if lastmod:
        SubElement(url, "lastmod").text = lastmod
    SubElement(url, "changefreq").text = "monthly"
    SubElement(url, "priority").text = priority

def main():
    root = Element("urlset", {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"})

    for html in sorted(ROOT.glob("*.html")):
        if html.name not in EXCLUIDAS:
            add_url(root, html.name)

    produtos = ROOT / "src" / "content" / "produtos"
    for path in sorted(produtos.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("status") == "publicado":
            add_url(root, f"produto/{data['slug']}.html",
                    data.get("dataAtualizacao") or data.get("dataCriacao"), "0.6")

    artigos = ROOT / "src" / "content" / "artigos"
    for path in sorted(artigos.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("status") == "publicado":
            add_url(root, f"blog/{data['slug']}.html",
                    data.get("dataAtualizacao") or data.get("dataCriacao"), "0.6")

    indent(root, space="  ")
    ElementTree(root).write(OUT, encoding="utf-8", xml_declaration=True)
    print(f"Sitemap gerado: {OUT}")

if __name__ == "__main__":
    main()
