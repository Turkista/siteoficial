#!/usr/bin/env python3
"""Testes de regressão para SEO e geração das fichas de maiôs de surf."""
import json
import re
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "scripts"))
import gerar_ficha_produto as ficha  # noqa: E402


SLUGS_MAIO_SURF = {
    "maio-surf-bloom",
    "maio-de-surf-flora",
    "maio-de-surf-mandala",
    "maio-de-surf-spider",
    "maio-de-surf-vivence",
    "maio-perola-mares",
}


def carregar_produtos():
    pasta = RAIZ / "src" / "content" / "produtos"
    return [
        json.loads(arquivo.read_text(encoding="utf-8"))
        for arquivo in sorted(pasta.glob("*.json"))
        if arquivo.name != "index.json"
    ]


class TestSeoFichasMaiosSurf(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.produtos = carregar_produtos()
        cls.publicados = [p for p in cls.produtos if ficha.esta_publicado(p)]
        cls.por_slug = {p["slug"]: p for p in cls.produtos}

    def test_cobertura_de_todos_os_maios_de_surf_publicados(self):
        encontrados = {
            p["slug"] for p in self.publicados
            if p.get("linha") == "surf" and ficha.tipo_produto(p) == "Maiô de surf"
        }
        self.assertTrue(SLUGS_MAIO_SURF.issubset(encontrados))
        self.assertEqual(SLUGS_MAIO_SURF, encontrados)

    def test_overrides_seo_respeitam_limites_documentados(self):
        for slug in sorted(SLUGS_MAIO_SURF):
            with self.subTest(slug=slug):
                produto = self.por_slug[slug]
                self.assertTrue(produto.get("seoTitulo"), "seoTitulo ausente")
                self.assertTrue(produto.get("seoDescricao"), "seoDescricao ausente")
                self.assertLessEqual(len(produto["seoTitulo"]), 60)
                self.assertGreaterEqual(len(produto["seoDescricao"]), 120)
                self.assertLessEqual(len(produto["seoDescricao"]), 158)
                self.assertIn(produto["seoDescricao"][-1], ".!?")
                self.assertEqual(ficha.montar_titulo(produto), produto["seoTitulo"])
                self.assertEqual(ficha.montar_meta_descricao(produto), produto["seoDescricao"])
                self.assertEqual([], ficha.avisos_seo_override(produto))

    def test_metadados_e_schema_gerados_coincidem_com_fonte(self):
        for slug in sorted(SLUGS_MAIO_SURF):
            with self.subTest(slug=slug):
                produto = self.por_slug[slug]
                gerado = ficha.gerar_pagina(produto, self.publicados)
                publicado = (RAIZ / "produto" / f"{slug}.html").read_text(encoding="utf-8")
                for html in (gerado, publicado):
                    self.assertIn(f"<title>{ficha.esc(produto['seoTitulo'])}</title>", html)
                    descricao = ficha.esc(produto["seoDescricao"])
                    self.assertIn(f'<meta name="description" content="{descricao}">', html)
                    self.assertIn(f'<meta property="og:description" content="{descricao}">', html)
                    self.assertIn(f'<meta name="twitter:description" content="{descricao}">', html)
                    self.assertIn(f'<link rel="canonical" href="{ficha.BASE_URL}/produto/{slug}.html">', html)

                schema_match = re.search(
                    r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>',
                    gerado,
                    re.DOTALL,
                )
                self.assertIsNotNone(schema_match, "JSON-LD Product ausente")
                schema = json.loads(schema_match.group(1))
                self.assertEqual("Product", schema["@type"])
                self.assertEqual(produto["id"], schema["sku"])
                self.assertEqual(ficha.descricao_schema(produto), schema["description"])
                self.assertEqual(ficha.disponibilidade(produto), schema["offers"]["availability"])

    def test_corte_de_meta_nao_termina_em_preposicao(self):
        texto = (
            "Maiô Surf Bloom — De manga longa, com design moderno e marcante, "
            "combinando uma vibrante estampa floral tropical em tons de laranja, "
            "verde, amarelo e rosa."
        )
        resultado = ficha._cortar(texto, 100)
        conectores = {
            "a", "ao", "com", "da", "de", "do", "dos", "e", "em", "na",
            "no", "o", "os", "ou", "para", "por", "um", "uma",
        }
        self.assertNotIn(resultado.split()[-1].lower().strip(".,;:"), conectores)


if __name__ == "__main__":
    unittest.main(verbosity=2)
