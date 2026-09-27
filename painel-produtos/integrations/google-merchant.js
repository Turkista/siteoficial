const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

const MERCHANT_API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

const DEFAULT_ACCOUNT_ID = "5859686480";
const DEFAULT_DATA_SOURCE_ID = "10749150485";
const SITE_BASE_URL = "https://www.turkista.com.br";

function getCredentialPath() {
  const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (configured) {
    const p = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
    if (!fs.existsSync(p)) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS não aponta para um arquivo existente.");
    }
    return p;
  }

  const dir = path.join(__dirname, "..", "secrets");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".json"))
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
    `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(accountId)}/developerRegistration`
  );
}

async function registerGcp(accountId, developerEmail) {
  return request(
    "POST",
    `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(accountId)}/developerRegistration:registerGcp`,
    { developerEmail }
  );
}

function getConfig() {
  return {
    accountId: process.env.MERCHANT_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
    dataSourceId: process.env.MERCHANT_DATA_SOURCE_ID || DEFAULT_DATA_SOURCE_ID,
    siteBaseUrl: (process.env.TURKISTA_SITE_URL || SITE_BASE_URL).replace(/\/$/, ""),
  };
}

function moedaMicros(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error("Preço inválido: informe um valor público maior que zero.");
  }
  return String(Math.round(numero * 1000000));
}

function caminhoImagemPublico(arquivo) {
  if (!arquivo || typeof arquivo !== "string") {
    throw new Error("O produto precisa ter uma imagem principal.");
  }

  const relativo = arquivo.replace(/\\/g, "/").replace(/^\/+/, "");
  if (relativo.includes("..") || !/^[-a-zA-Z0-9_./]+$/.test(relativo)) {
    throw new Error("Caminho de imagem inválido.");
  }

  return `${getConfig().siteBaseUrl}/assets/produtos/${relativo}`;
}

function disponibilidade(status) {
  if (status === "esgotado") return "OUT_OF_STOCK";
  if (status === "publicado") return "IN_STOCK";
  throw new Error(`O produto precisa estar publicado ou esgotado para sincronizar. Status atual: ${status || "ausente"}`);
}

function produtoParaMerchant(produto) {
  if (!produto || typeof produto !== "object") {
    throw new Error("Produto inválido.");
  }

  if (!produto.id || !produto.slug || !produto.nome) {
    throw new Error("Produto sem id, slug ou nome.");
  }

  if (!produto.preco || !Number.isFinite(Number(produto.preco.valor))) {
    throw new Error(
      `O produto "${produto.slug}" não possui preço público. O campo preco é obrigatório para o Merchant.`
    );
  }

  if (!Array.isArray(produto.imagens) || !produto.imagens.length) {
    throw new Error(`O produto "${produto.slug}" não possui imagem principal.`);
  }

  const imagem = produto.imagens[0];
  const descricao = String(
    produto.descricaoCompleta || produto.descricaoCurta || produto.nome
  ).trim();

  const config = getConfig();

  return {
    offerId: produto.id,
    contentLanguage: "pt",
    feedLabel: "BR",
    productAttributes: {
      title: String(produto.nome).trim(),
      description: descricao,
      link: `${config.siteBaseUrl}/produto/${encodeURIComponent(produto.slug)}.html`,
      imageLink: caminhoImagemPublico(imagem.arquivo),
      availability: disponibilidade(produto.status),
      price: {
        amountMicros: moedaMicros(produto.preco.valor),
        currencyCode: "BRL",
      },
      condition: "NEW",
      brand: "Turkista",
    },
  };
}

async function insertProduct(produto) {
  const config = getConfig();
  const dataSource =
    `accounts/${config.accountId}/dataSources/${config.dataSourceId}`;

  return request(
    "POST",
    `${MERCHANT_API_BASE}/products/v1/accounts/${encodeURIComponent(config.accountId)}/productInputs:insert?dataSource=${encodeURIComponent(dataSource)}`,
    produtoParaMerchant(produto)
  );
}

module.exports = {
  getCredentialPath,
  getDeveloperRegistration,
  registerGcp,
  getConfig,
  produtoParaMerchant,
  insertProduct,
};
