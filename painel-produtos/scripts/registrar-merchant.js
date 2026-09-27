const {
  getCredentialPath,
  registerGcp,
} = require("../integrations/google-merchant");

const ACCOUNT_ID =
  process.env.MERCHANT_ACCOUNT_ID || "5859686480";

const DEVELOPER_EMAIL =
  process.env.MERCHANT_DEVELOPER_EMAIL || "DQMdesigner@gmail.com";

async function main() {
  console.log("Turkista — registro Google Merchant API");
  console.log(`Merchant Center: ${ACCOUNT_ID}`);
  console.log(`Developer email: ${DEVELOPER_EMAIL}`);
  console.log(`Credencial local: ${getCredentialPath()}`);
  console.log("");
  console.log("Registrando projeto GCP diretamente...");
  console.log("");

  try {
    const result = await registerGcp(
      ACCOUNT_ID,
      DEVELOPER_EMAIL
    );

    console.log("========================================");
    console.log("REGISTRO CONCLUÍDO COM SUCESSO");
    console.log("========================================");
    console.log("");
    console.log(JSON.stringify(result, null, 2));
    console.log("");
    console.log("Projeto GCP vinculado ao Merchant Center.");
    console.log("A API pode levar alguns minutos para ficar disponível.");
  } catch (error) {
    const status = error?.response?.status;

    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      String(error);

    console.error("");
    console.error(`Falha no registro (HTTP ${status || "?"}): ${message}`);
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