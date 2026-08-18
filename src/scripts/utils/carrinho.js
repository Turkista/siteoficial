/**
 * Carrinho de compras — núcleo de dados.
 *
 * O site é estático e multi-página (sem SPA), então o carrinho precisa
 * sobreviver à navegação entre catalogo.html, produto/*.html etc. — por
 * isso o estado mora em localStorage, não em memória.
 *
 * Não faz checkout tradicional: o botão "Finalizar Compra" (ver
 * carrinho-ui.js) monta uma mensagem de WhatsApp com os itens, quantidades
 * e o total, e abre o wa.me — o fechamento continua 100% humano, como já
 * era com o CTA de produto único.
 */
(function (global) {
  var CHAVE_ARMAZENAMENTO = 'turkista_carrinho';
  var WHATSAPP_NUMERO = '5521992197518'; // mesmo número já usado no resto do site

  function obterCarrinho() {
    try {
      var dado = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      var itens = dado ? JSON.parse(dado) : [];
      return Array.isArray(itens) ? itens : [];
    } catch (erro) {
      return [];
    }
  }

  function salvarCarrinho(itens) {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(itens));
    } catch (erro) {
      // localStorage indisponível (modo privado, quota etc.) — o carrinho
      // simplesmente não persiste entre páginas, mas não quebra a página atual.
    }
    document.dispatchEvent(new CustomEvent('carrinho:atualizado', { detail: { itens: itens } }));
  }

  // Duas linhas do carrinho são "a mesma peça" se slug + tamanho + cor
  // baterem — permite pedir o mesmo produto em tamanhos/cores diferentes
  // como itens separados.
  function chaveItem(item) {
    return [item.slug, item.tamanho || '', item.cor || ''].join('__');
  }

  function adicionarItem(item, quantidade) {
    quantidade = quantidade || 1;
    var itens = obterCarrinho();
    var chave = chaveItem(item);
    var existente = null;
    for (var i = 0; i < itens.length; i++) {
      if (chaveItem(itens[i]) === chave) { existente = itens[i]; break; }
    }
    if (existente) {
      existente.qtd += quantidade;
    } else {
      itens.push({
        slug: item.slug,
        nome: item.nome,
        linha: item.linha || '',
        tamanho: item.tamanho || '',
        cor: item.cor || '',
        precoUnit: typeof item.precoUnit === 'number' ? item.precoUnit : null,
        qtd: quantidade,
      });
    }
    salvarCarrinho(itens);
    return itens;
  }

  function alterarQtd(chave, novaQtd) {
    var itens = obterCarrinho();
    if (novaQtd <= 0) {
      itens = itens.filter(function (i) { return chaveItem(i) !== chave; });
    } else {
      itens = itens.map(function (i) {
        return chaveItem(i) === chave ? Object.assign({}, i, { qtd: novaQtd }) : i;
      });
    }
    salvarCarrinho(itens);
    return itens;
  }

  function removerItem(chave) {
    return alterarQtd(chave, 0);
  }

  function limparCarrinho() {
    salvarCarrinho([]);
  }

  function calcularTotalItens(itens) {
    itens = itens || obterCarrinho();
    return itens.reduce(function (soma, i) { return soma + i.qtd; }, 0);
  }

  function calcularTotalValor(itens) {
    itens = itens || obterCarrinho();
    return itens.reduce(function (soma, i) {
      return soma + i.qtd * (typeof i.precoUnit === 'number' ? i.precoUnit : 0);
    }, 0);
  }

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function montarMensagemWhatsApp(itens) {
    itens = itens || obterCarrinho();
    if (!itens.length) return '';

    var linhas = itens.map(function (i) {
      var detalhes = [];
      if (i.tamanho) detalhes.push('tamanho ' + i.tamanho);
      if (i.cor) detalhes.push(i.cor);
      var sufixo = detalhes.length ? ' (' + detalhes.join(', ') + ')' : '';
      var precoTxt = typeof i.precoUnit === 'number' ? ' — ' + formatarMoeda(i.precoUnit * i.qtd) : '';
      return i.qtd + 'x ' + i.nome + sufixo + precoTxt;
    });

    var mensagem = 'Oi! Quero fazer este pedido na Turkista:\n\n' + linhas.join('\n');
    var total = calcularTotalValor(itens);
    var algumSemPreco = itens.some(function (i) { return typeof i.precoUnit !== 'number'; });
    if (total > 0) {
      mensagem += '\n\nTotal' + (algumSemPreco ? ' (parcial, tem item sem preço)' : '') + ': ' + formatarMoeda(total);
    }
    return mensagem;
  }

  function linkFinalizarCompra(itens) {
    itens = itens || obterCarrinho();
    var mensagem = montarMensagemWhatsApp(itens);
    return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensagem);
  }

  global.Carrinho = {
    obterCarrinho: obterCarrinho,
    adicionarItem: adicionarItem,
    alterarQtd: alterarQtd,
    removerItem: removerItem,
    limparCarrinho: limparCarrinho,
    calcularTotalItens: calcularTotalItens,
    calcularTotalValor: calcularTotalValor,
    formatarMoeda: formatarMoeda,
    montarMensagemWhatsApp: montarMensagemWhatsApp,
    linkFinalizarCompra: linkFinalizarCompra,
    chaveItem: chaveItem,
  };
})(window);
