const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");
const { normalizarProduto } = require("../catalogo-normalizacao");

const MERCHANT_API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

const DEFAULT_ACCOUNT_ID = "5859686480";
const DEFAULT_DATA_SOURCE_ID = "10749150485";
const SITE_BASE_URL = "https://www.turkista.com.br";

function getCredentialPath() {
  const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (configured) {
    const p = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);

    if (!fs.existsSync(p)) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS não aponta para um arquivo existente."
      );
    }

    return p;
  }

  const dir = path.join(__dirname, "..", "secrets");

  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((x) =>
        x.toLowerCase().endsWith(".json")
      )
    : [];

  if (files.length !== 1) {
    throw new Error(
      "Configure GOOGLE_APPLICATION_CREDENTIALS ou deixe exatamente um JSON em painel-produtos/secrets."
    );
  }

  return path.join(dir, files[0]);
}

async function request(method, url, data) {
  const auth = new GoogleAuth({
    keyFile: getCredentialPath(),
    scopes: SCOPES,
  });

  const client = await auth.getClient();

  const response = await client.request({
    method,
    url,
    data,
  });

  return response.data;
}

async function getDeveloperRegistration(accountId) {
  return request(
    "GET",
    `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(
      accountId
    )}/developerRegistration`
  );
}

async function registerGcp(accountId, developerEmail) {
  return request(
    "POST",
    `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(
      accountId
    )}/developerRegistration:registerGcp`,
    {
      developerEmail,
    }
  );
}

function getConfig() {
  return {
    accountId:
      process.env.MERCHANT_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,

    dataSourceId:
      process.env.MERCHANT_DATA_SOURCE_ID ||
      DEFAULT_DATA_SOURCE_ID,

    siteBaseUrl: (
      process.env.TURKISTA_SITE_URL ||
      SITE_BASE_URL
    ).replace(/\/$/, ""),
  };
}

function moedaMicros(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(
      "Preço inválido: informe um valor público maior que zero."
    );
  }

  return String(Math.round(numero * 1000000));
}

function caminhoImagemPublico(arquivo) {
  if (!arquivo || typeof arquivo !== "string") {
    throw new Error(
      "O produto precisa ter uma imagem principal."
    );
  }

  const relativo = arquivo
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (
    relativo.includes("..") ||
    !/^[-a-zA-Z0-9_./]+$/.test(relativo)
  ) {
    throw new Error("Caminho de imagem inválido.");
  }

  return (
    `${getConfig().siteBaseUrl}/assets/produtos/` +
    relativo
      .split("/")
      .map(encodeURIComponent)
      .join("/")
  );
}

function disponibilidade(status) {
  if (status === "esgotado") {
    return "OUT_OF_STOCK";
  }

  if (status === "publicado") {
    return "IN_STOCK";
  }

  throw new Error(
    `O produto precisa estar publicado ou esgotado para sincronizar. Status atual: ${
      status || "ausente"
    }`
  );
}

function slugVariante(valor) {
  return (
    String(valor || "unico")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "unico"
  );
}

function variantesDoProduto(produtoOriginal) {
  const produto = normalizarProduto(produtoOriginal);

  const cores =
    Array.isArray(produto.cores) &&
    produto.cores.length
      ? produto.cores
      : [
          {
            nome: "Única",
            imagens: produto.imagens || [],
          },
        ];

  const tamanhos =
    Array.isArray(produto.tamanhos) &&
    produto.tamanhos.length
      ? produto.tamanhos
      : ["OS"];

  return cores.flatMap((cor) =>
    tamanhos.map((tamanho) => ({
      cor,
      tamanho,
    }))
  );
}

function imagemDaVariante(produto, variante) {
  return (
    variante?.cor?.imagens?.[0]?.arquivo ||
    produto.imagens?.[0]?.arquivo
  );
}

function imagensAdicionais(produto, variante) {
  const imagemPrincipal = imagemDaVariante(
    produto,
    variante
  );

  const origem =
    variante?.cor?.imagens?.length
      ? variante.cor.imagens
      : produto.imagens || [];

  const arquivos = [
    ...origem.map((item) => item?.arquivo),
    ...(produto.imagens || []).map(
      (item) => item?.arquivo
    ),
  ]
    .filter(Boolean)
    .filter((arquivo) => arquivo !== imagemPrincipal);

  return [
    ...new Set(arquivos),
  ]
    .slice(0, 10)
    .map(caminhoImagemPublico);
}

function produtoParaMerchant(
  produtoOriginal,
  variante = null,
  totalVariantes = 1,
  indice = 0
) {
  const produto = normalizarProduto(
    produtoOriginal
  );

  if (!produto || typeof produto !== "object") {
    throw new Error("Produto inválido.");
  }

  if (!produto.id || !produto.slug || !produto.nome) {
    throw new Error(
      "Produto sem id, slug ou nome."
    );
  }

  if (
    !produto.preco ||
    !Number.isFinite(
      Number(produto.preco.valor)
    )
  ) {
    throw new Error(
      `O produto "${produto.slug}" não possui preço público.`
    );
  }

  if (
    !Array.isArray(produto.imagens) ||
    !produto.imagens.length
  ) {
    throw new Error(
      `O produto "${produto.slug}" não possui imagem principal.`
    );
  }

  const v =
    variante ||
    variantesDoProduto(produto)[0];

  const cor = String(
    v?.cor?.nome || "Única"
  ).trim();

  const tamanho = String(
    v?.tamanho || "OS"
  ).trim();

  const config = getConfig();

  /*
   * Regra do commit b0c28e4:
   *
   * - produto sem variantes:
   *   prod_aurora01
   *
   * - primeira variante:
   *   prod_aurora01
   *
   * - demais variantes:
   *   prod_aurora01-m-rosa-turkista
   *   prod_aurora01-g-rosa-turkista
   */
  const offerId =
    totalVariantes === 1 || indice === 0
      ? produto.id
      : `${produto.id}-${slugVariante(
          tamanho
        )}-${slugVariante(cor)}`;

  const atributos = {
  title:
    totalVariantes === 1
      ? produto.nome.trim()
      : `${produto.nome.trim()} - ${tamanho} - ${cor}`,

  description: String(
    produto.descricaoCompleta ||
      produto.descricaoCurta ||
      produto.nome
  ).trim(),

  link:
    `${config.siteBaseUrl}/produto/` +
    `${encodeURIComponent(produto.slug)}.html`,

  imageLink: caminhoImagemPublico(
    imagemDaVariante(produto, v)
  ),

  additionalImageLinks:
    imagensAdicionais(produto, v),

  availability:
    disponibilidade(produto.status),

  price: {
    amountMicros: moedaMicros(
      produto.preco.valor
    ),
    currencyCode: "BRL",
  },

  condition: "NEW",

  brand:
    produto.merchantGoogle?.brand ||
    "Turkista",

  color:
    produto.merchantGoogle?.color ||
    cor,

  gender:
    String(
      produto.merchantGoogle?.gender ||
        "female"
    ).toUpperCase(),

  ageGroup:
    String(
      produto.merchantGoogle?.ageGroup ||
        "adult"
    ).toUpperCase(),

  size: tamanho,

  sizeSystem:
    produto.merchantGoogle?.sizeSystem ||
    "BR",

  material:
    produto.merchantGoogle?.material ||
    undefined,

  pattern:
    produto.merchantGoogle?.pattern ||
    undefined,

  sizeTypes:
    produto.merchantGoogle?.sizeType
      ? [
          String(
            produto.merchantGoogle.sizeType
          ).toUpperCase(),
        ]
      : undefined,

  productHighlights:
    Array.isArray(
      produto.merchantGoogle?.productHighlights
    )
      ? produto.merchantGoogle.productHighlights
          .filter(Boolean)
          .map(String)
      : [],

  productDetails:
    Array.isArray(
      produto.merchantGoogle?.productDetails
    )
      ? produto.merchantGoogle.productDetails
      : [],
};

  if (totalVariantes > 1) {
    atributos.itemGroupId = produto.id;

    atributos.itemGroupTitle =
      produto.nome;

    atributos.variantOptions = [
      {
        name: "Size",
        value: tamanho,
      },
      {
        name: "Color",
        value: cor,
      },
    ];
  }

  return {
    offerId,
    contentLanguage: "pt",
    feedLabel: "BR",
    productAttributes: atributos,
  };
}

async function enviarInput(config, input) {
  const dataSource =
    `accounts/${config.accountId}` +
    `/dataSources/${config.dataSourceId}`;

  return request(
    "POST",
    `${MERCHANT_API_BASE}/products/v1/accounts/` +
      `${encodeURIComponent(
        config.accountId
      )}/productInputs:insert` +
      `?dataSource=${encodeURIComponent(
        dataSource
      )}`,
    input
  );
}

async function insertProduct(produto) {
  const variantes =
    variantesDoProduto(produto);

  if (variantes.length > 1) {
    throw new Error(
      "Este produto possui múltiplas variantes. Use insertProductVariants."
    );
  }

  return enviarInput(
    getConfig(),
    produtoParaMerchant(
      produto,
      variantes[0],
      1,
      0
    )
  );
}

async function insertProductVariants(produto) {
  const variantes =
    variantesDoProduto(produto);

  const resultados = [];

  for (
    let indice = 0;
    indice < variantes.length;
    indice++
  ) {
    const variante =
      variantes[indice];

    resultados.push(
      await enviarInput(
        getConfig(),
        produtoParaMerchant(
          produto,
          variante,
          variantes.length,
          indice
        )
      )
    );
  }

  return {
    offerIdBase:
      normalizarProduto(produto).id,

    totalVariantes:
      variantes.length,

    resultados,
  };
}

module.exports = {
  getCredentialPath,
  getDeveloperRegistration,
  registerGcp,
  getConfig,
  produtoParaMerchant,
  insertProduct,
  insertProductVariants,
  variantesDoProduto,
};