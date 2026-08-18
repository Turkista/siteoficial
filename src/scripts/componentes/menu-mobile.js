/**
 * Menu mobile — abre/fecha em tela cheia, controla foco e scroll do body.
 * UX, seção 03 (componente de menu). Etapa 1 do Plano Mestre.
 */
(function () {
  const botaoAbrir = document.querySelector('[data-menu-abrir]');
  const botaoFechar = document.querySelector('[data-menu-fechar]');
  const menu = document.querySelector('[data-menu-mobile]');
  if (!botaoAbrir || !menu) return;

  function abrirMenu() {
    menu.classList.add('esta-aberto');
    document.body.classList.add('menu-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'true');
    const primeiroLink = menu.querySelector('a');
    if (primeiroLink) primeiroLink.focus();
  }

  function fecharMenu() {
    menu.classList.remove('esta-aberto');
    document.body.classList.remove('menu-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'false');
    botaoAbrir.focus();
  }

  botaoAbrir.addEventListener('click', abrirMenu);
  if (botaoFechar) botaoFechar.addEventListener('click', fecharMenu);

  menu.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharMenu();
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', fecharMenu);
  });
})();
