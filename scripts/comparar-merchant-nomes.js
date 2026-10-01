const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("../painel-produtos/node_modules/google-auth-library");
const { getCredentialPath, getConfig } = require("../painel-produtos/integrations/google-merchant");

const ROOT = path.join(__dirname, "..");
const PRODUCTS = path.join(ROOT, "src", "content", "produtos");

const API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function removerVarianteDoTitulo(titulo) {
  return String(titulo || "")
    .replace(/\s+-\s+(P|M|G|GG|XG|XXG|OS)\s+-\s+.+$/i, "")
    .trim();
}

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

    encontrados.push(...(response.data.products || []));
    pageToken = response.data.nextPageToken || "";
  } while (pageToken);

  return encontrados;
}

function carregarProdutosLocais() {
  const arquivos = fs
    .readdirSync(PRODUCTS)
    .filter((f) => f.endsWith(".json") && f !== "index.json");

  return arquivos.map((arquivo) => {
    const produto = JSON.parse(
      fs.readFileSync(path.join(PRODUCTS, arquivo), "utf8")
    );

    return {
      arquivo,
      id: produto.id,
      slug: produto.slug,
      nome: produto.nome,
    };
  });
}

function extrairOfferId(resourceName) {
  if (!resourceName) return null;
  const partes = resourceName.split("/");
  return partes[partes.length - 1] || null;
}

async function main() {
  const merchantProducts = await listarProdutosMerchant();
  const localProducts = carregarProdutosLocais();

  const merchantOffers = merchantProducts
    .map((produto) => ({
      offerId:
        produto.productAttributes?.offerId ||
        extrairOfferId(produto.name),
      titulo: produto.productAttributes?.title || "",
      itemGroupId: produto.productAttributes?.itemGroupId || null,
      resource: produto.name || null,
    }))
    .filter((produto) => produto.offerId);

  const resultados = [];

  for (const local of localProducts) {
    const nomeLocal = normalizarTexto(local.nome);

    const correspondencias = merchantOffers.filter((merchant) => {
      const tituloBase = normalizarTexto(
        removerVarianteDoTitulo(merchant.titulo)
      );

      return (
        tituloBase === nomeLocal ||
        tituloBase.includes(nomeLocal) ||
        nomeLocal.includes(tituloBase)
      );
    });

    resultados.push({
      idLocal: local.id,
      slug: local.slug,
      nomeLocal: local.nome,
      encontradoNoMerchant: correspondencias.length > 0,
      correspondencias: correspondencias.map((m) => ({
        offerId: m.offerId,
        titulo: m.titulo,
        itemGroupId: m.itemGroupId,
      })),
    });
  }

  const encontrados = resultados.filter((r) => r.encontradoNoMerchant);
  const naoEncontrados = resultados.filter((r) => !r.encontradoNoMerchant);

  console.log("Turkista — comparação por nome");
  console.log("MODO: SOMENTE LEITURA");
  console.log("");

  console.log("========================================");
  console.log("RESUMO");
  console.log("========================================");
  console.log(`Produtos locais: ${localProducts.length}`);
  console.log(`Produtos encontrados por nome: ${encontrados.length}`);
  console.log(`Produtos sem correspondência: ${naoEncontrados.length}`);
  console.log(`Ofertas atuais no Merchant: ${merchantOffers.length}`);
  console.log("");

  console.log("========================================");
  console.log("CORRESPONDÊNCIAS");
  console.log("========================================");

  for (const item of encontrados) {
    console.log("");
    console.log(`LOCAL: ${item.nomeLocal}`);
    console.log(`ID:    ${item.idLocal}`);

    for (const match of item.correspondencias) {
      console.log(`GOOGLE: ${match.titulo}`);
      console.log(`OFFER:  ${match.offerId}`);

      if (match.itemGroupId) {
        console.log(`GRUPO:  ${match.itemGroupId}`);
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log("SEM CORRESPONDÊNCIA");
  console.log("========================================");

  for (const item of naoEncontrados) {
    console.log(`${item.idLocal} | ${item.nomeLocal}`);
  }

  console.log("");
  console.log("========================================");
  console.log("COMPARAÇÃO CONCLUÍDA");
  console.log("NENHUMA ALTERAÇÃO FOI FEITA");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("Falha na comparação.");

  console.error(
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error)
  );

  process.exitCode = 1;
});
