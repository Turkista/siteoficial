/**
 * Botão flutuante de WhatsApp — aparece após o usuário rolar além do hero.
 * UX, seção 3.11. Etapa 1 do Plano Mestre.
 */
(function () {
  const botao = document.querySelector('[data-whatsapp-flutuante]');
  if (!botao) return;

  const gatilho = document.querySelector('[data-whatsapp-gatilho]') || document.querySelector('.hero');
  const limite = gatilho ? gatilho.offsetHeight * 0.6 : 400;

  function alternarVisibilidade() {
    if (window.scrollY > limite) {
      botao.classList.add('esta-visivel');
    } else {
      botao.classList.remove('esta-visivel');
    }
  }

  window.addEventListener('scroll', alternarVisibilidade, { passive: true });
  alternarVisibilidade();
})();
