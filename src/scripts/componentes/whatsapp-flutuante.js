/**
 * Botão flutuante de WhatsApp — aparece quando o hero deixa de ocupar
 * a maior parte da área visível, sem leitura geométrica forçada no carregamento.
 */
(function () {
  const botao = document.querySelector('[data-whatsapp-flutuante]');
  if (!botao) return;

  const gatilho = document.querySelector('[data-whatsapp-gatilho]') || document.querySelector('.hero');

  function definirVisibilidade(visivel) {
    botao.classList.toggle('esta-visivel', visivel);
  }

  if (gatilho && 'IntersectionObserver' in window) {
    const observador = new IntersectionObserver((entradas) => {
      const entrada = entradas[0];
      // Exibe o botão quando menos de 40% do hero permanece visível.
      definirVisibilidade(!entrada.isIntersecting || entrada.intersectionRatio <= 0.4);
    }, { threshold: [0, 0.4, 1] });
    observador.observe(gatilho);
  } else {
    // Fallback simples para navegadores sem IntersectionObserver.
    const limite = 400;
    let quadroPendente = false;
    function verificarRolagem() {
      if (quadroPendente) return;
      quadroPendente = true;
      window.requestAnimationFrame(() => {
        definirVisibilidade(window.scrollY > limite);
        quadroPendente = false;
      });
    }
    window.addEventListener('scroll', verificarRolagem, { passive: true });
    verificarRolagem();
  }

  // Rastreamento GA4 do WhatsApp flutuante
  botao.addEventListener('click', () => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'whatsapp_click', { origem: 'flutuante' });
  });
})();
