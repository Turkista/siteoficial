const CATEGORIAS = Object.freeze({
  "Biquíni parte superior": "Biquíni Parte Superior",
  "Biquíni": "Biquíni",
  "Biquini": "Biquíni",
  "Conjunto": "Conjunto",
  "Cropped": "Cropped",
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

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function normalizarCategoria(categoria) {
  const valor = normalizarTexto(categoria);
  return CATEGORIAS[valor] || valor;
}

function obterCorPrincipal(produto) {
  if (!Array.isArray(produto.cores) || !produto.cores.length) {
    return "";
  }

  return normalizarTexto(produto.cores[0]?.nome);
}

function obterTamanhos(produto) {
  if (!Array.isArray(produto.tamanhos)) {
    return [];
  }

  return produto.tamanhos
    .map(normalizarTexto)
    .filter(Boolean);
}

function obterMaterial(produto) {
  const tecido = normalizarTexto(produto.composicao?.tecido);

  if (!tecido || /^PREENCHER/i.test(tecido)) {
    return "";
  }

  return tecido;
}

function obterPattern(produto) {
  const texto = [
    produto.nome,
    produto.descricaoCurta,
    produto.descricaoCompleta,
    ...(Array.isArray(produto.tags) ? produto.tags : [])
  ]
    .map(normalizarTexto)
    .join(" ")
    .toLowerCase();

  const padroes = [
    ["animal print", "animal print"],
    ["floral", "floral"],
    ["marmoriz", "marmorizado"],
    ["patchwork", "patchwork"],
    ["mandala", "mandala"],
    ["listrad", "listrado"],
    ["poá", "poá"],
    ["geometr", "geométrico"]
  ];

  const encontrado = padroes.find(([chave]) => texto.includes(chave));

  return encontrado ? encontrado[1] : "";
}

function obterDestaques(produto) {
  const descricao = normalizarTexto(
    produto.descricaoCompleta || produto.descricaoCurta
  );

  if (!descricao) {
    return [];
  }

  return descricao
    .split(/[.!?]+/)
    .map((frase) => frase.trim())
    .filter(
      (frase) =>
        frase.length >= 12 &&
        frase.length <= 180
    )
    .slice(0, 5);
}

function obterDetalhes(produto) {
  const detalhes = [];

  const material = obterMaterial(produto);
  const cor = obterCorPrincipal(produto);
  const tamanhos = obterTamanhos(produto);
  const pattern = obterPattern(produto);

  if (material) {
    detalhes.push({
      sectionName: "Informações do produto",
      attributeName: "Material",
      attributeValue: material,
    });
  }

  if (cor && !/^única?$/i.test(cor)) {
    detalhes.push({
      sectionName: "Informações do produto",
      attributeName: "Cor",
      attributeValue: cor,
    });
  }

  if (pattern) {
    detalhes.push({
      sectionName: "Informações do produto",
      attributeName: "Estampa",
      attributeValue: pattern,
    });
  }

  if (tamanhos.length) {
    detalhes.push({
      sectionName: "Informações do produto",
      attributeName: "Tamanhos disponíveis",
      attributeValue: tamanhos.join(", "),
    });
  }

  return detalhes;
}
function normalizarProduto(produto) {
  if (!produto || typeof produto !== "object") {
    return produto;
  }

  const tamanhos = obterTamanhos(produto);
  const cor = obterCorPrincipal(produto);
  const material = obterMaterial(produto);
  const pattern = obterPattern(produto);

  return {
    ...produto,

    categoria: normalizarCategoria(produto.categoria),

    genero: normalizarTexto(produto.genero) || "feminino",

    faixaEtaria:
      normalizarTexto(produto.faixaEtaria) || "15+",

    merchantGoogle: {
      ...(produto.merchantGoogle || {}),

      brand:
        normalizarTexto(produto.merchantGoogle?.brand) ||
        "Turkista",

      gender:
        normalizarTexto(produto.merchantGoogle?.gender) ||
        "female",

      ageGroup:
        normalizarTexto(produto.merchantGoogle?.ageGroup) ||
        "adult",

      sizeSystem:
        normalizarTexto(produto.merchantGoogle?.sizeSystem) ||
        "BR",

      sizeType:
        normalizarTexto(produto.merchantGoogle?.sizeType) ||
        "regular",

      color:
        normalizarTexto(produto.merchantGoogle?.color) ||
        cor,

      size:
        normalizarTexto(produto.merchantGoogle?.size) ||
        (tamanhos.length === 1 ? tamanhos[0] : ""),

      availableSizes:
        Array.isArray(produto.merchantGoogle?.availableSizes)
          ? produto.merchantGoogle.availableSizes
          : tamanhos,

      material:
        normalizarTexto(produto.merchantGoogle?.material) ||
        material,

      pattern:
        normalizarTexto(produto.merchantGoogle?.pattern) ||
        pattern,

      itemGroupId:
        normalizarTexto(produto.merchantGoogle?.itemGroupId) ||
        normalizarTexto(produto.id),

      itemGroupTitle:
        normalizarTexto(produto.merchantGoogle?.itemGroupTitle) ||
        normalizarTexto(produto.nome),

      variantDimensions:
        Array.isArray(produto.merchantGoogle?.variantDimensions)
          ? produto.merchantGoogle.variantDimensions
          : (tamanhos.length > 1 ? ["size"] : []),

      productHighlights:
        Array.isArray(produto.merchantGoogle?.productHighlights) &&
        produto.merchantGoogle.productHighlights.length
          ? produto.merchantGoogle.productHighlights
          : obterDestaques(produto),

      productDetails:
        Array.isArray(produto.merchantGoogle?.productDetails) &&
        produto.merchantGoogle.productDetails.length
          ? produto.merchantGoogle.productDetails
          : obterDetalhes(produto)
    }
  };
}

module.exports = {
  CATEGORIAS,
  normalizarCategoria,
  normalizarProduto
};