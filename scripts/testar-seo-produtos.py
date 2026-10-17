#!/usr/bin/env python3
"""Regressão de SEO para fichas de maiôs de surf no catálogo da Turkista."""
import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
SPEC = importlib.util.spec_from_file_location(
    "gerar_ficha_produto", ROOT / "scripts" / "gerar-ficha-produto.py"
)
ficha = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ficha)

SLUGS = {
    "maio-surf-bloom", "maio-de-surf-flora", "maio-de-surf-mandala",
    "maio-de-surf-spider", "maio-de-surf-vivence", "maio-perola-mares",
}

SLUGS_CONVENCIONAIS = {
    "maio-artx", "maio-blue", "maio-cevi", "maio-chicler", "maio-green",
    "maio-hight", "maio-passarela", "maio-supreme", "maio-teia", "maio-triocolor",
}


def load_products():
    folder = ROOT / "src" / "content" / "produtos"
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(folder.glob("*.json"))
        if path.name != "index.json"
    ]


class TestSeoMaiosSurf(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.products = load_products()
        cls.published = [p for p in cls.products if ficha.esta_publicado(p)]
        cls.by_slug = {p["slug"]: p for p in cls.products}

    def test_all_six_products_have_valid_overrides(self):
        for slug in sorted(SLUGS):
            with self.subTest(slug=slug):
                p = self.by_slug[slug]
                self.assertTrue(p.get("seoTitulo"))
                self.assertTrue(p.get("seoDescricao"))
                self.assertLessEqual(len(p["seoTitulo"]), 60)
                self.assertGreaterEqual(len(p["seoDescricao"]), 120)
                self.assertLessEqual(len(p["seoDescricao"]), 158)
                self.assertRegex(p["seoDescricao"], r"[.!?]$")
                self.assertEqual([], ficha.avisos_seo_override(p))
                self.assertEqual(p["seoTitulo"], ficha.montar_titulo(p))
                self.assertEqual(p["seoDescricao"], ficha.montar_meta_descricao(p))

    def test_generator_and_committed_html_share_metadata(self):
        for slug in sorted(SLUGS):
            with self.subTest(slug=slug):
                p = self.by_slug[slug]
                generated = ficha.gerar_pagina(p, self.published)
                committed = (ROOT / "produto" / f"{slug}.html").read_text(encoding="utf-8")
                for html in (generated, committed):
                    self.assertIn(f"<title>{ficha.esc(p['seoTitulo'])}</title>", html)
                    description = ficha.esc(p["seoDescricao"])
                    self.assertIn(f'<meta name="description" content="{description}">', html)
                    self.assertIn(f'<meta property="og:description" content="{description}">', html)
                    self.assertIn(f'<meta name="twitter:description" content="{description}">', html)
                    self.assertIn(f'<link rel="canonical" href="{ficha.BASE_URL}/produto/{slug}.html">', html)
                    match = re.search(
                        r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>',
                        html, re.DOTALL
                    )
                    self.assertIsNotNone(match)
                    product_schema = json.loads(match.group(1))
                    self.assertEqual("Product", product_schema["@type"])
                    self.assertEqual(p["id"], product_schema["sku"])
                    self.assertEqual(ficha.descricao_schema(p), product_schema["description"])
                    self.assertEqual(ficha.disponibilidade(p), product_schema["offers"]["availability"])

    def test_non_surf_maios_have_valid_overrides_and_synced_html(self):
        for slug in sorted(SLUGS_CONVENCIONAIS):
            with self.subTest(slug=slug):
                p = self.by_slug[slug]
                self.assertTrue(p.get("seoTitulo"))
                self.assertTrue(p.get("seoDescricao"))
                self.assertLessEqual(len(p["seoTitulo"]), 60)
                self.assertGreaterEqual(len(p["seoDescricao"]), 120)
                self.assertLessEqual(len(p["seoDescricao"]), 158)
                self.assertRegex(p["seoDescricao"], r"[.!?]$")
                self.assertEqual([], ficha.avisos_seo_override(p))
                self.assertEqual(p["seoTitulo"], ficha.montar_titulo(p))
                self.assertEqual(p["seoDescricao"], ficha.montar_meta_descricao(p))
                generated = ficha.gerar_pagina(p, self.published)
                committed = (ROOT / "produto" / f"{slug}.html").read_text(encoding="utf-8")
                for html in (generated, committed):
                    self.assertIn(f"<title>{ficha.esc(p['seoTitulo'])}</title>", html)
                    description = ficha.esc(p["seoDescricao"])
                    self.assertIn(f'<meta name="description" content="{description}">', html)
                    self.assertIn(f'<meta property="og:title" content="{ficha.esc(p["seoTitulo"])}">', html)
                    self.assertIn(f'<meta name="twitter:title" content="{ficha.esc(p["seoTitulo"])}">', html)
                    self.assertIn(f'<meta property="og:description" content="{description}">', html)
                    self.assertIn(f'<meta name="twitter:description" content="{description}">', html)
                    self.assertIn(f'<link rel="canonical" href="{ficha.BASE_URL}/produto/{slug}.html">', html)
                    match = re.search(
                        r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>',
                        html, re.DOTALL
                    )
                    self.assertIsNotNone(match)
                    product_schema = json.loads(match.group(1))
                    self.assertEqual("Product", product_schema["@type"])
                    self.assertEqual(p["id"], product_schema["sku"])
                    self.assertEqual(p["nome"], product_schema["name"])
                    self.assertEqual(ficha.descricao_schema(p), product_schema["description"])
                    self.assertEqual(ficha.disponibilidade(p), product_schema["offers"]["availability"])

    def test_aurora_listing_states_only_the_top_is_sold(self):
        product = self.by_slug["biquini-aurora"]
        self.assertEqual("Top do Biquíni Aurora", product["nome"])
        self.assertIn("calcinha não incluída", product["descricaoCurta"].lower())
        self.assertIn("somente a parte superior", product["descricaoCompleta"].lower())
        self.assertIn("Calcinha não incluída.", product["seoDescricao"])

        detail = (ROOT / "produto" / "biquini-aurora.html").read_text(encoding="utf-8")
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        praia = (ROOT / "praia.html").read_text(encoding="utf-8")
        self.assertIn("A calcinha não está incluída.", detail)
        self.assertIn("Somente a parte superior; calcinha não incluída.", home)
        self.assertIn("Somente a parte superior; calcinha não incluída.", praia)
        self.assertIn("Calcinha não incluída.", detail)

    def test_meta_cut_does_not_end_with_a_connector(self):
        text = (
            "Maiô Surf Bloom — De manga longa, com design moderno e marcante, "
            "combinando uma vibrante estampa floral tropical em tons de laranja, "
            "verde, amarelo e rosa."
        )
        result = ficha._cortar(text, 100)
        connectors = {
            "a", "ao", "com", "da", "das", "de", "do", "dos", "e", "em",
            "na", "no", "o", "os", "ou", "para", "por", "um", "uma",
        }
        self.assertNotIn(result.split()[-1].lower().strip(".,;:"), connectors)

    def test_og_availability_uses_open_graph_values(self):
        for slug in sorted(SLUGS):
            self.assertIn(ficha.disponibilidade_og(self.by_slug[slug]), {"in stock", "discontinued"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
