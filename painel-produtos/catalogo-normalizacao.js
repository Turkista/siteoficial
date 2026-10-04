const CATEGORIAS = Object.freeze({
  "Biquíni parte superior": "Biquíni Parte Superior",
  "biquíni": "Biquíni",
  "Biquíni": "Biquíni",
  "Biquíni ": "Biquíni",
  "Biquini": "Biquíni",
  "Conjunto": "Conjunto",
  "Conjunto ": "Conjunto",
  "Cropped": "Cropped",
  "cropped": "Cropped",
  "Blusa": "Blusa",
  "legging": "Legging",
  "Legging": "Legging",
  "maiô": "Maiô",
  "Maiô": "Maiô",
  "Sunquíni": "Sunquíni",
  "sunquíni": "Sunquíni",
  "Top": "Top",
  "top": "Top",
  "acessório de cabelo": "Acessório de Cabelo",
  "Acessório de Cabelo": "Acessório de Cabelo",
  "Linha Academia": "Linha Academia"
});

function normalizarCategoria(categoria) {
  const valor = String(categoria || "").trim();
  return CATEGORIAS[valor] || valor;
}

function normalizarProduto(produto) {
  return {
    ...produto,
    categoria: normalizarCategoria(produto.categoria),
    genero: produto.genero || "feminino",
    faixaEtaria: produto.faixaEtaria || "15+"
  };
}

module.exports = { CATEGORIAS, normalizarCategoria, normalizarProduto };
