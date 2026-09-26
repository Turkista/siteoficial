#!/usr/bin/env python3
"""
Gerador das páginas de categoria: praia.html, surf.html e turk-fit.html.

Lê os JSON de src/content/produtos/ (os mesmos das fichas) e gera uma
página estática por linha, com todos os produtos publicados já escritos
no HTML — sem depender de JavaScript para o Google enxergar a lista
(o catalogo.html monta a lista pelo navegador).

Cada página tem: título/descrição próprios, H1 com o termo de busca da
linha, texto de introdução com números calculados dos dados (quantidade
de peças, faixa de preço), produtos agrupados por tipo (Biquínis, Maiôs...),
FAQ, links para artigos do blog e JSON-LD (CollectionPage, ItemList,
BreadcrumbList, FAQPage).

É chamado automaticamente por gerar-ficha-produto.py (que o painel roda ao
salvar um produto). Para rodar sozinho:
    python3 scripts/gerar-pagina-linha.py
"""
import importlib.util
import json
import re
import sys
from cms_gerados import marcar
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE_URL = "https://www.turkista.com.br"

LINHAS = {
    "praia": {
        "nome": "Praia",
        "titulo": "Moda Praia: Biquínis, Maiôs e Sunquínis | Turkista",
        "h1": "Moda praia: biquínis, maiôs e sunquínis feitos em Araruama",
        "eyebrow": "Linha Praia",
        "ordem": ["Biquíni", "Top de biquíni", "Maiô", "Sunquíni"],
        "leia": ["cuidados-biquini", "moda-praia-ano-inteiro", "cores-tom-de-pele"],
    },
    "surf": {
        "nome": "Surf",
        "titulo": "Maiô de Surf e Cropped de Surf | Turkista",
        "h1": "Maiô de surf e cropped de surf, feitos em Araruama",
        "eyebrow": "Linha Surf",
        "ordem": ["Maiô de surf", "Cropped de surf"],
        "leia": ["tecido-certo", "lavagem-secagem", "fabricacao-propria"],
    },
    "turk-fit": {
        "nome": "Turk Fit",
        "titulo": "Roupa Fitness: Conjuntos, Tops e Leggings | Turkista",
        "h1": "Roupa fitness: conjuntos, tops, leggings e calças de treino",
        "eyebrow": "Linha Turk Fit",
        "ordem": ["Conjunto fitness", "Top fitness", "Legging fitness", "Calça fitness", "Xuxinha de cabelo"],
        "leia": ["biquini-ou-top", "pecas-movimento", "tecido-certo"],
    },
}

# tipo -> (título da seção, forma curta para frases)
PLURAL = {
    "Biquíni": ("Biquínis", "biquínis"),
    "Top de biquíni": ("Tops de biquíni", "tops de biquíni"),
    "Maiô": ("Maiôs", "maiôs"),
    "Sunquíni": ("Sunquínis", "sunquínis"),
    "Maiô de surf": ("Maiôs de surf", "maiôs de surf"),
    "Cropped de surf": ("Croppeds de surf", "croppeds de surf"),
    "Cropped": ("Croppeds", "croppeds"),
    "Conjunto fitness": ("Conjuntos fitness", "conjuntos"),
    "Top fitness": ("Tops fitness", "tops"),
    "Legging fitness": ("Leggings fitness", "leggings"),
    "Calça fitness": ("Calças fitness", "calças"),
    "Xuxinha de cabelo": ("Xuxinhas de cabelo", "xuxinhas de cabelo"),
    "Top": ("Tops", "tops"),
}

ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "EG"]

HEAD_BODY = """<a href="#conteudo-principal" class="somente-leitor-tela pular-link">Pular para o conteúdo</a>

<header class="cabecalho">
  <div class="container cabecalho__linha">
    <a href="index.html" class="cabecalho__logo">TURK<span>ISTA</span></a>
    <nav class="cabecalho__nav-desktop" aria-label="Navegação principal">
      <a href="praia.html">Praia</a>
      <a href="surf.html">Surf</a>
      <a href="turk-fit.html">Turk Fit</a>
      <a href="blog.html">Blog</a>
      <a href="sobre-a-marca.html">Sobre a Marca</a>
      <a href="como-cuidar-da-peca.html">Guia de Cuidados</a>
      <a href="contato.html">Contato</a>
    </nav>
    <div class="cabecalho__acoes">
      <a href="contato.html" class="botao botao--secundario" style="padding:.6rem 1.2rem; display:none" data-mostrar-desktop>Fale conosco</a>
      <button class="cabecalho__botao-menu" data-menu-abrir aria-expanded="false" aria-controls="menu-mobile" aria-label="Abrir menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<nav id="menu-mobile" class="menu-mobile" data-menu-mobile aria-label="Menu mobile">
  <button class="menu-mobile__fechar" data-menu-fechar aria-label="Fechar menu">&times;</button>
  <ul class="menu-mobile__lista">
    <li><a href="praia.html">Praia</a></li>
    <li><a href="surf.html">Surf</a></li>
    <li><a href="turk-fit.html">Turk Fit</a></li>
    <li><a href="blog.html">Blog</a></li>
    <li><a href="sobre-a-marca.html">Sobre a Marca</a></li>
    <li><a href="contato.html">Contato</a></li>
    <li><a href="como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
  </ul>
</nav>

"""

RODAPE = """</main>

<footer class="rodape">
  <div class="container rodape__grade">
    <div class="rodape__marca">
      <span class="cabecalho__logo">TURK<span>ISTA</span></span>
      <p>Roupas de praia, surf e academia, feitas à mão, com tecido pensado para o movimento de cada corpo. Araruama, Região dos Lagos — RJ.</p>
      <div class="rodape__redes">
        <a href="https://instagram.com/turkista.com.br" target="_blank" rel="noopener" aria-label="Instagram Turkista">IG</a>
        <a href="https://instagram.com/turkfitness.com.br" target="_blank" rel="noopener" aria-label="Instagram Turk Fit">TF</a>
        <a href="https://wa.me/5521992197518" target="_blank" rel="noopener" aria-label="WhatsApp Turkista">WA</a>
      </div>
    </div>
    <div class="rodape__coluna">
      <h3>Linhas</h3>
      <ul>
        <li><a href="praia.html">Praia</a></li>
        <li><a href="surf.html">Surf</a></li>
        <li><a href="turk-fit.html">Turk Fit</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Marca</h3>
      <ul>
        <li><a href="sobre-a-marca.html">Sobre a Marca</a></li>
        <li><a href="blog.html">Blog</a></li>
        <li><a href="como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
        <li><a href="faq.html">Perguntas Frequentes</a></li>
        <li><a href="contato.html">Contato</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Atendimento</h3>
      <ul>
        <li><a href="https://wa.me/5521992197518" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="rastreie-seu-pedido.html">Rastreie seu Pedido</a></li>
        <li><a href="politica-de-envio-e-prazo-de-entrega.html">Política de Envio e Entrega</a></li>
        <li><a href="politica-de-troca-e-reembolso.html">Troca e Reembolso</a></li>
        <li><a href="politica-de-privacidade.html">Política de Privacidade</a></li>
      </ul>
    </div>
  </div>
  <div class="container rodape__base">
    <span>© 2026 Turkista · Araruama, RJ</span>
    <div class="rodape__base-links">
      <a href="politica-de-privacidade.html">Privacidade</a>
      <span>Feito por Yansix</span>
    </div>
  </div>
</footer>

<a href="https://wa.me/5521992197518?text=Oi!%20Vi%20o%20site%20da%20Turkista%20e%20queria%20saber%20mais%20sobre%20as%20pe%C3%A7as." class="whatsapp-flutuante esta-visivel" data-whatsapp-flutuante target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.71-.17 1.39z"/></svg>
  <span class="whatsapp-flutuante__texto">Falar no WhatsApp</span>
</a>

"""

TEMPLATE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/public/favicon/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/public/favicon/apple-touch-icon.png">
<meta name="theme-color" content="#0C1014">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="{url}">
<link rel="preload" as="image" href="{primeira_imagem}" fetchpriority="high">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Turkista">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_imagem}">
<meta property="og:image:alt" content="{og_alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{descricao}">
<meta name="twitter:image" content="{og_imagem}">
<meta name="twitter:image:alt" content="{og_alt}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="src/styles/tokens/tokens.css">
<link rel="stylesheet" href="src/styles/base/base.css">
<link rel="stylesheet" href="src/styles/componentes/botoes.css">
<link rel="stylesheet" href="src/styles/componentes/header.css">
<link rel="stylesheet" href="src/styles/componentes/busca.css">
<link rel="stylesheet" href="src/styles/componentes/footer.css">
<link rel="stylesheet" href="src/styles/componentes/cards.css">
<link rel="stylesheet" href="src/styles/componentes/whatsapp-flutuante.css">
<link rel="stylesheet" href="src/styles/componentes/carrinho.css">
<link rel="stylesheet" href="src/pages/catalogo/catalogo.css">
<link rel="stylesheet" href="src/pages/linha/linha.css">
<script type="application/ld+json">
{json_ld}
</script>
</head>
<body>
""" + HEAD_BODY + """<main id="conteudo-principal">
  <section class="catalogo">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">{nome_linha}</span>
      </nav>

      <div class="catalogo-hero linha-hero">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
        <p>{intro}</p>
      </div>

      <nav class="linha-nav" aria-label="Tipos de peça da linha {nome_linha}">
{chips}
      </nav>

{secoes}
      <section class="linha-faq" aria-labelledby="titulo-faq-linha">
        <h2 id="titulo-faq-linha">Perguntas frequentes sobre a linha {nome_linha}</h2>
        <div class="acordeao-faq">
{faq_html}
        </div>
        <p class="linha-faq__mais"><a href="faq.html">Ver todas as perguntas frequentes</a></p>
      </section>

      <section class="linha-leia" aria-labelledby="titulo-leia">
        <h2 id="titulo-leia">Leia também</h2>
        <ul>
{leia_html}
          <li><a href="como-cuidar-da-peca.html">Como cuidar da peça</a></li>
          <li><a href="catalogo.html">Ver o catálogo completo</a></li>
        </ul>
        <p class="linha-outras">Outras linhas: {outras_linhas}</p>
      </section>
    </div>
  </section>
</main>

""" + RODAPE + """<script src="src/scripts/componentes/menu-mobile.js"></script>
<script src="src/scripts/componentes/busca-dinamica.js"></script>
<script src="src/scripts/utils/carrinho.js"></script>
<script src="src/scripts/componentes/carrinho-ui.js"></script>
</body>
</html>
"""


def carregar_ficha():
    spec = importlib.util.spec_from_file_location("gerar_ficha_produto", RAIZ / "scripts" / "gerar-ficha-produto.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def slug_ancora(texto):
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def lista_pt(itens):
    if len(itens) <= 1:
        return "".join(itens)
    return ", ".join(itens[:-1]) + " e " + itens[-1]


def titulo_artigo(slug):
    arq = RAIZ / "blog" / f"{slug}.html"
    if not arq.exists():
        return None
    m = re.search(r"<title>(.*?)</title>", arq.read_text(encoding="utf-8"), re.S)
    return re.sub(r"\s*[—–-]\s*Revista Turkista\s*$", "", m.group(1)).strip() if m else None


def card_html(f, p, prioridade):
    img = f.gerar_galeria(p)[0]["arquivo"]
    alt = f.esc(f.alt_imagem(p, 0, 1))
    badge = ""
    if p.get("badges"):
        badge = f'<span class="card-produto__badge">{f.NOMES_BADGE.get(p["badges"][0], p["badges"][0])}</span>'
    preco = p.get("preco") or {}
    preco_html, botao = "", ""
    if preco.get("valor"):
        preco_html = f'<p class="card-produto__preco">{f.preco_formatado(preco["valor"])}</p>'
        botao = (
            f'<button class="card-produto__adicionar" data-adicionar-carrinho data-slug="{f.esc_attr(p["slug"])}"'
            f' data-nome="{f.esc_attr(p["nome"])}" data-linha="{f.esc_attr(p["linha"])}" data-preco="{preco["valor"]}">Adicionar ao carrinho</button>'
        )
    carregamento = 'decoding="async"' if prioridade else 'loading="lazy" decoding="async"'
    return f"""        <div class="card-produto" data-linha-produto="{p['linha']}">
          <a href="produto/{p['slug']}.html" class="card-produto__link-completo">
            <div class="card-produto__imagem">
              {badge}
              <img src="assets/produtos/{img}" alt="{alt}"{f.atributos_dimensao(img)} {carregamento} onerror="this.style.display='none'">
            </div>
            <h3 class="card-produto__nome">{f.esc(p['nome'])}</h3>
            {preco_html}
            <span class="card-produto__link">Ver produto
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
          </a>
          {botao}
        </div>"""


def gerar_pagina(chave, produtos, f):
    cfg = LINHAS[chave]
    nome_linha = cfg["nome"]
    url = f"{BASE_URL}/{chave}.html"
    doprodutos = [p for p in produtos if p["linha"] == chave and f.esta_publicado(p)]
    if not doprodutos:
        return None

    # ordena: "novo" primeiro, depois a ordem do cadastro
    doprodutos.sort(key=lambda p: 0 if "novo" in (p.get("badges") or []) else 1)
    por_tipo = {}
    for p in doprodutos:
        por_tipo.setdefault(f.tipo_produto(p), []).append(p)
    tipos = [t for t in cfg["ordem"] if t in por_tipo] + [t for t in por_tipo if t not in cfg["ordem"]]

    # números calculados dos dados
    roupas = [p for p in doprodutos if f.tipo_produto(p) != "Xuxinha de cabelo"]
    precos = [p["preco"]["valor"] for p in roupas if (p.get("preco") or {}).get("valor")]
    faixa = f"de {f.preco_formatado(min(precos))} a {f.preco_formatado(max(precos))}" if precos else ""
    curtos = [PLURAL.get(t, (t, t.lower()))[1] for t in tipos if t != "Xuxinha de cabelo"]
    termo = f.LINHA_SEO[chave].lower()

    partes = [
        f"A linha {nome_linha} da Turkista tem {len(roupas)} peças disponíveis: {lista_pt(curtos)}."
    ]
    if faixa:
        partes.append(f"Os preços vão {faixa}.")
    if "Xuxinha de cabelo" in por_tipo:
        partes.append("A linha também tem xuxinhas de cabelo.")
    partes.append(
        "Cada modelo é cortado e costurado em Araruama, na Região dos Lagos (RJ), em pequenas quantidades: "
        "o estoque de cada peça é limitado e não é reposto em série."
    )
    intro = " ".join(partes)

    # meta description (até ~158 caracteres)
    desc = f"{len(roupas)} peças de {termo} da Turkista: {lista_pt(curtos)}. Preços {faixa}. Fabricação própria em Araruama, RJ."
    if len(desc) > 158:
        desc = f"{len(roupas)} peças de {termo} da Turkista: {lista_pt(curtos)}. Fabricação própria em Araruama, RJ."
    if len(desc) > 158:
        desc = desc[:157].rsplit(" ", 1)[0].rstrip(",;:") + "."

    # seções por tipo
    chips, secoes = [], []
    contador = 0
    for t in tipos:
        titulo_secao = PLURAL.get(t, (t, t.lower()))[0]
        ancora = slug_ancora(titulo_secao)
        chips.append(f'        <a href="#{ancora}">{titulo_secao}</a>')
        cards = []
        for p in por_tipo[t]:
            cards.append(card_html(f, p, contador < 4))
            contador += 1
        secoes.append(
            f'      <section class="linha-secao" id="{ancora}">\n        <h2>{titulo_secao}</h2>\n'
            f'        <div class="grade-produtos">\n' + "\n".join(cards) + "\n        </div>\n      </section>\n"
        )

    # FAQ (texto = fatos das páginas de política e dos dados)
    tams = sorted({t for p in doprodutos for t in (p.get("tamanhos") or [])}, key=lambda t: ORDEM_TAMANHOS.index(t) if t in ORDEM_TAMANHOS else 99)
    tem_intimo = any(f.eh_intimo(p) for p in doprodutos)
    resp_troca = (
        "Troca ou devolução em até 7 dias corridos após o recebimento. Biquínis e maiôs são aceitos somente em caso de "
        "defeito de fabricação, lacrados e sem sinais de uso."
        if tem_intimo
        else "Troca ou devolução em até 7 dias corridos após o recebimento, conforme o art. 49 do CDC."
    )
    faq = [
        (f"Quais tamanhos existem na linha {nome_linha}?",
         f"As peças da linha {nome_linha} estão cadastradas nos tamanhos {lista_pt(tams)}. Cada peça tem seus próprios tamanhos: confira na página do produto ou pergunte no WhatsApp."),
        ("Como funciona a troca ou devolução?", resp_troca),
        ("A Turkista envia para todo o Brasil?",
         "Sim. Os pedidos saem de Araruama (RJ) pelos Correios, com despacho em 1 a 3 dias úteis após a confirmação do pagamento. Frete grátis acima de R$ 100 para Sul e Sudeste."),
    ]
    faq_html = "\n".join(
        f'          <details class="acordeao-faq__item"><summary class="acordeao-faq__pergunta">{f.esc(q)}<span class="acordeao-faq__icone" aria-hidden="true"></span></summary>'
        f'<div class="acordeao-faq__resposta"><p>{f.esc(a)}</p></div></details>' for q, a in faq
    )

    leia = []
    for s in cfg["leia"]:
        tit = titulo_artigo(s)
        if tit:
            leia.append(f'          <li><a href="blog/{s}.html">{f.esc(tit)}</a></li>')
    outras = " · ".join(f'<a href="{k}.html">{v["nome"]}</a>' for k, v in LINHAS.items() if k != chave)

    # imagem de compartilhamento: foto da linha (assets/linhas/<linha>.webp)
    og_rel = f"assets/linhas/{chave}.webp"
    og_imagem = f"{BASE_URL}/{og_rel}"
    og_alt = f"Linha {nome_linha} da Turkista: {lista_pt(curtos)}"
    primeira = f.gerar_galeria(doprodutos[0])[0]["arquivo"]

    grafo = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "CollectionPage", "@id": f"{url}#pagina", "url": url, "name": cfg["titulo"].split(" | ")[0],
             "description": desc, "inLanguage": "pt-BR", "image": og_imagem,
             "isPartOf": {"@type": "WebSite", "name": "Turkista", "url": f"{BASE_URL}/"},
             "about": {"@id": f"{BASE_URL}/#organizacao"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
                {"@type": "ListItem", "position": 2, "name": nome_linha, "item": url}]},
            {"@type": "ItemList", "name": f"Peças da linha {nome_linha}", "numberOfItems": len(doprodutos),
             "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f"{BASE_URL}/produto/{p['slug']}.html", "name": p["nome"]}
                                 for i, p in enumerate(doprodutos)]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        ],
    }

    return TEMPLATE.format(
        titulo=f.esc(cfg["titulo"]), descricao=f.esc(desc), url=url,
        primeira_imagem=f"assets/produtos/{primeira}", og_imagem=og_imagem, og_alt=f.esc(og_alt),
        json_ld=json.dumps(grafo, ensure_ascii=False, indent=2),
        nome_linha=nome_linha, eyebrow=cfg["eyebrow"], h1=f.esc(cfg["h1"]), intro=f.esc(intro),
        chips="\n".join(chips), secoes="\n".join(secoes), faq_html=faq_html,
        leia_html="\n".join(leia), outras_linhas=outras,
    ), len(doprodutos)


def gerar_todas(produtos, ficha=None):
    f = ficha or carregar_ficha()
    total = 0
    for chave in LINHAS:
        resultado = gerar_pagina(chave, produtos, f)
        if not resultado:
            continue
        html, n = resultado
        (RAIZ / f"{chave}.html").write_text(marcar(html, "linha"), encoding="utf-8")
        print(f"Gerado: {chave}.html ({n} produtos)")
        total += 1
    return total


def main():
    f = carregar_ficha()
    arquivos = sorted(p for p in (RAIZ / "src" / "content" / "produtos").glob("*.json") if p.name != "index.json")
    produtos = [json.loads(p.read_text(encoding="utf-8")) for p in arquivos]
    gerar_todas(produtos, f)


if __name__ == "__main__":
    main()
