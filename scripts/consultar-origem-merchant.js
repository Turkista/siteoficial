const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("../painel-produtos/node_modules/google-auth-library");
const { getCredentialPath, getConfig } = require("../painel-produtos/integrations/google-merchant");

const API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

async function main() {
  const config = getConfig();

  const auth = new GoogleAuth({
    keyFile: getCredentialPath(),
    scopes: SCOPES,
  });

  const client = await auth.getClient();

  const url =
    `${API_BASE}/products/v1/accounts/${encodeURIComponent(config.accountId)}/products`;

  const response = await client.request({
    method: "GET",
    url,
    params: {
      pageSize: 250,
    },
  });

  const produtos = response.data.products || [];

  console.log("Turkista — origem das ofertas no Merchant");
  console.log("MODO: SOMENTE LEITURA");
  console.log("");

  console.log(`Total encontrado: ${produtos.length}`);
  console.log("");

  for (const produto of produtos) {
    const attrs = produto.productAttributes || {};

    console.log("========================================");
    console.log(`RESOURCE: ${produto.name || "(sem name)"}`);
    console.log(`PRODUCT:  ${produto.product || "(sem product)"}`);
    console.log(`OFFER ID: ${attrs.offerId || "(não informado)"}`);
    console.log(`TÍTULO:   ${attrs.title || "(sem título)"}`);
    console.log(`GRUPO:    ${attrs.itemGroupId || "(sem grupo)"}`);
    console.log(`FONTE:    ${produto.dataSource || "(não informado)"}`);
    console.log(`LANG:     ${attrs.contentLanguage || "(não informado)"}`);
    console.log(`FEED:     ${attrs.feedLabel || "(não informado)"}`);
  }

  console.log("");
  console.log("========================================");
  console.log("CONSULTA CONCLUÍDA");
  console.log("NENHUMA ALTERAÇÃO FEITA");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("Falha na consulta.");

  console.error(
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error)
  );

  process.exitCode = 1;
});
