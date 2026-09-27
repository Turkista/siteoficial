const {
  getCredentialPath,
  getDeveloperRegistration,
  registerGcp,
} = require("../integrations/google-merchant");

const ACCOUNT_ID = process.env.MERCHANT_ACCOUNT_ID || "5859686480";
const DEVELOPER_EMAIL = process.env.MERCHANT_DEVELOPER_EMAIL || "turkista.com.br@gmail.com";

async function main() {
  console.log("Turkista — registro Google Merchant API");
  console.log(`Merchant Center: ${ACCOUNT_ID}`);
  console.log(`Developer email: ${DEVELOPER_EMAIL}`);
  console.log(`Credencial local: ${getCredentialPath()}`);

  try {
    const current = await getDeveloperRegistration(ACCOUNT_ID);
    console.log("O projeto já está registrado.");
    console.log(JSON.stringify({ name: current.name, gcpIds: current.gcpIds || [] }, null, 2));
    return;
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
  }

  const result = await registerGcp(ACCOUNT_ID, DEVELOPER_EMAIL);
  console.log("Registro concluído.");
  console.log(JSON.stringify({ name: result.name, gcpIds: result.gcpIds || [] }, null, 2));
}

main().catch((error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.error?.message || error?.message || String(error);
  console.error(`Falha no registro (HTTP ${status || "?"}): ${message}`);
  process.exitCode = 1;
});
