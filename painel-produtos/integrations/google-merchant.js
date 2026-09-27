const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

const MERCHANT_API_BASE = "https://merchantapi.googleapis.com";
const SCOPES = ["https://www.googleapis.com/auth/content"];

function getCredentialPath() {
  const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (configured) {
    const p = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
    if (!fs.existsSync(p)) throw new Error("GOOGLE_APPLICATION_CREDENTIALS não aponta para um arquivo existente.");
    return p;
  }

  const dir = path.join(__dirname, "..", "secrets");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.toLowerCase().endsWith(".json")) : [];
  if (files.length !== 1) throw new Error("Configure GOOGLE_APPLICATION_CREDENTIALS ou deixe exatamente um JSON em painel-produtos/secrets.");
  return path.join(dir, files[0]);
}

async function request(method, url, data) {
  const auth = new GoogleAuth({ keyFile: getCredentialPath(), scopes: SCOPES });
  const client = await auth.getClient();
  const response = await client.request({ method, url, data });
  return response.data;
}

async function getDeveloperRegistration(accountId) {
  return request("GET", `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(accountId)}/developerRegistration`);
}

async function registerGcp(accountId, developerEmail) {
  return request(
    "POST",
    `${MERCHANT_API_BASE}/accounts/v1/accounts/${encodeURIComponent(accountId)}/developerRegistration:registerGcp`,
    { developerEmail }
  );
}

module.exports = { getCredentialPath, getDeveloperRegistration, registerGcp };
