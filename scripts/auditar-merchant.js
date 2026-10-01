const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("../painel-produtos/node_modules/google-auth-library");
const { getCredentialPath, getConfig } = require("../painel-produtos/integrations/google-merchant");

const ROOT = path.join(__dirname, "..");
const PRODUCTS = path.join(ROOT, "src", "content", "produtos");

const API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

async function listarProdutosMerchant() {
  const config = getConfig();

  const auth = new GoogleAuth({
    keyFile: getCredentialPath(),
    scopes: SCOPES,
  });

  const client = await auth.getClient();

  const encontrados = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      pageSize: "250",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const url =
      `${API_BASE}/products/v1/accounts/${encodeURIComponent(config.accountId)}/products?${params}`;

    const response = await client.request({
      method: "GET",
      url,
    });

    const produtos = response.data.products || [];
    encontrados.push(...produtos);

    pageToken = response.data.nextPageToken || "";
  } while (pageToken);

  return encontrados;
}

function carregarProdutosLocais() {
  const arquivos = fs
    .readdirSync(PRODUCTS)
    .filter((f) => f.endsWith(".json") && f !== "index.json");

  const produtos = [];

  for (const arquivo of arquivos) {
    const produto = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS, arquivo), "utf8")
    );

    produtos.push({
      arquivo,
      id: produto.id,
      slug: produto.slug,
      nome: produto.nome,
    });
  }

  return produtos;
}

function extrairOfferId(resourceName) {
  if (!resourceName) return null;

  const partes = resourceName.split("/");
  return partes[partes.length - 1] || null;
}

async function main() {
  const config = getConfig();

  console.log("Turkista — auditoria Google Merchant");
  console.log(`Merchant Center: ${config.accountId}`);
  console.log(`Data Source local: ${config.dataSourceId}`);
  console.log(`Credencial: ${getCredentialPath()}`);
  console.log("");
  console.log("MODO: SOMENTE LEITURA");
  console.log("");

  const [merchantProducts, localProducts] = await Promise.all([
    listarProdutosMerchant(),
    Promise.resolve(carregarProdutosLocais()),
  ]);

  const merchantOffers = merchantProducts
    .map((produto) => {
      const offerId =
        produto.productAttributes?.offerId ||
        extrairOfferId(produto.name);

      return {
        offerId,
        name: produto.name || null,
        product: produto.product || null,
        title: produto.productAttributes?.title || null,
        itemGroupId: produto.productAttributes?.itemGroupId || null,
      };
    })
    .filter((produto) => produto.offerId);

  const merchantIds = new Set(
    merchantOffers.map((produto) => produto.offerId)
  );

  const localIds = new Set(
    localProducts.map((produto) => produto.id).filter(Boolean)
  );

  const existentes = localProducts.filter((produto) =>
    merchantIds.has(produto.id)
  );

  const novos = localProducts.filter(
    (produto) => produto.id && !merchantIds.has(produto.id)
  );

  const variantesMerchant = merchantOffers.filter(
    (produto) => produto.itemGroupId
  );

  console.log("========================================");
  console.log("RESUMO");
  console.log("========================================");
  console.log(`Produtos locais: ${localProducts.length}`);
  console.log(`Ofertas encontradas no Merchant: ${merchantOffers.length}`);
  console.log(`IDs locais já existentes: ${existentes.length}`);
  console.log(`IDs locais ainda não encontrados: ${novos.length}`);
  console.log(`Ofertas com itemGroupId: ${variantesMerchant.length}`);
  console.log("");

  console.log("========================================");
  console.log("JÁ EXISTEM");
  console.log("========================================");

  if (!existentes.length) {
    console.log("Nenhum ID local encontrado no Merchant.");
  } else {
    for (const produto of existentes) {
      console.log(`✓ ${produto.id} | ${produto.nome}`);
    }
  }

  console.log("");

  console.log("========================================");
  console.log("AINDA NÃO EXISTEM PELO ID BASE");
  console.log("========================================");

  if (!novos.length) {
    console.log("Todos os IDs locais já foram encontrados.");
  } else {
    for (const produto of novos) {
      console.log(`+ ${produto.id} | ${produto.nome}`);
    }
  }

  console.log("");

  console.log("========================================");
  console.log("OFERTAS DO MERCHANT");
  console.log("========================================");

  for (const produto of merchantOffers) {
    console.log(
      `${produto.offerId}` +
      (produto.itemGroupId ? ` | grupo: ${produto.itemGroupId}` : "") +
      ` | ${produto.title || ""}`
    );
  }

  console.log("");

  console.log("========================================");
  console.log("AUDITORIA CONCLUÍDA — NENHUMA ALTERAÇÃO FEITA");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("Falha na consulta do Merchant Center.");

  const detalhe =
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error);

  console.error(detalhe);
  process.exitCode = 1;
});
