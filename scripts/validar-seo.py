#!/usr/bin/env python3
"""Valida consistência SEO básica entre catálogo, fontes de produtos e sitemap."""
import importlib.util
import json
import re
import sys
import tempfile
from pathlib import Path
from PIL import Image
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
            # Quando a descrição separa explicitamente o preço inicial de
            # acessórios, a faixa geral refere-se às peças de vestuário.
            accessory_price_is_separate = re.search(
                r"xuxinhas? a partir de", description, re.I
            )
            if (
                range_match
                and actual_min is not None
                and actual_max is not None
                and not accessory_price_is_separate
            ):
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


def validate_performance_basics(errors):
    """Protege as otimizações de renderização contra regressões simples."""
    index_path = ROOT / "index.html"
    if not index_path.is_file():
        errors.append("index.html: página inicial ausente para validação de desempenho")
        return

    html = index_path.read_text(encoding="utf-8")
    if "fonts.googleapis.com/css2" in html and "display=swap" in html:
        errors.append("index.html: Google Fonts deve usar display=optional para reduzir trocas tardias de fonte")

    for relative in (
        "src/styles/componentes/busca.css",
        "src/styles/componentes/footer.css",
        "src/styles/componentes/whatsapp-flutuante.css",
        "src/styles/componentes/carrinho.css",
    ):
        preload = f'<link rel="preload" as="style" href="{relative}"'
        fallback = f'<noscript><link rel="stylesheet" href="{relative}"></noscript>'
        if preload not in html:
            errors.append(f"index.html: folha não crítica sem preload assíncrono: {relative}")
        if fallback not in html:
            errors.append(f"index.html: fallback sem JavaScript ausente para {relative}")

    whatsapp_script = ROOT / "src" / "scripts" / "componentes" / "whatsapp-flutuante.js"
    if whatsapp_script.is_file():
        js = whatsapp_script.read_text(encoding="utf-8")
        if "offsetHeight" in js or "offsetWidth" in js:
            errors.append("whatsapp-flutuante.js: leitura de offset pode provocar reflow forçado")
        if "IntersectionObserver" not in js:
            errors.append("whatsapp-flutuante.js: IntersectionObserver ausente para observar o hero")
    else:
        errors.append("whatsapp-flutuante.js: script não encontrado")

    home_css = ROOT / "src" / "pages" / "home" / "home.css"
    if home_css.is_file() and ".eyebrow{color:var(--cor-rosa-acessivel)}" not in home_css.read_text(encoding="utf-8"):
        errors.append("home.css: eyebrow da home deve usar a cor rosa com contraste acessível")

    cards_css = ROOT / "src" / "styles" / "componentes" / "cards.css"
    if cards_css.is_file():
        cards = cards_css.read_text(encoding="utf-8")
        if ".card-linha__eyebrow{font-size:var(--tam-eyebrow);text-transform:uppercase;letter-spacing:0.12em;color:var(--cor-rosa-acessivel)" not in cards:
            errors.append("cards.css: eyebrow dos cartões de linha deve usar rosa acessível")
        if ".badge--exclusivo{background:rgba(242,121,200,0.14);color:var(--cor-rosa-acessivel)" not in cards:
            errors.append("cards.css: badge exclusivo deve usar rosa acessível")

    marquee_css = ROOT / "src" / "styles" / "componentes" / "letreiro.css"
    if marquee_css.is_file():
        marquee = marquee_css.read_text(encoding="utf-8")
        if "linear-gradient(90deg,#F7A5D9,#F279C8)" not in marquee:
            errors.append("letreiro.css: fundo do letreiro deve manter contraste legível com texto escuro")

    font_optimizer = ROOT / "scripts" / "otimizar-fontes-publicacao.py"
    if not font_optimizer.is_file():
        errors.append("otimizar-fontes-publicacao.py: otimizador de fontes ausente")
    elif "googleapis" not in font_optimizer.read_text(encoding="utf-8") or "css2" not in font_optimizer.read_text(encoding="utf-8"):
        errors.append("otimizar-fontes-publicacao.py: regra para Google Fonts ausente")
    else:
        spec = importlib.util.spec_from_file_location("otimizar_fontes_publicacao", font_optimizer)
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
            sample = '<link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">'
            optimized, count = module.otimizar_html(sample)
            if count != 1 or 'rel="preload" as="style"' not in optimized or "display=optional" not in optimized or "<noscript><link rel=\"stylesheet\"" not in optimized:
                errors.append("otimizar-fontes-publicacao.py: teste de conversão assíncrona falhou")
            fallback = '<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope&display=swap"></noscript>'
            preserved, fallback_count = module.otimizar_html(fallback)
            if fallback_count != 0 or preserved != fallback:
                errors.append("otimizar-fontes-publicacao.py: fallback noscript foi alterado")
        except Exception as exc:
            errors.append(f"otimizar-fontes-publicacao.py: teste de execução falhou ({exc})")

    responsive_optimizer = ROOT / "scripts" / "otimizar-imagens-responsivas.py"
    if not responsive_optimizer.is_file():
        errors.append("otimizar-imagens-responsivas.py: otimizador de imagens responsivas ausente")
    elif "srcset" not in responsive_optimizer.read_text(encoding="utf-8") or "sizes" not in responsive_optimizer.read_text(encoding="utf-8"):
        errors.append("otimizar-imagens-responsivas.py: suporte a srcset/sizes ausente")
    else:
        spec = importlib.util.spec_from_file_location("otimizar_imagens_responsivas", responsive_optimizer)
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_root = Path(temp_dir)
                assets = temp_root / "assets"
                assets.mkdir()
                sample_image = assets / "sample.webp"
                Image.effect_noise((1200, 900), 100).convert("RGB").save(sample_image, "WEBP", quality=95)
                sample_html = '<link rel="preload" as="image" href="assets/sample.webp"><img src="assets/sample.webp" width="1200" height="900" loading="lazy">'
                optimized, count = module.otimizar_html(sample_html, temp_root / "index.html", temp_root)
                if count != 1 or "srcset=" not in optimized or "sizes=" not in optimized or "imagesrcset=" not in optimized or "imagesizes=" not in optimized:
                    errors.append("otimizar-imagens-responsivas.py: teste de srcset/sizes falhou")
                data_src = '<img data-src="assets/sample.webp" alt="Teste">'
                unchanged, unchanged_count = module.otimizar_html(data_src, temp_root / "index.html", temp_root)
                if unchanged_count != 0 or unchanged != data_src:
                    errors.append("otimizar-imagens-responsivas.py: atributo data-src foi alterado indevidamente")
        except Exception as exc:
            errors.append(f"otimizar-imagens-responsivas.py: teste de execução falhou ({exc})")

    css_bundler = ROOT / "scripts" / "agrupar-css-publicacao.py"
    if not css_bundler.is_file():
        errors.append("agrupar-css-publicacao.py: agrupador de CSS ausente")
    else:
        spec = importlib.util.spec_from_file_location("agrupar_css_publicacao", css_bundler)
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_root = Path(temp_dir)
                (temp_root / "a.css").write_text(".primeiro{color:red}", encoding="utf-8")
                (temp_root / "b.css").write_text(".segundo{color:blue}", encoding="utf-8")
                sample = chr(10).join(['<link rel="stylesheet" href="a.css">', '<link rel="stylesheet" href="b.css">', '<link rel="preload" as="style" href="async.css" onload="this.rel=\'stylesheet\'">'])
                optimized, saved = module.optimize_html(sample, temp_root / "index.html", temp_root)
                bundles = list(temp_root.glob("__css-bundle-*.css"))
                if saved != 1 or len(bundles) != 1 or optimized.count('rel="stylesheet"') != 1:
                    errors.append("agrupar-css-publicacao.py: agrupamento de folhas consecutivas falhou")
                elif ".primeiro{color:red}" not in bundles[0].read_text(encoding="utf-8") or ".segundo{color:blue}" not in bundles[0].read_text(encoding="utf-8"):
                    errors.append("agrupar-css-publicacao.py: conteúdo do bundle está incompleto")
                if "href=\\"async.css\\"" not in optimized or "rel=\\"preload\\"" not in optimized:
                    errors.append("agrupar-css-publicacao.py: folha assíncrona foi alterada")
        except Exception as exc:
            errors.append(f"agrupar-css-publicacao.py: teste de execução falhou ({exc})")

    workflow = ROOT / ".github" / "workflows" / "deploy-pages.yml"
    if workflow.is_file() and "otimizar-imagens-responsivas.py _site" not in workflow.read_text(encoding="utf-8"):
        errors.append("deploy-pages.yml: otimizador de imagens responsivas não está ligado à publicação")
    if workflow.is_file() and "otimizar-fontes-publicacao.py _site" not in workflow.read_text(encoding="utf-8"):
        errors.append("deploy-pages.yml: otimizador de fontes não está ligado à publicação")
    if workflow.is_file() and "otimizar-imagens-publicacao.py _site" not in workflow.read_text(encoding="utf-8"):
        errors.append("deploy-pages.yml: otimizador de imagens não está ligado à publicação")

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

    validate_performance_basics(errors)
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
