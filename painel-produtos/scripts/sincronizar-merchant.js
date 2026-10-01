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
  if (!slug) {
    throw new Error(
      "Informe o slug do produto. Ex.: node scripts/sincronizar-merchant.js biquini-aurora"
    );
  }

  const arquivo = path.join(PASTA_PRODUTOS, `${slug}.json`);

  if (!fs.existsSync(arquivo)) {
    throw new Error(`Produto não encontrado: ${arquivo}`);
  }

  return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
}

function formatarErro(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.details?.[0]?.description ||
    error?.message ||
    String(error)
  );
}

async function main() {
  const slug = process.argv[2];

  console.log("Turkista — sincronização Google Merchant");
  console.log(`Merchant Center: ${getConfig().accountId}`);
  console.log(`Data Source: ${getConfig().dataSourceId}`);
  console.log(`Credencial local: ${getCredentialPath()}`);
  console.log("");

  try {
    const produto = carregarProduto(slug);
    const variantes = variantesDoProduto(produto);

    console.log(`Produto: ${produto.nome}`);
    console.log(`Slug: ${produto.slug}`);
    console.log(`Status: ${produto.status}`);
    console.log(`Variantes: ${variantes.length}`);
    console.log("");

    if (variantes.length > 1) {
      console.log("Modo: sincronização por variantes");
      console.log("");

      variantes.forEach((variante, indice) => {
        console.log(
          `  ${indice + 1}. Tamanho: ${variante.tamanho} | Cor: ${variante.cor.nome}`
        );
      });

      console.log("");

      const result = await insertProductVariants(produto);

      console.log("========================================");
      console.log("VARIANTES ENVIADAS AO GOOGLE MERCHANT");
      console.log("========================================");
      console.log("");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("Modo: produto único");
      console.log("");

      const result = await insertProduct(produto);

      console.log("========================================");
      console.log("PRODUTO ENVIADO AO GOOGLE MERCHANT");
      console.log("========================================");
      console.log("");
      console.log(JSON.stringify(result, null, 2));
    }

    console.log("");
    console.log(
      "A validação/processamento dos produtos pode levar alguns minutos."
    );
  } catch (error) {
    const status = error?.response?.status;

    console.error("");
    console.error(
      `Falha na sincronização (HTTP ${status || "?"}): ${formatarErro(error)}`
    );
    console.error("");

    if (error?.response?.data?.error) {
      console.error(
        JSON.stringify(error.response.data.error, null, 2)
      );
    }

    process.exitCode = 1;
  }
}

main();