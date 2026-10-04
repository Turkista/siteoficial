const fs = require("fs");
const path = require("path");
const {
  getCredentialPath,
  getConfig,
  insertProduct,
  insertProductVariants,
  variantesDoProduto,
} = require("../integrations/google-merchant");

const RAIZ_PROJETO = path.join(__dirname, "..", "..");
const PASTA_PRODUTOS = path.join(RAIZ_PROJETO, "src", "content", "produtos");

function carregarProduto(slug) {
  if (!slug) throw new Error("Informe o slug do produto. Ex.: node scripts/sincronizar-merchant.js biquini-aurora");
  const arquivo = path.join(PASTA_PRODUTOS, slug + ".json");
  if (!fs.existsSync(arquivo)) throw new Error("Produto não encontrado: " + arquivo);
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function formatarErro(error) {
  return error?.response?.data?.error?.message ||
    error?.response?.data?.error?.details?.[0]?.description ||
    error?.message || String(error);
}

async function main() {
  const produto = carregarProduto(process.argv[2]);
  const totalVariantes = variantesDoProduto(produto).length;

  console.log("Turkista — sincronização Google Merchant");
  console.log("Merchant Center: " + getConfig().accountId);
  console.log("Data Source: " + getConfig().dataSourceId);
  console.log("Credencial local: " + getCredentialPath());
  console.log("");
  console.log("Produto: " + produto.nome);
  console.log("Slug: " + produto.slug);
  console.log("Status: " + produto.status);
  console.log("Variantes a enviar: " + totalVariantes);
  console.log("");

  try {
    const result = totalVariantes > 1
      ? await insertProductVariants(produto)
      : await insertProduct(produto);

    console.log("========================================");
    console.log("PRODUTO(S) ENVIADO(S) AO GOOGLE MERCHANT");
    console.log("========================================");
    console.log("");
    console.log(JSON.stringify(result, null, 2));
    console.log("");
    console.log("O Google iniciou o processamento. A aprovação/status final deve ser conferido no Merchant Center.");
  } catch (error) {
    const status = error?.response?.status;
    console.error("");
    console.error("Falha na sincronização (HTTP " + (status || "?") + "): " + formatarErro(error));
    console.error("");
    if (error?.response?.data?.error) console.error(JSON.stringify(error.response.data.error, null, 2));
    process.exitCode = 1;
  }
}

main();
