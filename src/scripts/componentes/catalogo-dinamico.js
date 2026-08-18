/* ============================================================
   COMPONENTE — Catálogo dinâmico (catalogo.html)
   Substitui o filtro-catalogo.js estático (Adendo 11).

   O que faz:
   1. Busca src/content/produtos/index.json — o "manifesto" de
      todos os produtos, gerado automaticamente pelo painel local
      (painel-produtos/server.js) toda vez que um produto é salvo.
   2. Se existir pelo menos 1 produto com status "publicado" ou
      "esgotado", troca os 4 cards de exemplo do HTML pelos cards
      reais, gerados a partir do JSON.
   3. Se não existir nenhum produto publicado (ou o manifesto não
      existir/falhar ao carregar), mantém os 4 cards de exemplo que
      já estão no HTML — degrada bem, nunca mostra uma grade vazia.
   4. Em seguida, liga o filtro por linha (Todas/Praia/Surf/Turk Fit)
      nos cards que estiverem na tela — reais ou de exemplo, tanto
      faz, o filtro funciona igual pros dois casos.
   5. Também lê a âncora da URL (#praia, #surf, #turk-fit), mesmo
      comportamento que já existia.
   ============================================================ */
(function () {
  var grade = document.querySelector('.grade-produtos');
  var aviso = document.querySelector('.aviso-catalogo');
  if (!grade) return;

  var NOMES_BADGE = {
    novo: 'Novo',
    exclusivo: 'Exclusivo',
    'ultimas-unidades': 'Últimas unidades',
    reposicao: 'Reposição',
  };

  function escapar(texto) {
    var div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  function cardHTML(produto) {
    var imagem = (produto.imagens && produto.imagens[0]) || {};
    var badgeChave = produto.badges && produto.badges[0];
    var badgeHTML = badgeChave
      ? '<span class="card-produto__badge">' + escapar(NOMES_BADGE[badgeChave] || badgeChave) + '</span>'
      : '';
    var preco = produto.preco && produto.preco.valor;
    var precoHTML = preco
      ? '<p class="card-produto__preco">' + escapar(preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })) + '</p>'
      : '';
    // Esgotado não entra no carrinho — só peças publicadas e com preço cadastrado.
    var botaoAdicionarHTML = (produto.status === 'publicado' && preco)
      ? '<button class="card-produto__adicionar" data-adicionar-carrinho' +
          ' data-slug="' + escapar(produto.slug) + '"' +
          ' data-nome="' + escapar(produto.nome) + '"' +
          ' data-linha="' + escapar(produto.linha) + '"' +
          ' data-preco="' + preco + '">Adicionar ao carrinho</button>'
      : '';

    return (
      '<div class="card-produto" data-linha-produto="' + escapar(produto.linha) + '">' +
        '<a href="produto/' + encodeURIComponent(produto.slug) + '.html" class="card-produto__link-completo">' +
          '<div class="card-produto__imagem">' +
            badgeHTML +
            '<img src="assets/produtos/' + escapar(imagem.arquivo || '') + '" alt="' + escapar(imagem.alt || produto.nome) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '</div>' +
          '<h3 class="card-produto__nome">' + escapar(produto.nome) + '</h3>' +
          precoHTML +
          '<span class="card-produto__link">Ver produto' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '</span>' +
        '</a>' +
        botaoAdicionarHTML +
      '</div>'
    );
  }

  function ligarFiltro() {
    var botoes = document.querySelectorAll('[data-filtro-linha]');
    var cards = document.querySelectorAll('[data-linha-produto]');
    if (!botoes.length || !cards.length) return;

    function aplicarFiltro(linha) {
      botoes.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-filtro-linha') === linha ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var pertence = linha === 'todas' || card.getAttribute('data-linha-produto') === linha;
        card.hidden = !pertence;
      });
    }

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        aplicarFiltro(botao.getAttribute('data-filtro-linha'));
      });
    });

    var linhasValidas = ['praia', 'surf', 'turk-fit'];

    function aplicarFiltroDaUrl() {
      var linhaNaUrl = (window.location.hash || '').replace('#', '');
      aplicarFiltro(linhasValidas.indexOf(linhaNaUrl) !== -1 ? linhaNaUrl : 'todas');
    }

    // Reaplica o filtro quando a âncora muda sem recarregar a página —
    // acontece ao clicar no menu superior (Praia/Surf/Turk Fit) estando
    // já em catalogo.html, já que o navegador só troca a URL nesse caso.
    window.addEventListener('hashchange', aplicarFiltroDaUrl);

    var linhaNaUrl = (window.location.hash || '').replace('#', '');
    if (linhasValidas.indexOf(linhaNaUrl) !== -1) {
      aplicarFiltro(linhaNaUrl);
    }
  }

  fetch('src/content/produtos/index.json')
    .then(function (resposta) {
      if (!resposta.ok) throw new Error('manifesto indisponível');
      return resposta.json();
    })
    .then(function (produtos) {
      var visiveis = (produtos || []).filter(function (p) {
        return p.status === 'publicado' || p.status === 'esgotado';
      });

      if (visiveis.length === 0) {
        // Nenhum produto real publicado ainda — mantém os 4 exemplos do HTML.
        ligarFiltro();
        return;
      }

      visiveis.sort(function (a, b) {
        return (b.dataCriacao || '').localeCompare(a.dataCriacao || '');
      });

      grade.innerHTML = visiveis.map(cardHTML).join('');
      if (aviso) aviso.style.display = 'none'; // catálogo real já está no ar, aviso deixa de fazer sentido
      ligarFiltro();
    })
    .catch(function () {
      // Sem manifesto, sem internet ou JSON inválido: mantém os exemplos do HTML,
      // e o filtro continua funcionando igual sobre eles.
      ligarFiltro();
    });
})();
