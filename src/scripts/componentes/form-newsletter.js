/**
 * Feedback visual do formulário de newsletter (Home, UX 8.1).
 * Envio do e-mail para uma planilha do Google Sheets via Google Apps Script.
 */
(function () {
  // Cole aqui a URL de implantação do Apps Script (ver instruções enviadas
  // pelo Claude). Ex: "https://script.google.com/macros/s/AKfycb.../exec"
  const URL_SCRIPT_NEWSLETTER = 'https://script.google.com/macros/s/AKfycby0GEPSCnistzGqi27GbfNwpliPAAf2ujzNxSU0pUigwXIbR9gcvCY4kS4XNHQVJ-69Og/exec';

  const formulario = document.querySelector('[data-newsletter]');
  if (!formulario) return;

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    const botao = formulario.querySelector('button[type="submit"]');
    const textoOriginal = botao.textContent;
    const email = formulario.querySelector('#email-newsletter').value;

    botao.classList.add('botao--carregando');

    const dados = new URLSearchParams();
    dados.append('email', email);

    fetch(URL_SCRIPT_NEWSLETTER, {
      method: 'POST',
      mode: 'no-cors',
      body: dados
    })
      .catch(function (erro) {
        console.error('Erro ao enviar e-mail para a planilha:', erro);
      })
      .finally(function () {
        botao.classList.remove('botao--carregando');
        botao.textContent = 'Recebido! ✓';
        formulario.reset();
        setTimeout(() => { botao.textContent = textoOriginal; }, 2500);
      });
  });
})();
