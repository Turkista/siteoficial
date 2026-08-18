/**
 * Carrinho de compras — UI (injeta ícone + gaveta em qualquer página que
 * carregue este script, e escuta cliques em [data-adicionar-carrinho]).
 *
 * Depende de carrinho.js (window.Carrinho) já carregado antes deste arquivo.
 */
(function () {
  if (!window.Carrinho) return;
  var C = window.Carrinho;

  function escapar(texto) {
    var div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  // ------------------------------------------------------------
  // Injeta o botão do carrinho no header, antes do botão de menu
  // ------------------------------------------------------------
  function injetarBotaoHeader() {
    var acoes = document.querySelector('.cabecalho__acoes');
    if (!acoes || document.querySelector('[data-carrinho-abrir]')) return;

    var botao = document.createElement('button');
    botao.className = 'carrinho-botao';
    botao.setAttribute('data-carrinho-abrir', '');
    botao.setAttribute('aria-label', 'Abrir carrinho');
    botao.setAttribute('aria-haspopup', 'true');
    botao.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>' +
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
      '</svg>' +
      '<span class="carrinho-botao__contagem" data-carrinho-contagem hidden>0</span>';

    var botaoMenu = acoes.querySelector('.cabecalho__botao-menu');
    if (botaoMenu) acoes.insertBefore(botao, botaoMenu);
    else acoes.appendChild(botao);
  }

  // ------------------------------------------------------------
  // Injeta a gaveta (drawer) + overlay no final do <body>
  // ------------------------------------------------------------
  function injetarGaveta() {
    if (document.getElementById('carrinho-gaveta')) return;

    var overlay = document.createElement('div');
    overlay.className = 'carrinho-overlay';
    overlay.setAttribute('data-carrinho-overlay', '');

    var gaveta = document.createElement('aside');
    gaveta.id = 'carrinho-gaveta';
    gaveta.className = 'carrinho-gaveta';
    gaveta.setAttribute('role', 'dialog');
    gaveta.setAttribute('aria-label', 'Carrinho de compras');
    gaveta.innerHTML =
      '<div class="carrinho-gaveta__topo">' +
        '<h2>Seu carrinho</h2>' +
        '<button class="carrinho-gaveta__fechar" data-carrinho-fechar aria-label="Fechar carrinho">&times;</button>' +
      '</div>' +
      '<div class="carrinho-gaveta__lista" data-carrinho-lista></div>' +
      '<div class="carrinho-gaveta__rodape" data-carrinho-rodape>' +
        '<div class="carrinho-gaveta__total">' +
          '<span>Total</span>' +
          '<strong data-carrinho-total>R$ 0,00</strong>' +
        '</div>' +
        '<a class="botao botao--primario carrinho-gaveta__finalizar" data-carrinho-finalizar target="_blank" rel="noopener">Finalizar Compra pelo WhatsApp</a>' +
        '<button class="botao--texto carrinho-gaveta__limpar" data-carrinho-limpar>Esvaziar carrinho</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(gaveta);
  }

  // ------------------------------------------------------------
  // Renderização
  // ------------------------------------------------------------
  function renderizar() {
    var itens = C.obterCarrinho();

    var contagemEl = document.querySelector('[data-carrinho-contagem]');
    if (contagemEl) {
      var totalItens = C.calcularTotalItens(itens);
      contagemEl.textContent = totalItens;
      contagemEl.hidden = totalItens === 0;
    }

    var listaEl = document.querySelector('[data-carrinho-lista]');
    var rodapeEl = document.querySelector('[data-carrinho-rodape]');
    if (!listaEl) return;

    if (itens.length === 0) {
      listaEl.innerHTML = '<p class="carrinho-gaveta__vazio">Seu carrinho está vazio. Adicione peças pelo catálogo ou pela ficha do produto.</p>';
      if (rodapeEl) rodapeEl.hidden = true;
      return;
    }

    if (rodapeEl) rodapeEl.hidden = false;

    listaEl.innerHTML = itens.map(function (item) {
      var chave = C.chaveItem(item);
      var detalhes = [item.tamanho, item.cor].filter(Boolean).join(' · ');
      var precoTxt = typeof item.precoUnit === 'number' ? C.formatarMoeda(item.precoUnit) : 'Sob consulta';
      return (
        '<div class="carrinho-item" data-carrinho-item="' + escapar(chave) + '">' +
          '<div class="carrinho-item__info">' +
            '<p class="carrinho-item__nome">' + escapar(item.nome) + '</p>' +
            (detalhes ? '<p class="carrinho-item__detalhes">' + escapar(detalhes) + '</p>' : '') +
            '<p class="carrinho-item__preco">' + escapar(precoTxt) + '</p>' +
          '</div>' +
          '<div class="carrinho-item__acoes">' +
            '<div class="carrinho-item__qtd">' +
              '<button data-carrinho-qtd-menos aria-label="Diminuir quantidade">&minus;</button>' +
              '<span>' + item.qtd + '</span>' +
              '<button data-carrinho-qtd-mais aria-label="Aumentar quantidade">+</button>' +
            '</div>' +
            '<button class="carrinho-item__remover" data-carrinho-remover aria-label="Remover item">Remover</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var totalEl = document.querySelector('[data-carrinho-total]');
    if (totalEl) totalEl.textContent = C.formatarMoeda(C.calcularTotalValor(itens));

    var finalizarEl = document.querySelector('[data-carrinho-finalizar]');
    if (finalizarEl) finalizarEl.href = C.linkFinalizarCompra(itens);
  }

  // ------------------------------------------------------------
  // Abrir / fechar gaveta
  // ------------------------------------------------------------
  function abrirGaveta() {
    document.getElementById('carrinho-gaveta').classList.add('esta-aberta');
    document.querySelector('[data-carrinho-overlay]').classList.add('esta-visivel');
    document.body.classList.add('carrinho-aberto');
  }

  function fecharGaveta() {
    var gaveta = document.getElementById('carrinho-gaveta');
    var overlay = document.querySelector('[data-carrinho-overlay]');
    if (gaveta) gaveta.classList.remove('esta-aberta');
    if (overlay) overlay.classList.remove('esta-visivel');
    document.body.classList.remove('carrinho-aberto');
  }

  // ------------------------------------------------------------
  // Feedback rápido no ícone quando um item é adicionado
  // ------------------------------------------------------------
  function pulsarIcone() {
    var botao = document.querySelector('[data-carrinho-abrir]');
    if (!botao) return;
    botao.classList.remove('carrinho-botao--pulso');
    // força reflow pra reiniciar a animação mesmo em cliques seguidos
    void botao.offsetWidth;
    botao.classList.add('carrinho-botao--pulso');
  }

  // ------------------------------------------------------------
  // Lê os dados de um botão "Adicionar ao carrinho"
  // ------------------------------------------------------------
  function lerItemDoBotao(botao) {
    var precoAttr = botao.getAttribute('data-preco');
    return {
      slug: botao.getAttribute('data-slug') || '',
      nome: botao.getAttribute('data-nome') || '',
      linha: botao.getAttribute('data-linha') || '',
      tamanho: botao.getAttribute('data-tamanho') || '',
      cor: botao.getAttribute('data-cor') || '',
      precoUnit: precoAttr ? parseFloat(precoAttr) : null,
    };
  }

  // ------------------------------------------------------------
  // Eventos (delegação — funciona em cards renderizados dinamicamente)
  // ------------------------------------------------------------
  function ligarEventos() {
    document.addEventListener('click', function (evento) {
      var botaoAdicionar = evento.target.closest('[data-adicionar-carrinho]');
      if (botaoAdicionar) {
        // Cards de catálogo/destaque são <a> inteiros — impede navegar pro
        // produto quando o clique foi no botão de adicionar rápido.
        evento.preventDefault();
        evento.stopPropagation();
        var item = lerItemDoBotao(botaoAdicionar);
        if (!item.slug || !item.nome) return;
        var qtdAttr = botaoAdicionar.getAttribute('data-quantidade');
        C.adicionarItem(item, qtdAttr ? parseInt(qtdAttr, 10) : 1);
        pulsarIcone();
        return;
      }

      if (evento.target.closest('[data-carrinho-abrir]')) {
        abrirGaveta();
        return;
      }
      if (evento.target.closest('[data-carrinho-fechar]') || evento.target.closest('[data-carrinho-overlay]')) {
        fecharGaveta();
        return;
      }
      if (evento.target.closest('[data-carrinho-limpar]')) {
        if (confirm('Esvaziar o carrinho?')) C.limparCarrinho();
        return;
      }

      var linhaItem = evento.target.closest('[data-carrinho-item]');
      if (!linhaItem) return;
      var chave = linhaItem.getAttribute('data-carrinho-item');
      var itemAtual = C.obterCarrinho().filter(function (i) { return C.chaveItem(i) === chave; })[0];
      if (!itemAtual) return;

      if (evento.target.closest('[data-carrinho-qtd-mais]')) {
        C.alterarQtd(chave, itemAtual.qtd + 1);
      } else if (evento.target.closest('[data-carrinho-qtd-menos]')) {
        C.alterarQtd(chave, itemAtual.qtd - 1);
      } else if (evento.target.closest('[data-carrinho-remover]')) {
        C.removerItem(chave);
      }
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') fecharGaveta();
    });

    document.addEventListener('carrinho:atualizado', renderizar);
  }

  function iniciar() {
    injetarBotaoHeader();
    injetarGaveta();
    ligarEventos();
    renderizar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
