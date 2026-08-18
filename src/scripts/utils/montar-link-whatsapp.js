/**
 * Utilitário para montar links wa.me com mensagem pré-preenchida.
 * Base para a Etapa 5 (Ficha de Produto). Nesta fase (Etapa 3),
 * usado apenas para o CTA institucional (sem produto no contexto).
 *
 * RF03, Documento Mestre — mensagem em linguagem natural, primeira pessoa.
 */
function montarLinkWhatsApp(numero, mensagem) {
  const numeroLimpo = String(numero).replace(/\D/g, '');
  const textoCodificado = encodeURIComponent(mensagem);
  return `https://wa.me/${numeroLimpo}?text=${textoCodificado}`;
}

// Exemplo de uso institucional (sem produto):
// montarLinkWhatsApp('5521992197518', 'Oi! Vi o site da Turkista e queria saber mais sobre as peças.')

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { montarLinkWhatsApp };
}
