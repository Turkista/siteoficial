/* ============================================================
   COMPONENTE — Artigos dinâmicos da Revista Turkista (blog.html)
   Substitui o filtro-blog.js estático.

   Diferente do catalogo-dinamico.js (que troca os exemplos por
   produtos reais), aqui os 9 artigos originais já são conteúdo
   real e aprovado — então este script só ACRESCENTA os artigos
   novos criados no painel local (painel-produtos/server.js) à
   grade que já existe, sem remover nada.
   ============================================================ */
(function () {
  var grade = document.getElementById('grade-artigos') || document.querySelector('.grade-blog');
  if (!grade) return;

  var NOMES_CATEGORIA = {
    'guia-de-cuidados': 'Guia de Cuidados',
    'tecido-tecnologia': 'Tecido & Tecnologia',
    'estilo': 'Estilo',
    'treino-performance': 'Treino & Performance',
    'bastidores': 'Bastidores',
  };

  function escapar(texto) {
    var div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  function cardHTML(artigo) {
    var categoriaLabel = NOMES_CATEGORIA[artigo.categoria] || artigo.categoria;
    return (
      '<a href="blog/' + encodeURIComponent(artigo.slug) + '.html" class="card-artigo" data-categoria-artigo="' + escapar(artigo.categoria) + '">' +
        '<div class="card-artigo__imagem">' +
          '<img src="assets/blog/' + escapar(artigo.capa && artigo.capa.arquivo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<span class="card-artigo__categoria">' + escapar(categoriaLabel) + '</span>' +
        '<h3 class="card-artigo__titulo">' + escapar(artigo.titulo) + '</h3>' +
        '<p class="card-artigo__resumo">' + escapar(artigo.resumo) + '</p>' +
        '<span class="card-artigo__link">Ler artigo' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</span>' +
      '</a>'
    );
  }

  function ligarFiltro() {
    var botoes = document.querySelectorAll('[data-filtro-categoria]');
    var cards = document.querySelectorAll('[data-categoria-artigo]');
    if (!botoes.length || !cards.length) return;

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        var categoria = botao.getAttribute('data-filtro-categoria');
        botoes.forEach(function (b) {
          b.setAttribute('aria-pressed', b === botao ? 'true' : 'false');
        });
        cards.forEach(function (card) {
          var pertence = categoria === 'todos' || card.getAttribute('data-categoria-artigo') === categoria;
          card.hidden = !pertence;
        });
      });
    });
  }

  fetch('src/content/artigos/index.json')
    .then(function (resposta) {
      if (!resposta.ok) throw new Error('manifesto indisponível');
      return resposta.json();
    })
    .then(function (artigos) {
      var publicados = (artigos || []).filter(function (a) {
        return a.status === 'publicado';
      });
      publicados.sort(function (a, b) {
        return (b.dataCriacao || '').localeCompare(a.dataCriacao || '');
      });
      // Acrescenta ao final da grade — os 9 artigos originais do HTML continuam intactos
      grade.insertAdjacentHTML('beforeend', publicados.map(cardHTML).join(''));
      ligarFiltro();
    })
    .catch(function () {
      // Sem manifesto/internet: só liga o filtro sobre os 9 artigos originais.
      ligarFiltro();
    });
})();
