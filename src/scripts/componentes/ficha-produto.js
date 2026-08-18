/**
 * Ficha de Produto — interatividade client-side (Etapa 5 do Plano Mestre).
 * Três comportamentos independentes, cada um degrada bem sem JS
 * (a imagem principal e o primeiro tamanho/cor continuam visíveis
 * mesmo se o script não rodar):
 *   1. Miniaturas trocam a imagem principal.
 *   2. Seletor de cor troca a imagem principal e o nome exibido.
 *   3. Seletor de tamanho alterna estado visual (aria-pressed) e também
 *      atualiza o tamanho/cor guardados no botão "Adicionar ao carrinho"
 *      (ver carrinho.js/carrinho-ui.js) e no texto pré-preenchido do
 *      CTA de WhatsApp.
 */
(function () {
  const imagemPrincipal = document.querySelector('[data-imagem-principal] img');
  const botaoCarrinho = document.querySelector('[data-adicionar-carrinho]');

  // ---------- Adicionar ao carrinho: exige tamanho, quando a peça tiver ----------
  // O botão nasce sem carrinho.js/carrinho-ui.js sabendo qual tamanho foi
  // escolhido — este listener roda ANTES do listener global em
  // carrinho-ui.js (que está no document, então dispara na fase de bolha,
  // depois deste) e usa stopPropagation pra bloquear a adição quando falta
  // escolher o tamanho.
  if (botaoCarrinho) {
    const temSeletorTamanho = !!document.querySelector('[data-seletor-tamanho]');
    botaoCarrinho.addEventListener('click', (evento) => {
      if (temSeletorTamanho && !botaoCarrinho.getAttribute('data-tamanho')) {
        evento.preventDefault();
        evento.stopPropagation();
        const seletor = document.querySelector('[data-seletor-tamanho]');
        if (seletor) seletor.classList.add('seletor-tamanho__opcoes--erro');
        alert('Escolha um tamanho antes de adicionar ao carrinho.');
      }
    });
  }

  if (!imagemPrincipal) return;

  // ---------- Miniaturas ----------
  const miniaturas = document.querySelectorAll('[data-miniatura]');
  miniaturas.forEach((botao) => {
    botao.addEventListener('click', () => {
      const imgMiniatura = botao.querySelector('img');
      if (!imgMiniatura || !imgMiniatura.src) return;
      imagemPrincipal.src = imgMiniatura.src;
      imagemPrincipal.alt = imgMiniatura.alt;
      imagemPrincipal.style.display = '';
      miniaturas.forEach((b) => b.setAttribute('aria-current', 'false'));
      botao.setAttribute('aria-current', 'true');
    });
  });

  // ---------- Seletor de cor ----------
  const botoesCor = document.querySelectorAll('[data-seletor-cor] .seletor-cor__opcao');
  const nomeCorAtual = document.querySelector('[data-cor-nome-atual]');
  botoesCor.forEach((botao) => {
    botao.addEventListener('click', () => {
      botoesCor.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      botao.setAttribute('aria-pressed', 'true');
      if (nomeCorAtual) nomeCorAtual.textContent = botao.getAttribute('data-cor') || '';
      if (botaoCarrinho) botaoCarrinho.setAttribute('data-cor', botao.getAttribute('data-cor') || '');
      // Nesta fase (4 produtos de exemplo, Etapa 2) cada cor tem uma
      // única imagem já usada como capa — quando o catálogo real tiver
      // fotos por cor (Etapa 4), este ponto passa a trocar a galeria
      // inteira, não só o nome exibido.
    });
  });

  // ---------- Seletor de tamanho ----------
  const botoesTamanho = document.querySelectorAll('[data-seletor-tamanho] .seletor-tamanho__opcao');
  botoesTamanho.forEach((botao) => {
    botao.addEventListener('click', () => {
      botoesTamanho.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      botao.setAttribute('aria-pressed', 'true');

      if (botaoCarrinho) {
        botaoCarrinho.setAttribute('data-tamanho', botao.getAttribute('data-tamanho') || '');
        const seletor = document.querySelector('[data-seletor-tamanho]');
        if (seletor) seletor.classList.remove('seletor-tamanho__opcoes--erro');
      }

      // Reflete o tamanho escolhido na mensagem pré-preenchida do WhatsApp,
      // sem exigir que a cliente digite o tamanho de novo na conversa.
      const ctaWhatsapp = document.querySelector('.ficha-produto__cta a[href*="wa.me"]');
      if (ctaWhatsapp) {
        const tamanho = botao.getAttribute('data-tamanho');
        const url = new URL(ctaWhatsapp.href);
        let texto = url.searchParams.get('text') || '';
        texto = texto.replace(/ \(tamanho [^)]*\)/i, '');
        url.searchParams.set('text', `${texto} (tamanho ${tamanho})`);
        ctaWhatsapp.href = url.toString();
      }
    });
  });
})();
