/* ============================================================
   COMPONENTE — Busca dinâmica do site
   Injeta o botão de busca no header e um painel overlay com
   resultados em tempo real, cruzando:
   1. Produtos publicados/esgotados (src/content/produtos/index.json —
      o mesmo manifesto usado pelo catálogo dinâmico).
   2. Páginas institucionais e artigos do blog (lista estática abaixo,
      já que o manifesto de artigos ainda não é gerado pelo painel).

   Funciona em qualquer profundidade de pasta (raiz, /produto/, /blog/)
   porque descobre o prefixo relativo lendo o <link> do header.css,
   que já existe em toda página do site.
   ============================================================ */
(function () {
  'use strict';

  // ---------- Descobre o prefixo relativo até a raiz do site ----------
  var linkHeader = document.querySelector('link[href$="src/styles/componentes/header.css"]');
  var PREFIXO = linkHeader
    ? linkHeader.getAttribute('href').replace('src/styles/componentes/header.css', '')
    : '';

  // ---------- Páginas estáticas (institucional + blog) ----------
  var PAGINAS = [
    { titulo: 'Catálogo', descricao: 'Todas as peças de praia, surf e Turk Fit', href: 'catalogo.html', tipo: 'pagina' },
    { titulo: 'Sobre a Marca', descricao: 'A história da Turkista, do ateliê da família à fabricação própria', href: 'sobre-a-marca.html', tipo: 'pagina' },
    { titulo: 'Como Cuidar da Peça', descricao: 'Orientações de uso, lavagem e conserto das peças em lycra', href: 'como-cuidar-da-peca.html', tipo: 'pagina' },
    { titulo: 'Perguntas Frequentes', descricao: 'Como comprar, tamanhos, prazos e política de conserto', href: 'faq.html', tipo: 'pagina' },
    { titulo: 'Contato', descricao: 'Fale com a Turkista pelo WhatsApp ou Instagram', href: 'contato.html', tipo: 'pagina' },
    { titulo: 'Blog', descricao: 'Revista Turkista: moda praia, tecido, estilo e bastidores', href: 'blog.html', tipo: 'pagina' },
    { titulo: 'Rastreie seu Pedido', descricao: 'Acompanhe a entrega pelos Correios', href: 'rastreie-seu-pedido.html', tipo: 'pagina' },
    { titulo: 'Política de Troca e Reembolso', descricao: 'Condições para troca, devolução e reembolso', href: 'politica-de-troca-e-reembolso.html', tipo: 'pagina' },
    { titulo: 'Política de Envio e Prazo de Entrega', descricao: 'Prazos de processamento, despacho e entrega', href: 'politica-de-envio-e-prazo-de-entrega.html', tipo: 'pagina' },
    { titulo: 'Política de Privacidade', descricao: 'Como a Turkista trata dados de navegação e contato', href: 'politica-de-privacidade.html', tipo: 'pagina' },
    { titulo: 'Do ateliê à peça pronta: o cuidado em cada detalhe', descricao: 'Conheça cada etapa da nossa produção própria e o que nos torna únicas.', href: 'blog/atelie-peca-pronta.html', tipo: 'artigo' },
    { titulo: 'Biquíni ou top esportivo? Entenda as diferenças', descricao: 'Quando usar cada um e como escolher o ideal para o seu treino.', href: 'blog/biquini-ou-top.html', tipo: 'artigo' },
    { titulo: 'Cores que valorizam seu tom de pele', descricao: 'Um guia rápido para escolher a cor certa da próxima peça Turkista.', href: 'blog/cores-tom-de-pele.html', tipo: 'artigo' },
    { titulo: 'Como cuidar do seu biquíni e fazer durar muito mais', descricao: 'Dicas práticas para conservar a cor, a elasticidade e o caimento das peças.', href: 'blog/cuidados-biquini.html', tipo: 'artigo' },
    { titulo: 'Fabricação própria: por que fazemos assim', descricao: 'Corte, costura e acabamento sob o mesmo teto — e o que isso muda na peça.', href: 'blog/fabricacao-propria.html', tipo: 'artigo' },
    { titulo: 'Lavagem, secagem e armazenamento corretos', descricao: 'O passo a passo simples que evita que a lycra perca cor e sustentação.', href: 'blog/lavagem-secagem.html', tipo: 'artigo' },
    { titulo: 'Moda praia o ano inteiro: como usar além do verão', descricao: 'Peças versáteis que acompanham você em qualquer estação do ano.', href: 'blog/moda-praia-ano-inteiro.html', tipo: 'artigo' },
    { titulo: 'Peças que te acompanham em cada movimento', descricao: 'Sustentação onde o corpo precisa, liberdade onde o treino pede.', href: 'blog/pecas-movimento.html', tipo: 'artigo' },
    { titulo: 'O tecido certo faz toda a diferença', descricao: 'Entenda por que escolhemos cada tecido para um tipo de movimento.', href: 'blog/tecido-certo.html', tipo: 'artigo' }
  ];

  var LIMITE_PRODUTOS = 6;
  var LIMITE_PAGINAS = 4;

  // ---------- Utilidades ----------
  function normalizar(texto) {
    return (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function escapar(texto) {
    var div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  function formatarPreco(valor) {
    if (!valor) return '';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  var ICONE_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  var ICONE_PAGINA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
  var ICONE_ARTIGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';

  // ---------- Injeta o botão de busca no header ----------
  function injetarBotao() {
    var botaoMenu = document.querySelector('.cabecalho__botao-menu[data-menu-abrir]');
    if (!botaoMenu || document.querySelector('[data-busca-abrir]')) return;

    var botaoBusca = document.createElement('button');
    botaoBusca.className = 'cabecalho__botao-busca';
    botaoBusca.type = 'button';
    botaoBusca.setAttribute('data-busca-abrir', '');
    botaoBusca.setAttribute('aria-label', 'Buscar no site');
    botaoBusca.innerHTML = ICONE_LUPA;
    botaoMenu.parentNode.insertBefore(botaoBusca, botaoMenu);
  }

  // ---------- Cria o overlay ----------
  function criarOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'busca-overlay';
    overlay.setAttribute('data-busca-overlay', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Busca no site');
    overlay.innerHTML =
      '<div class="busca-painel">' +
        '<div class="busca-painel__campo">' +
          ICONE_LUPA +
          '<input type="text" class="busca-painel__input" data-busca-input placeholder="Buscar peças, categorias, artigos..." autocomplete="off">' +
          '<button type="button" class="busca-painel__fechar" data-busca-fechar aria-label="Fechar busca">&times;</button>' +
        '</div>' +
        '<div class="busca-painel__resultados" data-busca-resultados></div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  // ---------- Lógica de busca ----------
  function pontuarTexto(termo, texto) {
    var t = normalizar(texto);
    if (!t) return 0;
    if (t === termo) return 100;
    if (t.indexOf(termo) === 0) return 70;
    if (t.indexOf(termo) !== -1) return 40;
    return 0;
  }

  function buscarProdutos(termo, produtos) {
    return produtos
      .map(function (p) {
        var pontos = Math.max(
          pontuarTexto(termo, p.nome) * 1.5,
          pontuarTexto(termo, p.categoria),
          pontuarTexto(termo, p.linha),
          pontuarTexto(termo, (p.tags || []).join(' ')),
          pontuarTexto(termo, p.descricaoCurta) * 0.6
        );
        return { item: p, pontos: pontos };
      })
      .filter(function (r) { return r.pontos > 0; })
      .sort(function (a, b) { return b.pontos - a.pontos; })
      .slice(0, LIMITE_PRODUTOS)
      .map(function (r) { return r.item; });
  }

  function buscarPaginas(termo) {
    return PAGINAS
      .map(function (p) {
        var pontos = Math.max(
          pontuarTexto(termo, p.titulo) * 1.5,
          pontuarTexto(termo, p.descricao) * 0.6
        );
        return { item: p, pontos: pontos };
      })
      .filter(function (r) { return r.pontos > 0; })
      .sort(function (a, b) { return b.pontos - a.pontos; })
      .slice(0, LIMITE_PAGINAS)
      .map(function (r) { return r.item; });
  }

  function itemProdutoHTML(produto) {
    var imagem = (produto.imagens && produto.imagens[0]) || {};
    var preco = produto.preco && produto.preco.valor;
    var imgHTML = imagem.arquivo
      ? '<div class="busca-item__imagem"><img src="' + PREFIXO + 'assets/produtos/' + escapar(imagem.arquivo) + '" alt="" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>'
      : '<div class="busca-item__icone">' + ICONE_LUPA + '</div>';
    return (
      '<a class="busca-item" href="' + PREFIXO + 'produto/' + encodeURIComponent(produto.slug) + '.html" data-busca-item>' +
        imgHTML +
        '<div class="busca-item__texto">' +
          '<div class="busca-item__nome">' + escapar(produto.nome) + '</div>' +
          '<div class="busca-item__legenda">' + escapar(produto.categoria || '') + '</div>' +
        '</div>' +
        (preco ? '<span class="busca-item__preco">' + escapar(formatarPreco(preco)) + '</span>' : '') +
      '</a>'
    );
  }

  function itemPaginaHTML(pagina) {
    var icone = pagina.tipo === 'artigo' ? ICONE_ARTIGO : ICONE_PAGINA;
    return (
      '<a class="busca-item" href="' + PREFIXO + pagina.href + '" data-busca-item>' +
        '<div class="busca-item__icone">' + icone + '</div>' +
        '<div class="busca-item__texto">' +
          '<div class="busca-item__nome">' + escapar(pagina.titulo) + '</div>' +
          '<div class="busca-item__legenda">' + escapar(pagina.descricao) + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  // ---------- Controlador principal ----------
  function iniciar() {
    injetarBotao();
    var overlay = criarOverlay();
    var input = overlay.querySelector('[data-busca-input]');
    var resultados = overlay.querySelector('[data-busca-resultados]');
    var botaoAbrir = document.querySelector('[data-busca-abrir]');
    var botaoFechar = overlay.querySelector('[data-busca-fechar]');

    var produtosCache = null;
    var carregandoProdutos = false;

    function carregarProdutos() {
      if (produtosCache || carregandoProdutos) return;
      carregandoProdutos = true;
      fetch(PREFIXO + 'src/content/produtos/index.json')
        .then(function (resp) { return resp.ok ? resp.json() : []; })
        .then(function (lista) {
          produtosCache = (lista || []).filter(function (p) {
            return p.status === 'publicado' || p.status === 'esgotado';
          });
          renderizar(input.value);
        })
        .catch(function () {
          produtosCache = [];
        });
    }

    function renderizar(valorBruto) {
      var termo = normalizar(valorBruto);

      if (!termo) {
        resultados.innerHTML = '<p class="busca-painel__dica">Digite o nome de uma peça, categoria (biquíni, maiô, top...) ou assunto do blog.</p>';
        return;
      }

      var produtos = produtosCache ? buscarProdutos(termo, produtosCache) : [];
      var paginas = buscarPaginas(termo);

      if (produtos.length === 0 && paginas.length === 0) {
        resultados.innerHTML =
          '<p class="busca-painel__vazio">Nenhum resultado para "' + escapar(valorBruto) + '".<br>' +
          'Tente outro termo ou <a class="busca-painel__vertudo" href="' + PREFIXO + 'catalogo.html">veja o catálogo completo</a>.</p>';
        return;
      }

      var html = '';
      if (produtos.length) {
        html +=
          '<div class="busca-grupo">' +
            '<div class="busca-grupo__titulo">Produtos</div>' +
            '<div class="busca-grupo__lista">' + produtos.map(itemProdutoHTML).join('') + '</div>' +
          '</div>';
      }
      if (paginas.length) {
        html +=
          '<div class="busca-grupo">' +
            '<div class="busca-grupo__titulo">Páginas e blog</div>' +
            '<div class="busca-grupo__lista">' + paginas.map(itemPaginaHTML).join('') + '</div>' +
          '</div>';
      }
      resultados.innerHTML = html;
    }

    var debounceId = null;
    function aoDigitar() {
      clearTimeout(debounceId);
      debounceId = setTimeout(function () { renderizar(input.value); }, 120);
    }

    function abrir() {
      overlay.classList.add('esta-aberta');
      document.body.classList.add('busca-aberta');
      carregarProdutos();
      renderizar(input.value);
      setTimeout(function () { input.focus(); }, 50);
    }

    function fechar() {
      overlay.classList.remove('esta-aberta');
      document.body.classList.remove('busca-aberta');
    }

    if (botaoAbrir) botaoAbrir.addEventListener('click', abrir);
    botaoFechar.addEventListener('click', fechar);
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) fechar();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && overlay.classList.contains('esta-aberta')) fechar();
      // Atalho "/" abre a busca quando o foco não está em um campo de texto.
      if (ev.key === '/' && !overlay.classList.contains('esta-aberta')) {
        var alvo = ev.target;
        var estaDigitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
        if (!estaDigitando) {
          ev.preventDefault();
          abrir();
        }
      }
    });
    input.addEventListener('input', aoDigitar);
    resultados.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-busca-item]')) fechar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
