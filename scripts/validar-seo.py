#!/usr/bin/env python3
"""Valida consistência SEO básica entre catálogo, fontes de produtos e sitemap."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.turkista.com.br"
CATALOG_PAGES = ("index.html", "catalogo.html", "praia.html", "surf.html", "turk-fit.html")
PROVISIONAL_TEXT = (
    "Fotos e preços reais entram",
    "Etapa 2",
)

def parse_price(value):
    value = value.strip().replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(value)
    except ValueError:
        return None

def main():
    errors = []
    product_dir = ROOT / "src" / "content" / "produtos"
    products = {}
    for path in product_dir.glob("*.json"):
        if path.name == "index.json":
            continue
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: JSON inválido ({exc})")
            continue
        if item.get("slug") and item.get("status") == "publicado":
            products[item["slug"]] = item

    button_re = re.compile(
        r'<button\\b(?=[^>]*\\bdata-adicionar-carrinho\\b)'
        r'(?=[^>]*\\bdata-slug="([^"]+)")'
        r'(?=[^>]*\\bdata-preco="([^"]+)")[^>]*>',
        re.I,
    )
    visible_price_re = re.compile(
        r'<p[^>]*class="[^"]*card-produto__preco[^"]*"[^>]*>\\s*R\\$\\s*([0-9.,]+)\\s*</p>',
        re.I,
    )
    for relative in CATALOG_PAGES:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"{relative}: página não encontrada")
            continue
        html = path.read_text(encoding="utf-8")
        if relative == "catalogo.html":
            for phrase in PROVISIONAL_TEXT:
                if phrase.casefold() in html.casefold():
                    errors.append(f"{relative}: texto provisório de desenvolvimento encontrado: {phrase}")

        for match in button_re.finditer(html):
            slug, raw_price = match.group(1), match.group(2)
            item = products.get(slug)
            if not item:
                errors.append(f"{relative}: produto '{slug}' não existe como produto publicado no JSON")
                continue
            expected = (item.get("preco") or {}).get("valor")
            actual = parse_price(raw_price)
            if expected is not None and actual is not None and abs(actual - float(expected)) > 0.001:
                errors.append(f"{relative}: preço no botão de '{slug}' é {raw_price}, mas o JSON informa {expected}")

            card_start = html.rfind('<div class="card-produto', 0, match.start())
            snippet = html[card_start:match.start()] if card_start >= 0 else ""
            visible_matches = list(visible_price_re.finditer(snippet))
            if expected is not None and visible_matches:
                visible = parse_price(visible_matches[-1].group(1))
                if visible is not None and abs(visible - float(expected)) > 0.001:
                    errors.append(f"{relative}: preço visível de '{slug}' é {visible_matches[-1].group(1)}, mas o JSON informa {expected}")
            elif expected is not None:
                errors.append(f"{relative}: não encontrei preço visível no cartão de '{slug}'")

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        content = sitemap.read_text(encoding="utf-8")
        urls = re.findall(r"<loc>(.*?)</loc>", content)
        if len(urls) != len(set(urls)):
            errors.append("sitemap.xml: URLs duplicadas")
        for url in urls:
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.netloc != "www.turkista.com.br":
                errors.append(f"sitemap.xml: URL fora do domínio canônico: {url}")
                continue
            relative = parsed.path.lstrip("/") or "index.html"
            if not (ROOT / relative).is_file():
                errors.append(f"sitemap.xml: URL não corresponde a um arquivo: {url}")
    else:
        errors.append("sitemap.xml: arquivo não encontrado")

    if errors:
        print("FALHAS DE SEO:")
        for error in errors:
            print(f"- {error}")
        print(f"Resultado: FALHOU ({len(errors)} problema(s)).")
        return 1
    print(f"SEO básico: {len(CATALOG_PAGES)} páginas comerciais, {len(products)} produtos publicados e sitemap verificados.")
    print("Resultado: OK.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
