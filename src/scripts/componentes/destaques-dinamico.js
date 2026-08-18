/* ============================================================
   COMPONENTE — Produtos em Destaque dinâmico (index.html)
   Mesmo princípio do catalogo-dinamico.js: busca o manifesto de
   produtos e, se houver peças reais publicadas, troca os 4 cards
   de exemplo pelos produtos reais mais recentes (até 4). Sem
   produtos publicados, ou sem conseguir carregar o manifesto,
   mantém os 4 cards de exemplo que já estão no HTML.
   ============================================================ */
(function () {
  var grade = document.getElementById('grade-produtos-destaque');
  var aviso = document.getElementById('aviso-produtos-destaque');
  if (!grade) return;

  var MAXIMO_DESTAQUES = 4;

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
    var botaoAdicionarHTML = (produto.status === 'publicado' && preco)
      ? '<button class="card-produto__adicionar" data-adicionar-carrinho' +
          ' data-slug="' + escapar(produto.slug) + '"' +
          ' data-nome="' + escapar(produto.nome) + '"' +
          ' data-linha="' + escapar(produto.linha) + '"' +
          ' data-preco="' + preco + '">Adicionar ao carrinho</button>'
      : '';

    return (
      '<div class="card-produto">' +
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

  fetch('src/content/produtos/index.json')
    .then(function (resposta) {
      if (!resposta.ok) throw new Error('manifesto indisponível');
      return resposta.json();
    })
    .then(function (produtos) {
      var publicados = (produtos || []).filter(function (p) {
        return p.status === 'publicado';
      });

      if (publicados.length === 0) return; // mantém os 4 exemplos do HTML

      publicados.sort(function (a, b) {
        return (b.dataCriacao || '').localeCompare(a.dataCriacao || '');
      });

      var destaques = publicados.slice(0, MAXIMO_DESTAQUES);
      grade.innerHTML = destaques.map(cardHTML).join('');
      if (aviso) aviso.style.display = 'none';
    })
    .catch(function () {
      // Sem manifesto/internet: mantém os 4 exemplos do HTML, sem quebrar nada.
    });
})();
