#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera blog/<slug>.html a partir de src/content/artigos/*.json.

Mesmo princípio do scripts/gerar-ficha-produto.py: conteúdo declarativo em
JSON (validado por src/schema/artigo.schema.json) + este script monta o
HTML final, reaproveitando a mesma estrutura/CSS dos 9 artigos originais
da Revista Turkista (cabeçalho, hero do artigo, corpo, CTA de WhatsApp,
"Continue lendo" e rodapé — todos idênticos aos artigos já publicados).

Rodado automaticamente pelo painel-produtos/server.js sempre que um
artigo novo é salvo pelo painel local. Também pode ser rodado à mão:
    python3 scripts/gerar-artigo-blog.py
"""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTEUDO_DIR = RAIZ / "src" / "content" / "artigos"
SAIDA_DIR = RAIZ / "blog"
WHATSAPP_NUMERO = "5521992197518"

# Os 9 artigos originais da Revista Turkista não são gerados por script
# (foram escritos à mão antes do painel existir), mas entram no "banco" de
# artigos conhecidos aqui só para poder aparecer nas sugestões de
# "Continue lendo" dos artigos novos gerados por este script.
ARTIGOS_ORIGINAIS = [
    {"slug": "cuidados-biquini", "titulo": "Como cuidar do seu biquíni e fazer durar muito mais", "categoria": "guia-de-cuidados", "categoriaLabel": "Guia de Cuidados", "resumo": "Dicas práticas para conservar a cor, a elasticidade e o caimento das peças."},
    {"slug": "tecido-certo", "titulo": "O tecido certo faz toda a diferença", "categoria": "tecido-tecnologia", "categoriaLabel": "Tecido & Tecnologia", "resumo": "Entenda por que escolhemos cada tecido para um tipo de movimento."},
    {"slug": "moda-praia-ano-inteiro", "titulo": "Moda praia o ano inteiro: como usar além do verão", "categoria": "estilo", "categoriaLabel": "Estilo", "resumo": "Peças versáteis que acompanham você em qualquer estação do ano."},
    {"slug": "biquini-ou-top", "titulo": "Biquíni ou top esportivo? Entenda as diferenças", "categoria": "treino-performance", "categoriaLabel": "Treino & Performance", "resumo": "Quando usar cada um e como escolher o ideal para o seu treino."},
    {"slug": "atelie-peca-pronta", "titulo": "Do ateliê à peça pronta", "categoria": "bastidores", "categoriaLabel": "Bastidores", "resumo": "Um olhar por trás de cada etapa até a peça chegar até você."},
    {"slug": "lavagem-secagem", "titulo": "Lavagem, secagem e armazenamento corretos", "categoria": "guia-de-cuidados", "categoriaLabel": "Guia de Cuidados", "resumo": "O passo a passo certo pra sua peça durar muito mais tempo."},
    {"slug": "fabricacao-propria", "titulo": "Fabricação própria: por que fazemos assim", "categoria": "bastidores", "categoriaLabel": "Bastidores", "resumo": "Por que a Turkista escolheu fabricar cada peça internamente."},
    {"slug": "pecas-movimento", "titulo": "Peças que te acompanham em cada movimento", "categoria": "treino-performance", "categoriaLabel": "Treino & Performance", "resumo": "Sustentação onde o corpo precisa, liberdade onde o treino pede."},
    {"slug": "cores-tom-de-pele", "titulo": "Cores que valorizam seu tom de pele", "categoria": "estilo", "categoriaLabel": "Estilo", "resumo": "Um guia rápido para escolher a cor certa da próxima peça Turkista."},
]

CATEGORIA_LABEL = {
    "guia-de-cuidados": "Guia de Cuidados",
    "tecido-tecnologia": "Tecido & Tecnologia",
    "estilo": "Estilo",
    "treino-performance": "Treino & Performance",
    "bastidores": "Bastidores",
}


def esc(texto):
    if texto is None:
        return ""
    return (
        str(texto)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def esc_attr_url(texto):
    from urllib.parse import quote
    return quote(texto or "")


def corpo_para_html(corpo_texto):
    """Converte texto simples (parágrafos separados por linha em branco;
    linhas começando com '## ' viram subtítulo) no HTML do corpo do artigo."""
    blocos = re.split(r"\n\s*\n", corpo_texto.strip())
    html = []
    for bloco in blocos:
        bloco = bloco.strip()
        if not bloco:
            continue
        if bloco.startswith("## "):
            html.append(f"<h2>{esc(bloco[3:].strip())}</h2>")
        elif bloco.startswith("> "):
            linha = bloco[2:].strip()
            html.append(f'<div class="artigo-destaque"><p>{esc(linha)}</p></div>')
        else:
            texto_unificado = " ".join(l.strip() for l in bloco.splitlines())
            html.append(f"<p>{esc(texto_unificado)}</p>")
    return "\n        ".join(html)


def calcular_tempo_leitura(corpo_texto):
    palavras = len(corpo_texto.split())
    minutos = max(1, round(palavras / 200))
    return f"{minutos} min de leitura"


def escolher_relacionados(artigo, todos):
    """3 relacionados: prioriza mesma categoria, completa com os demais."""
    outros = [a for a in todos if a["slug"] != artigo["slug"]]
    mesma_categoria = [a for a in outros if a["categoria"] == artigo["categoria"]]
    resto = [a for a in outros if a["categoria"] != artigo["categoria"]]
    return (mesma_categoria + resto)[:3]


def card_relacionado_html(art):
    label = art.get("categoriaLabel") or CATEGORIA_LABEL.get(art["categoria"], art["categoria"])
    return f'''        <a href="{esc_attr_url(art['slug'])}.html" class="card-artigo" data-categoria-artigo="{esc(art['categoria'])}">
          <div class="card-artigo__imagem">
            <img src="../assets/blog/{esc_attr_url(art['slug'])}.webp" alt="" loading="lazy" onerror="this.style.display='none'">
          </div>
          <span class="card-artigo__categoria">{esc(label)}</span>
          <h3 class="card-artigo__titulo">{esc(art['titulo'])}</h3>
          <p class="card-artigo__resumo">{esc(art['resumo'])}</p>
          <span class="card-artigo__link">Ler artigo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </a>'''


def gerar_pagina(artigo, relacionados):
    titulo = artigo["titulo"]
    categoria_label = CATEGORIA_LABEL.get(artigo["categoria"], artigo["categoria"])
    resumo = artigo["resumo"]
    slug = artigo["slug"]
    capa_arquivo = artigo["capa"]["arquivo"]
    tempo_leitura = artigo.get("tempoLeitura") or calcular_tempo_leitura(artigo["corpo"])
    corpo_html = corpo_para_html(artigo["corpo"])
    relacionados_html = "\n".join(card_relacionado_html(a) for a in relacionados)
    whatsapp_msg = esc_attr_url(f'Oi! Li o artigo "{titulo}" na Revista Turkista e queria saber mais.')
    url_artigo = f"https://www.turkista.com.br/blog/{slug}.html"
    imagem_capa_url = f"https://www.turkista.com.br/assets/blog/{capa_arquivo}"

    # datePublished só entra se o artigo tiver dataCriacao real vinda do
    # painel — nunca inventamos data de publicação.
    data_criacao = artigo.get("dataCriacao")
    campo_data = f',\n  "datePublished": "{esc(data_criacao)}"' if data_criacao else ""

    json_ld = f'''{{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{esc(titulo)}",
  "description": "{esc(resumo)}",
  "image": "{imagem_capa_url}",
  "articleSection": "{esc(categoria_label)}",
  "author": {{ "@type": "Organization", "name": "Turkista" }},
  "publisher": {{ "@type": "Organization", "name": "Turkista" }},
  "mainEntityOfPage": {{ "@type": "WebPage", "@id": "{url_artigo}" }}{campo_data}
}}
</script>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.turkista.com.br/index.html" }},
    {{ "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.turkista.com.br/blog.html" }},
    {{ "@type": "ListItem", "position": 3, "name": "{esc(titulo)}", "item": "{url_artigo}" }}
  ]
}}'''

    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(titulo)} — Revista Turkista</title>
<meta name="description" content="{esc(resumo)}">
<link rel="canonical" href="https://www.turkista.com.br/blog/{slug}.html">
<link rel="preload" as="image" href="../assets/blog/{capa_arquivo}" fetchpriority="high">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Turkista">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{esc(titulo)} — Revista Turkista">
<meta property="og:description" content="{esc(resumo)}">
<meta property="og:url" content="https://www.turkista.com.br/blog/{slug}.html">
<meta property="og:image" content="https://www.turkista.com.br/assets/blog/{capa_arquivo}">
<meta property="article:section" content="{esc(categoria_label)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(titulo)} — Revista Turkista">
<meta name="twitter:description" content="{esc(resumo)}">
<meta name="twitter:image" content="https://www.turkista.com.br/assets/blog/{capa_arquivo}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../src/styles/tokens/tokens.css">
<link rel="stylesheet" href="../src/styles/base/base.css">
<link rel="stylesheet" href="../src/styles/componentes/botoes.css">
<link rel="stylesheet" href="../src/styles/componentes/header.css">
<link rel="stylesheet" href="../src/styles/componentes/footer.css">
<link rel="stylesheet" href="../src/styles/componentes/whatsapp-flutuante.css">
<link rel="stylesheet" href="../src/styles/componentes/carrinho.css">
<link rel="stylesheet" href="../src/pages/blog/blog.css">
<link rel="stylesheet" href="../src/pages/blog/artigo.css">
<script type="application/ld+json">
{json_ld}
</script>
</head>
<body>

<a href="#conteudo-principal" class="somente-leitor-tela pular-link">Pular para o conteúdo</a>

<header class="cabecalho">
  <div class="container cabecalho__linha">
    <a href="../index.html" class="cabecalho__logo">TURK<span>ISTA</span></a>
    <nav class="cabecalho__nav-desktop" aria-label="Navegação principal">
      <a href="../catalogo.html#praia">Praia</a>
      <a href="../catalogo.html#surf">Surf</a>
      <a href="../catalogo.html#turk-fit">Turk Fit</a>
      <a href="../blog.html" aria-current="page">Blog</a>
      <a href="../sobre-a-marca.html">Sobre a Marca</a>
      <a href="../como-cuidar-da-peca.html">Guia de Cuidados</a>
      <a href="../contato.html">Contato</a>
    </nav>
    <div class="cabecalho__acoes">
      <a href="../contato.html" class="botao botao--secundario" style="padding:.6rem 1.2rem; display:none" data-mostrar-desktop>Fale conosco</a>
      <button class="cabecalho__botao-menu" data-menu-abrir aria-expanded="false" aria-controls="menu-mobile" aria-label="Abrir menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<nav id="menu-mobile" class="menu-mobile" data-menu-mobile aria-label="Menu mobile">
  <button class="menu-mobile__fechar" data-menu-fechar aria-label="Fechar menu">&times;</button>
  <ul class="menu-mobile__lista">
    <li><a href="../catalogo.html#praia">Praia</a></li>
    <li><a href="../catalogo.html#surf">Surf</a></li>
    <li><a href="../catalogo.html#turk-fit">Turk Fit</a></li>
    <li><a href="../blog.html" aria-current="page">Blog</a></li>
    <li><a href="../sobre-a-marca.html">Sobre a Marca</a></li>
    <li><a href="../contato.html">Contato</a></li>
    <li><a href="../como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
  </ul>
</nav>

<main id="conteudo-principal">

  <section class="secao artigo-hero" style="padding-bottom:0">
    <div class="container artigo-hero__conteudo">
      <nav class="artigo-breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Home</a><span aria-hidden="true">/</span><a href="../blog.html">Blog</a><span aria-hidden="true">/</span><span aria-current="page">{esc(titulo)}</span>
      </nav>
      <div class="artigo-hero__meta">
        <span class="artigo-hero__categoria">{esc(categoria_label)}</span>
        <span class="artigo-hero__tempo">{esc(tempo_leitura)}</span>
      </div>
      <h1>{esc(titulo)}</h1>
      <p class="artigo-hero__resumo">{esc(resumo)}</p>
    </div>
  </section>

  <section class="secao" style="padding-top:var(--esp-6)">
    <div class="container">
      <div class="artigo-imagem">
        <img src="../assets/blog/{capa_arquivo}" alt="" loading="eager" fetchpriority="high" onerror="this.style.display='none'">
      </div>

      <div class="artigo-corpo">
        {corpo_html}
      </div>

      <div class="artigo-cta">
        <h3>Ficou com dúvida ou quer ver essa peça de perto?</h3>
        <p>Fala com a gente pelo WhatsApp — respondemos rapidinho e ajudamos a encontrar a peça certa.</p>
        <a href="https://wa.me/{WHATSAPP_NUMERO}?text={whatsapp_msg}" class="botao botao--primario" target="_blank" rel="noopener">Falar no WhatsApp</a>
      </div>
    </div>
  </section>

  <section class="secao artigo-relacionados">
    <div class="container">
      <div class="cabecalho-secao">
        <span class="eyebrow">Continue lendo</span>
        <h2>Outros artigos da Revista Turkista</h2>
      </div>
      <div class="grade-blog">
{relacionados_html}
      </div>
    </div>
  </section>

</main>

<footer class="rodape">
  <div class="container rodape__grade">
    <div class="rodape__marca">
      <span class="cabecalho__logo">TURK<span>ISTA</span></span>
      <p>Roupas de praia, surf e academia, feitas à mão, com tecido pensado para o movimento de cada corpo. Araruama, Região dos Lagos — RJ.</p>
      <div class="rodape__redes">
        <a href="https://instagram.com/turkista.com.br" target="_blank" rel="noopener" aria-label="Instagram Turkista">IG</a>
        <a href="https://instagram.com/turkfit.com.br" target="_blank" rel="noopener" aria-label="Instagram Turk Fit">TF</a>
        <a href="https://wa.me/{WHATSAPP_NUMERO}" target="_blank" rel="noopener" aria-label="WhatsApp Turkista">WA</a>
      </div>
    </div>
    <div class="rodape__coluna">
      <h3>Linhas</h3>
      <ul>
        <li><a href="../catalogo.html#praia">Praia</a></li>
        <li><a href="../catalogo.html#surf">Surf</a></li>
        <li><a href="../catalogo.html#turk-fit">Turk Fit</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Marca</h3>
      <ul>
        <li><a href="../sobre-a-marca.html">Sobre a Marca</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li><a href="../como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
        <li><a href="../faq.html">Perguntas Frequentes</a></li>
        <li><a href="../contato.html">Contato</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Atendimento</h3>
      <ul>
        <li><a href="https://wa.me/{WHATSAPP_NUMERO}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="../politica-de-privacidade.html">Política de Privacidade</a></li>
      </ul>
    </div>
  </div>
  <div class="container rodape__base">
    <span>© 2026 Turkista · Araruama, RJ</span>
    <div class="rodape__base-links">
      <a href="../politica-de-privacidade.html">Privacidade</a>
      <span>Feito por Yansix</span>
    </div>
  </div>
</footer>

<a href="https://wa.me/{WHATSAPP_NUMERO}?text=Oi!%20Li%20um%20artigo%20na%20Revista%20Turkista%20e%20queria%20saber%20mais." class="whatsapp-flutuante esta-visivel" data-whatsapp-flutuante target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.71-.17 1.39z"/></svg>
  <span class="whatsapp-flutuante__texto">Falar no WhatsApp</span>
</a>

<script src="../src/scripts/componentes/menu-mobile.js"></script>
<script src="../src/scripts/utils/carrinho.js"></script>
<script src="../src/scripts/componentes/carrinho-ui.js"></script>
</body>
</html>
'''


def main():
    SAIDA_DIR.mkdir(exist_ok=True)
    CONTEUDO_DIR.mkdir(parents=True, exist_ok=True)

    arquivos = sorted(p for p in CONTEUDO_DIR.glob("*.json") if p.name != "index.json")
    artigos_novos = [json.loads(p.read_text(encoding="utf-8")) for p in arquivos]

    # Pool de relacionados = artigos originais (fixos) + artigos novos do painel
    pool_relacionados = ARTIGOS_ORIGINAIS + [
        {
            "slug": a["slug"],
            "titulo": a["titulo"],
            "categoria": a["categoria"],
            "categoriaLabel": CATEGORIA_LABEL.get(a["categoria"], a["categoria"]),
            "resumo": a["resumo"],
        }
        for a in artigos_novos
        if a.get("status") == "publicado"
    ]

    for artigo in artigos_novos:
        relacionados = escolher_relacionados(artigo, pool_relacionados)
        html = gerar_pagina(artigo, relacionados)
        destino = SAIDA_DIR / f"{artigo['slug']}.html"
        destino.write_text(html, encoding="utf-8")
        print(f"  gerado: blog/{artigo['slug']}.html")

    print(f"\n{len(artigos_novos)} artigo(s) do painel processado(s).")


if __name__ == "__main__":
    main()
