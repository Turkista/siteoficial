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
CATEGORY_PAGES = ("praia.html", "surf.html", "turk-fit.html")
PROVISIONAL_TEXT = (
    "Fotos e preços reais entram",
    "Etapa 2",
)


def collect_schema_type(node, target):
    """Retorna objetos de um tipo Schema.org encontrados no JSON-LD."""
    found = []
    if isinstance(node, dict):
        if node.get("@type") == target:
            found.append(node)
        for value in node.values():
            found.extend(collect_schema_type(value, target))
    elif isinstance(node, list):
        for value in node:
            found.extend(collect_schema_type(value, target))
    return found


def validate_category_metadata(errors):
    """Confere se a quantidade anunciada nas descrições bate com o ItemList."""
    count_re = re.compile(r"\b(\d+)\s+(?:peças?|produtos?)\s+de\b", re.I)
    for relative in CATEGORY_PAGES:
        path = ROOT / relative
        if not path.is_file():
            continue
        html = path.read_text(encoding="utf-8")
        blocks = re.findall(
            r'<script\s+type="application/ld\+json">([\s\S]*?)</script>',
            html,
            re.I,
        )
        schemas = []
        for block in blocks:
            try:
                schemas.append(json.loads(block))
            except json.JSONDecodeError:
                errors.append(f"{relative}: JSON-LD inválido")
        lists = [item for schema in schemas for item in collect_schema_type(schema, "ItemList")]
        if not lists:
            errors.append(f"{relative}: ItemList ausente no JSON-LD")
            continue
        item_list = lists[0]
        entries = item_list.get("itemListElement") or []
        actual_count = len(entries)
        declared_count = item_list.get("numberOfItems")
        if declared_count != actual_count:
            errors.append(
                f"{relative}: ItemList declara {declared_count} itens, mas contém {actual_count}"
            )
        descriptions = re.findall(
            r'<meta\s+name="description"\s+content="([^"]*)"',
            html,
            re.I,
        )
        collection_pages = [item for schema in schemas for item in collect_schema_type(schema, "CollectionPage")]
        if collection_pages and collection_pages[0].get("description"):
            descriptions.append(collection_pages[0]["description"])
        for description in descriptions:
            match = count_re.search(description)
            if match and int(match.group(1)) != actual_count:
                errors.append(
                    f"{relative}: descrição anuncia {match.group(1)} peças, "
                    f"mas o ItemList contém {actual_count}"
                )


def validate_product_seo_overrides(products, errors):
    """Garante que overrides SEO do JSON cheguem às fichas HTML geradas."""
    for slug, item in products.items():
        path = ROOT / "produto" / f"{slug}.html"
        if not path.is_file():
            continue
        html = path.read_text(encoding="utf-8")
        title = item.get("seoTitulo")
        description = item.get("seoDescricao")
        if title:
            title_match = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
            if not title_match or title_match.group(1).strip() != title.strip():
                errors.append(f"{path.relative_to(ROOT)}: título SEO não corresponde a seoTitulo do JSON")
            for meta_name in ("og:title", "twitter:title"):
                pattern = rf'<meta\s+property="{re.escape(meta_name)}"\s+content="([^"]*)"'
                if meta_name.startswith("twitter:"):
                    pattern = rf'<meta\s+name="{re.escape(meta_name)}"\s+content="([^"]*)"'
                match = re.search(pattern, html, re.I)
                if not match or match.group(1).strip() != title.strip():
                    errors.append(f"{path.relative_to(ROOT)}: {meta_name} não corresponde a seoTitulo do JSON")
        if description:
            for pattern_name, pattern in (
                ("description", r'<meta\s+name="description"\s+content="([^"]*)"'),
                ("og:description", r'<meta\s+property="og:description"\s+content="([^"]*)"'),
                ("twitter:description", r'<meta\s+name="twitter:description"\s+content="([^"]*)"'),
            ):
                match = re.search(pattern, html, re.I)
                if not match or match.group(1).strip() != description.strip():
                    errors.append(f"{path.relative_to(ROOT)}: {pattern_name} não corresponde a seoDescricao do JSON")

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
        r'<button\b(?=[^>]*\bdata-adicionar-carrinho\b)'
        r'(?=[^>]*\bdata-slug="([^"]+)")'
        r'(?=[^>]*\bdata-preco="([^"]+)")[^>]*>',
        re.I,
    )
    visible_price_re = re.compile(
        r'<p[^>]*class="[^"]*card-produto__preco[^"]*"[^>]*>\s*R\$\s*([0-9.,]+)\s*</p>',
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

            card_start = html.rfind('<div class="card-produto"', 0, match.start())
            snippet = html[card_start:match.start()] if card_start >= 0 else ""
            visible_matches = list(visible_price_re.finditer(snippet))
            if expected is not None and visible_matches:
                visible = parse_price(visible_matches[-1].group(1))
                if visible is not None and abs(visible - float(expected)) > 0.001:
                    errors.append(f"{relative}: preço visível de '{slug}' é {visible_matches[-1].group(1)}, mas o JSON informa {expected}")
            elif expected is not None:
                errors.append(f"{relative}: não encontrei preço visível no cartão de '{slug}'")

    validate_category_metadata(errors)
    validate_product_seo_overrides(products, errors)

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        content = sitemap.read_text(encoding="utf-8")
        urls = re.findall(r"<loc>(.*?)</loc>", content)
        if len(urls) != len(set(urls)):
            errors.append("sitemap.xml: URLs duplicadas")
        for slug in products:
            expected_url = f"{BASE}/produto/{slug}.html"
            if expected_url not in urls:
                errors.append(f"sitemap.xml: produto publicado ausente: {expected_url}")
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
