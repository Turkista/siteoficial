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
    `${API_BASE}/datasources/v1/accounts/${encodeURIComponent(config.accountId)}/dataSources`;

  const response = await client.request({
    method: "GET",
    url,
    params: {
      pageSize: 250,
    },
  });

  console.log("Turkista — fontes de dados do Merchant Center");
  console.log("MODO: SOMENTE LEITURA");
  console.log("");

  const fontes = response.data.dataSources || [];

  console.log(`Fontes encontradas: ${fontes.length}`);
  console.log("");

  for (const fonte of fontes) {
    console.log("========================================");
    console.log(`NAME: ${fonte.name || "(sem name)"}`);
    console.log(`DISPLAY NAME: ${fonte.displayName || "(sem nome)"}`);
    console.log(`INPUT: ${fonte.input || "(não informado)"}`);
    console.log(`PRIMARY: ${fonte.primaryProductDataSource || "(não informado)"}`);
    console.log(`SUPPLEMENTAL: ${fonte.supplementalProductDataSource || "(não informado)"}`);
    console.log(`FILENAME: ${fonte.fileInput?.fileName || "(não informado)"}`);
    console.log(`FILE: ${fonte.fileInput?.fetchUri || "(não informado)"}`);
    console.log(`TYPE: ${fonte.dataSourceType || "(não informado)"}`);
    console.log("");
    console.log(JSON.stringify(fonte, null, 2));
  }

  console.log("");
  console.log("========================================");
  console.log("CONSULTA CONCLUÍDA");
  console.log("NENHUMA ALTERAÇÃO FEITA");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("Falha na consulta das fontes.");

  console.error(
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error)
  );

  process.exitCode = 1;
});
