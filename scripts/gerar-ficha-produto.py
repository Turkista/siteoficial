#!/usr/bin/env python3
"""
Gerador de páginas de Ficha de Produto (Etapa 5 do Plano Mestre).

Lê cada arquivo JSON de src/content/produtos/ (que já segue
src/schema/produto.schema.json, validado no Adendo 6 do status de
implementação) e gera uma página estática em produto/<slug>.html.

Por quê um gerador, e não HTML escrito à mão por produto:
mesmo padrão já usado nos 10 artigos do blog (Adendo 4) — quando o
catálogo real crescer (Etapa 4), roda-se este script de novo para
qualquer produto novo, sem editar HTML manualmente peça por peça.

Uso:
    python3 scripts/gerar-ficha-produto.py
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTEUDO_DIR = RAIZ / "src" / "content" / "produtos"
SAIDA_DIR = RAIZ / "produto"
BASE_URL = "https://www.turkista.com.br"

WHATSAPP_NUMERO = "5521992197518"

NOMES_LINHA = {"praia": "Praia", "surf": "Surf", "turk-fit": "Turk Fit"}

NOMES_BADGE = {
    "novo": "Novo",
    "exclusivo": "Exclusivo",
    "ultimas-unidades": "Últimas unidades",
    "reposicao": "Reposição",
}


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s: str) -> str:
    return (s or "").replace('"', "&quot;")


def gerar_galeria(produto):
    # Junta imagens gerais + imagens de todas as cores, sem duplicar arquivo.
    imagens = []
    vistos = set()
    for img in produto.get("imagens", []):
        if img["arquivo"] not in vistos:
            imagens.append(img)
            vistos.add(img["arquivo"])
    for cor in produto.get("cores", []):
        for img in cor.get("imagens", []):
            if img["arquivo"] not in vistos:
                imagens.append(img)
                vistos.add(img["arquivo"])
    if not imagens:
        imagens = [{"arquivo": "placeholder.webp", "alt": produto["nome"]}]
    return imagens


def gerar_miniaturas_html(imagens):
    if len(imagens) <= 1:
        return ""
    itens = []
    for i, img in enumerate(imagens):
        current = "true" if i == 0 else "false"
        itens.append(f'''      <button type="button" class="ficha-produto__miniatura" data-miniatura aria-current="{current}" aria-label="Ver foto {i + 1} de {esc_attr(produto_nome_global)}">
        <img src="../assets/produtos/{img['arquivo']}" alt="" loading="lazy" onerror="this.style.display='none'">
      </button>''')
    return f'''
    <div class="ficha-produto__miniaturas" data-miniaturas>
{chr(10).join(itens)}
    </div>'''


def gerar_seletor_cor_html(produto):
    cores = produto.get("cores", [])
    if len(cores) <= 1:
        return ""
    botoes = []
    for i, cor in enumerate(cores):
        pressed = "true" if i == 0 else "false"
        botoes.append(
            f'<button type="button" class="seletor-cor__opcao" data-cor="{esc_attr(cor["nome"])}" '
            f'aria-pressed="{pressed}" aria-label="Cor {esc_attr(cor["nome"])}">'
            f'<span style="background:{cor["hex"]}"></span></button>'
        )
    return f'''
      <div class="seletor-cor">
        <span class="seletor-cor__rotulo">Cor</span>
        <div class="seletor-cor__opcoes" data-seletor-cor>
          {"".join(botoes)}
        </div>
        <span class="seletor-cor__nome-atual" data-cor-nome-atual>{esc(cores[0]["nome"])}</span>
      </div>'''


def gerar_seletor_tamanho_html(produto):
    tamanhos = produto.get("tamanhos", [])
    if not tamanhos:
        return ""
    botoes = "\n          ".join(
        f'<button type="button" class="seletor-tamanho__opcao" data-tamanho="{t}" aria-pressed="false">{t}</button>'
        for t in tamanhos
    )
    return f'''
      <div class="seletor-tamanho">
        <span class="seletor-tamanho__rotulo">Tamanho</span>
        <div class="seletor-tamanho__opcoes" data-seletor-tamanho>
          {botoes}
        </div>
      </div>'''


def gerar_badges_html(produto):
    badges = produto.get("badges", [])
    if not badges:
        return ""
    spans = "".join(f'<span class="badge badge--exclusivo">{NOMES_BADGE.get(b, b)}</span>' for b in badges)
    return f'<div class="ficha-produto__badges">{spans}</div>'


def gerar_preco_html(produto):
    preco = produto.get("preco")
    if preco:
        valor = preco.get("valor")
        parcelamento = preco.get("parcelamento", "")
        valor_fmt = f"R$ {valor:.2f}".replace(".", ",")
        html = f'<p class="ficha-produto__preco">{valor_fmt}</p>'
        if parcelamento:
            html += f'\n      <p class="ficha-produto__parcelamento">{esc(parcelamento)}</p>'
        return html
    return (
        '<div class="ficha-produto__preco-consulta">'
        '<strong>Preço sob consulta.</strong> Hoje o fechamento da Turkista é 100% pelo WhatsApp — '
        'fale com a gente para saber valor, disponibilidade e prazo de entrega desta peça.'
        '</div>'
    )


def gerar_botao_carrinho_html(produto):
    preco = produto.get("preco")
    if not preco or not preco.get("valor"):
        return ""  # sem preço cadastrado ainda — só resta perguntar no WhatsApp
    cores = produto.get("cores", [])
    cor_padrao = esc_attr(cores[0]["nome"]) if cores else ""
    return (
        f'<button type="button" class="botao botao--primario" data-adicionar-carrinho'
        f' data-slug="{esc_attr(produto["slug"])}" data-nome="{esc_attr(produto["nome"])}"'
        f' data-linha="{esc_attr(produto["linha"])}" data-preco="{preco["valor"]}"'
        f' data-tamanho="" data-cor="{cor_padrao}">Adicionar ao carrinho</button>'
    )


def gerar_ficha_tecnica_html(produto):
    comp = produto.get("composicao", {})
    linhas = []
    tecido = comp.get("tecido", "")
    if tecido and not tecido.startswith("PREENCHER"):
        linhas.append(f"<dt>Tecido</dt><dd>{esc(tecido)}</dd>")
    protecao = comp.get("protecaoUV")
    if protecao:
        linhas.append(f"<dt>Proteção UV</dt><dd>{esc(protecao)}</dd>")
    pais = comp.get("paisDeFabricacao")
    if pais:
        linhas.append(f"<dt>Fabricação</dt><dd>{esc(pais)}</dd>")
    if produto.get("tamanhos"):
        linhas.append(f"<dt>Tamanhos</dt><dd>{', '.join(produto['tamanhos'])}</dd>")
    if not linhas:
        return ""
    return f'''
    <div class="ficha-tecnica">
      <h2>Ficha técnica</h2>
      <dl>
        {"".join(linhas)}
      </dl>
    </div>'''


def gerar_descricao_completa_html(produto):
    """Descrição completa (campo do painel) — Etapa 5.1.

    Campo de texto livre digitado no painel: pode vir com parágrafos
    separados por linha em branco, um subtítulo tipo "Destaques da peça:"
    e uma lista de destaques com uma frase por linha terminada em ";".
    Aqui a gente detecta esses três padrões e formata como parágrafo,
    subtítulo em destaque ou lista com marcadores. Se o produto não tiver
    esse campo preenchido no painel, a seção inteira não é impressa
    (sem título vazio, sem caixa em branco no site).
    """
    texto = (produto.get("descricaoCompleta") or "").strip()
    if not texto:
        return ""

    texto = texto.replace("\r\n", "\n").replace("\r", "\n")
    blocos = [b.strip() for b in re.split(r"\n\s*\n", texto) if b.strip()]

    partes = []
    for bloco in blocos:
        linhas = [l.strip() for l in bloco.split("\n") if l.strip()]

        eh_lista = len(linhas) > 1 and sum(1 for l in linhas if l.endswith(";")) >= len(linhas) - 1

        if eh_lista:
            itens = "".join(f"<li>{esc(l.rstrip(';.'))}.</li>" for l in linhas)
            partes.append(f"<ul>{itens}</ul>")
        elif len(linhas) == 1 and linhas[0].endswith(":") and len(linhas[0]) < 60:
            partes.append(f'<p class="ficha-produto__descricao-completa-subtitulo">{esc(linhas[0])}</p>')
        else:
            partes.append(f"<p>{'<br>'.join(esc(l) for l in linhas)}</p>")

    if not partes:
        return ""

    return f'''
    <div class="ficha-produto__descricao-completa">
      <h2>Sobre a peça</h2>
      {"".join(partes)}
    </div>'''


def limpar_texto_para_html(texto):
    """Colapsa quebras de linha em espaço e remove espaços duplicados —
    pra usar texto de descrição (que tem \\r\\n) dentro de um atributo
    HTML de uma linha só, tipo <meta content="...">."""
    texto = (texto or "").replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    return re.sub(r"\s+", " ", texto).strip()


def montar_titulo(produto):
    """Título da aba/SERP. Mantém "Nome — Turkista" enquanto couber em
    ~60 caracteres (limite prático antes do Google cortar no resultado
    de busca); para nomes de produto já longos, usa só o nome, sem
    sufixo, em vez de estourar o limite."""
    nome = produto["nome"]
    sufixo = " — Turkista"
    if len(nome) + len(sufixo) <= 60:
        return f"{nome}{sufixo}"
    return nome


def montar_meta_descricao(produto):
    """Meta description limpa (sem quebra de linha crua) e num tamanho
    saudável pro SERP (~155-160 caracteres). Quando a descrição curta
    do painel é curta demais pra ser útil como meta description,
    complementa com o início da descrição completa — sem inventar
    texto novo, só reaproveitando o que já foi escrito no painel."""
    base = limpar_texto_para_html(produto.get("descricaoCurta", ""))
    if len(base) < 70:
        completa = limpar_texto_para_html(produto.get("descricaoCompleta", ""))
        if len(completa) > len(base):
            base = completa

    if len(base) > 157:
        corte = base[:157].rsplit(" ", 1)[0]
        base = f"{corte}..."
    return base


def gerar_json_ld(produto, imagens, url):
    imagens_url = [f"{BASE_URL}/assets/produtos/{img['arquivo']}" for img in imagens]
    produto_data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": produto["nome"],
        "description": limpar_texto_para_html(produto.get("descricaoCurta", "")),
        "image": imagens_url,
        "brand": {"@type": "Brand", "name": "Turkista"},
        "url": url,
    }
    cores = produto.get("cores", [])
    if cores:
        produto_data["color"] = [c["nome"] for c in cores]
    preco = produto.get("preco")
    if preco and preco.get("valor"):
        produto_data["offers"] = {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": str(preco["valor"]),
            "availability": "https://schema.org/InStock"
            if produto.get("status") == "publicado"
            else "https://schema.org/PreOrder",
            "url": url,
        }

    # Breadcrumb estruturado — segue o mesmo caminho do breadcrumb visual
    # da página (Home / Linha / Produto), pra habilitar o rich result de
    # navegação no resultado de busca do Google.
    nome_linha = NOMES_LINHA.get(produto["linha"], produto["linha"])
    breadcrumb_data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/index.html"},
            {"@type": "ListItem", "position": 2, "name": nome_linha, "item": f"{BASE_URL}/index.html#{produto['linha']}"},
            {"@type": "ListItem", "position": 3, "name": produto["nome"], "item": url},
        ],
    }

    return (
        json.dumps(produto_data, ensure_ascii=False, indent=2)
        + "\n</script>\n<script type=\"application/ld+json\">\n"
        + json.dumps(breadcrumb_data, ensure_ascii=False, indent=2)
    )


def gerar_relacionados_html(produto, todos_produtos):
    relacionados = [p for p in todos_produtos if p["linha"] == produto["linha"] and p["slug"] != produto["slug"]]
    if not relacionados:
        return ""
    cards = []
    for p in relacionados[:3]:
        img = (p.get("imagens") or [{}])[0]
        arquivo = img.get("arquivo", "")
        alt = img.get("alt", p["nome"])
        badge_html = ""
        if p.get("badges"):
            badge_html = f'<span class="card-produto__badge">{NOMES_BADGE.get(p["badges"][0], p["badges"][0])}</span>'
        preco_rel = p.get("preco")
        preco_rel_html = ""
        botao_rel_html = ""
        if preco_rel and preco_rel.get("valor"):
            valor_fmt = f"R$ {preco_rel['valor']:.2f}".replace(".", ",")
            preco_rel_html = f'<p class="card-produto__preco">{valor_fmt}</p>'
            botao_rel_html = (
                f'<button class="card-produto__adicionar" data-adicionar-carrinho'
                f' data-slug="{esc_attr(p["slug"])}" data-nome="{esc_attr(p["nome"])}"'
                f' data-linha="{esc_attr(p["linha"])}" data-preco="{preco_rel["valor"]}">Adicionar ao carrinho</button>'
            )
        cards.append(f'''        <div class="card-produto">
          <a href="{p['slug']}.html" class="card-produto__link-completo">
            <div class="card-produto__imagem">
              {badge_html}
              <img src="../assets/produtos/{arquivo}" alt="{esc_attr(alt)}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <h3 class="card-produto__nome">{esc(p['nome'])}</h3>
            {preco_rel_html}
            <span class="card-produto__link">Ver produto
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
          </a>
          {botao_rel_html}
        </div>''')
    return f'''
  <section class="secao secao-relacionados">
    <div class="container">
      <div class="cabecalho-secao cabecalho-secao--centro">
        <span class="eyebrow">Combina com essa</span>
        <h2>Outras peças da linha {NOMES_LINHA.get(produto['linha'], produto['linha'])}</h2>
      </div>
      <div class="grade-produtos">
{chr(10).join(cards)}
      </div>
    </div>
  </section>'''


TEMPLATE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titulo}</title>
<meta name="description" content="{descricao_meta}">
<link rel="canonical" href="{url}">
<link rel="preload" as="image" href="../assets/produtos/{imagem_capa}" fetchpriority="high">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Turkista">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao_meta}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{imagem_capa_url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{descricao_meta}">
<meta name="twitter:image" content="{imagem_capa_url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../src/styles/tokens/tokens.css">
<link rel="stylesheet" href="../src/styles/base/base.css">
<link rel="stylesheet" href="../src/styles/componentes/botoes.css">
<link rel="stylesheet" href="../src/styles/componentes/header.css">
<link rel="stylesheet" href="../src/styles/componentes/footer.css">
<link rel="stylesheet" href="../src/styles/componentes/cards.css">
<link rel="stylesheet" href="../src/styles/componentes/whatsapp-flutuante.css">
<link rel="stylesheet" href="../src/styles/componentes/carrinho.css">
<link rel="stylesheet" href="../src/pages/produto/produto.css">
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
      <a href="../index.html#praia">Praia</a>
      <a href="../index.html#surf">Surf</a>
      <a href="../index.html#turk-fit">Turk Fit</a>
      <a href="../blog.html">Blog</a>
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
    <li><a href="../index.html#praia">Praia</a></li>
    <li><a href="../index.html#surf">Surf</a></li>
    <li><a href="../index.html#turk-fit">Turk Fit</a></li>
    <li><a href="../blog.html">Blog</a></li>
    <li><a href="../sobre-a-marca.html">Sobre a Marca</a></li>
    <li><a href="../contato.html">Contato</a></li>
    <li><a href="../como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
  </ul>
</nav>

<main id="conteudo-principal">
  <section class="ficha-produto">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Home</a><span aria-hidden="true">/</span><a href="../index.html#{linha}">{nome_linha}</a><span aria-hidden="true">/</span><span aria-current="page">{nome}</span>
      </nav>

      <div class="ficha-produto__grade">

        <div class="ficha-produto__galeria">
          <div class="ficha-produto__imagem-principal" data-imagem-principal>
            <img src="../assets/produtos/{imagem_capa}" alt="{imagem_capa_alt}" fetchpriority="high" onerror="this.style.display='none'">
          </div>{miniaturas_html}
        </div>

        <div class="ficha-produto__info">
          <span class="eyebrow">{nome_linha} · {categoria}</span>
          <h1 class="ficha-produto__titulo">{nome}</h1>
          {badges_html}
          <p class="ficha-produto__descricao">{descricao_curta}</p>

          {preco_html}
          {seletor_cor_html}
          {seletor_tamanho_html}

          <div class="ficha-produto__cta">
            {botao_carrinho_html}
            <a href="https://wa.me/{whatsapp_numero}?text={whatsapp_texto}" class="botao botao--primario" target="_blank" rel="noopener">Perguntar no WhatsApp</a>
            <span class="ficha-produto__cta-nota">Estoque limitado — fabricação própria, peças não repostas em série.</span>
          </div>

          {ficha_tecnica_html}
        </div>

      </div>

      {descricao_completa_html}
    </div>
  </section>
{relacionados_html}
</main>

<footer class="rodape">
  <div class="container rodape__grade">
    <div class="rodape__marca">
      <span class="cabecalho__logo">TURK<span>ISTA</span></span>
      <p>Roupas de praia, surf e academia, feitas à mão, com tecido pensado para o movimento de cada corpo. Araruama, Região dos Lagos — RJ.</p>
      <div class="rodape__redes">
        <a href="https://instagram.com/turkista.com.br" target="_blank" rel="noopener" aria-label="Instagram Turkista">IG</a>
        <a href="https://instagram.com/turkfit.com.br" target="_blank" rel="noopener" aria-label="Instagram Turk Fit">TF</a>
        <a href="https://wa.me/{whatsapp_numero}" target="_blank" rel="noopener" aria-label="WhatsApp Turkista">WA</a>
      </div>
    </div>
    <div class="rodape__coluna">
      <h3>Linhas</h3>
      <ul>
        <li><a href="../index.html#praia">Praia</a></li>
        <li><a href="../index.html#surf">Surf</a></li>
        <li><a href="../index.html#turk-fit">Turk Fit</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Marca</h3>
      <ul>
        <li><a href="../sobre-a-marca.html">Sobre a Marca</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li><a href="../como-cuidar-da-peca.html">Como Cuidar da Peça</a></li>
        <li><a href="../contato.html">Contato</a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h3>Atendimento</h3>
      <ul>
        <li><a href="https://wa.me/{whatsapp_numero}" target="_blank" rel="noopener">WhatsApp</a></li>
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

<a href="https://wa.me/{whatsapp_numero}?text=Oi!%20Vi%20o%20site%20da%20Turkista%20e%20queria%20saber%20mais%20sobre%20as%20pe%C3%A7as." class="whatsapp-flutuante esta-visivel" data-whatsapp-flutuante target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.71-.17 1.39z"/></svg>
  <span class="whatsapp-flutuante__texto">Falar no WhatsApp</span>
</a>

<script src="../src/scripts/componentes/menu-mobile.js"></script>
<script src="../src/scripts/utils/carrinho.js"></script>
<script src="../src/scripts/componentes/carrinho-ui.js"></script>
<script src="../src/scripts/componentes/ficha-produto.js"></script>
</body>
</html>
"""


def gerar_pagina(produto, todos_produtos):
    global produto_nome_global
    produto_nome_global = produto["nome"]

    url = f"{BASE_URL}/produto/{produto['slug']}.html"
    imagens = gerar_galeria(produto)
    imagem_capa = imagens[0]["arquivo"]
    imagem_capa_alt = esc_attr(imagens[0].get("alt", produto["nome"]))
    imagem_capa_url = f"{BASE_URL}/assets/produtos/{imagem_capa}"

    titulo = montar_titulo(produto)
    descricao_meta = esc_attr(montar_meta_descricao(produto))

    whatsapp_texto = (
        f"Oi! Vi o {produto['nome']} no site da Turkista e queria saber mais "
        f"(tamanho, cor disponível e valor)."
    )
    whatsapp_texto_url = whatsapp_texto.replace(" ", "%20").replace("!", "%21").replace(
        "(", "%28"
    ).replace(")", "%29").replace(",", "%2C")

    html = TEMPLATE.format(
        titulo=esc(titulo),
        descricao_meta=descricao_meta,
        url=url,
        imagem_capa_url=imagem_capa_url,
        linha=produto["linha"] if produto["linha"] != "turk-fit" else "turk-fit",
        nome_linha=NOMES_LINHA.get(produto["linha"], produto["linha"]),
        nome=esc(produto["nome"]),
        imagem_capa=imagem_capa,
        imagem_capa_alt=imagem_capa_alt,
        miniaturas_html=gerar_miniaturas_html(imagens),
        categoria=esc(produto.get("categoria", "")),
        badges_html=gerar_badges_html(produto),
        descricao_curta=esc(produto.get("descricaoCurta", "")),
        preco_html=gerar_preco_html(produto),
        botao_carrinho_html=gerar_botao_carrinho_html(produto),
        seletor_cor_html=gerar_seletor_cor_html(produto),
        seletor_tamanho_html=gerar_seletor_tamanho_html(produto),
        whatsapp_numero=WHATSAPP_NUMERO,
        whatsapp_texto=whatsapp_texto_url,
        ficha_tecnica_html=gerar_ficha_tecnica_html(produto),
        descricao_completa_html=gerar_descricao_completa_html(produto),
        relacionados_html=gerar_relacionados_html(produto, todos_produtos),
        json_ld=gerar_json_ld(produto, imagens, url),
    )
    return html


def main():
    SAIDA_DIR.mkdir(exist_ok=True)
    # index.json é o manifesto consumido pelo navegador (catalogo-dinamico.js
    # / destaques-dinamico.js), gerado automaticamente pelo painel local —
    # não é a ficha de um produto, então fica de fora deste laço.
    arquivos = sorted(p for p in CONTEUDO_DIR.glob("*.json") if p.name != "index.json")
    produtos = [json.loads(p.read_text(encoding="utf-8")) for p in arquivos]

    for produto in produtos:
        html = gerar_pagina(produto, produtos)
        destino = SAIDA_DIR / f"{produto['slug']}.html"
        destino.write_text(html, encoding="utf-8")
        print(f"Gerado: {destino.relative_to(RAIZ)}")

    print(f"\n{len(produtos)} fichas de produto geradas em produto/.")


if __name__ == "__main__":
    main()
