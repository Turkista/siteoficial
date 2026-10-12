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
        # Confere também se a faixa de preço anunciada bate com os preços
        # visíveis nos cartões da categoria (incluindo acessórios).
        visible_prices = [
            parse_price(value)
            for value in re.findall(
                r'<p[^>]*class="[^"]*card-produto__preco[^"]*"[^>]*>\s*R\$\s*([0-9.,]+)\s*</p>',
                html,
                re.I,
            )
        ]
        visible_prices = [price for price in visible_prices if price is not None]
        actual_min = min(visible_prices) if visible_prices else None
        actual_max = max(visible_prices) if visible_prices else None

        for description in descriptions:
            match = count_re.search(description)
            if match and int(match.group(1)) != actual_count:
                errors.append(
                    f"{relative}: descrição anuncia {match.group(1)} peças, "
                    f"mas o ItemList contém {actual_count}"
                )
            range_match = re.search(
                r"Preços?\s+de\s+R\$\s*([0-9.,]+)\s+a\s+R\$\s*([0-9.,]+)",
                description,
                re.I,
            )
            if range_match and actual_min is not None and actual_max is not None:
                declared_min = parse_price(range_match.group(1))
                declared_max = parse_price(range_match.group(2))
                if declared_min != actual_min or declared_max != actual_max:
                    errors.append(
                        f"{relative}: descrição anuncia preços de "
                        f"R$ {range_match.group(1)} a R$ {range_match.group(2)}, "
                        f"mas os cartões vão de R$ {actual_min:.2f} a R$ {actual_max:.2f}"
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


def validate_product_structured_data(products, errors):
    """Confere canonical e dados Product/Offer das fichas contra a fonte do catálogo."""
    for slug, item in products.items():
        relative = f"produto/{slug}.html"
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"{relative}: ficha de produto publicado não encontrada")
            continue

        html = path.read_text(encoding="utf-8")
        expected_url = f"{BASE}/produto/{slug}.html"
        canonical = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', html, re.I)
        if not canonical or canonical.group(1).strip() != expected_url:
            errors.append(f"{relative}: canonical não corresponde à URL esperada {expected_url}")

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
        product_nodes = [
            node for schema in schemas for node in collect_schema_type(schema, "Product")
        ]
        if not product_nodes:
            errors.append(f"{relative}: schema Product ausente")
            continue

        product_schema = product_nodes[0]
        if product_schema.get("sku") != item.get("id"):
            errors.append(f"{relative}: SKU no JSON-LD não corresponde ao ID do produto")
        if product_schema.get("name") != item.get("nome"):
            errors.append(f"{relative}: nome no JSON-LD não corresponde ao nome do produto")
        if product_schema.get("url") != expected_url:
            errors.append(f"{relative}: URL no JSON-LD Product está incorreta")

        expected_price = (item.get("preco") or {}).get("valor")
        offers = product_schema.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        schema_price = offers.get("price")
        if expected_price is not None:
            try:
                matches = schema_price is not None and abs(float(schema_price) - float(expected_price)) < 0.001
            except (TypeError, ValueError):
                matches = False
            if not matches:
                errors.append(
                    f"{relative}: preço no JSON-LD ({schema_price}) "
                    f"não corresponde ao catálogo ({expected_price})"
                )
            if offers.get("priceCurrency") != "BRL":
                errors.append(f"{relative}: moeda da oferta deve ser BRL")


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
    validate_product_structured_data(products, errors)

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        content = sitemap.read_text(encoding="utf-8")
        urls = re.findall(r"<loc>(.*?)</loc>", content)
        if len(urls) != len(set(urls)):
            errors.append("sitemap.xml: URLs duplicadas")

        # O sitemap deve listar exatamente as fichas publicadas, sem manter
        # URLs de produtos que foram retirados do catálogo.
        expected_product_urls = {
            f"{BASE}/produto/{slug}.html" for slug in products
        }
        sitemap_product_urls = {url for url in urls if "/produto/" in url}
        for expected_url in sorted(expected_product_urls - sitemap_product_urls):
            errors.append(f"sitemap.xml: produto publicado ausente: {expected_url}")
        for stale_url in sorted(sitemap_product_urls - expected_product_urls):
            errors.append(f"sitemap.xml: produto não publicado listado: {stale_url}")

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
