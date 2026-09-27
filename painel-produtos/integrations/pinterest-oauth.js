const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SECRETS_DIR = path.join(__dirname, "..", "secrets");
const CONFIG_PATH = path.join(SECRETS_DIR, "pinterest-oauth.json");
const TOKEN_PATH = path.join(SECRETS_DIR, "pinterest-token.json");

const AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const API_URL = "https://api.pinterest.com/v5";

const SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "user_accounts:read",
];

const estadosOAuth = new Map();

function lerJson(caminho) {
  if (!fs.existsSync(caminho)) return null;
  return JSON.parse(fs.readFileSync(caminho, "utf8"));
}

function salvarJson(caminho, valor) {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  fs.writeFileSync(caminho, JSON.stringify(valor, null, 2), "utf8");
}

function config() {
  return lerJson(CONFIG_PATH);
}

function token() {
  return lerJson(TOKEN_PATH);
}

function estaConfigurado() {
  const c = config();
  return Boolean(c?.client_id && c?.client_secret && c?.redirect_uri);
}

function criarState() {
  const state = crypto.randomBytes(24).toString("hex");
  estadosOAuth.set(state, Date.now());
  return state;
}

function validarState(state) {
  if (!state || !estadosOAuth.has(state)) return false;
  const criadoEm = estadosOAuth.get(state);
  estadosOAuth.delete(state);
  return Date.now() - criadoEm < 10 * 60 * 1000;
}

function urlAutorizacao() {
  if (!estaConfigurado()) {
    throw new Error("Pinterest OAuth ainda não está configurado. Crie painel-produtos/secrets/pinterest-oauth.json.");
  }
  const c = config();
  const state = criarState();
  const params = new URLSearchParams({
    client_id: String(c.client_id),
    redirect_uri: String(c.redirect_uri),
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return { url: AUTHORIZE_URL + "?" + params.toString(), state };
}

async function trocarCodigoPorToken(code) {
  const c = config();
  const basic = Buffer.from(String(c.client_id) + ":" + String(c.client_secret)).toString("base64");

  const resposta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: String(c.redirect_uri),
    }),
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok) {
    throw new Error("Pinterest recusou o token: " + JSON.stringify(dados));
  }

  const agora = Date.now();
  const salvo = {
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    token_type: dados.token_type || "bearer",
    scope: dados.scope || SCOPES.join(" "),
    expires_at: dados.expires_in ? agora + Number(dados.expires_in) * 1000 : null,
    refresh_token_expires_at: dados.refresh_token_expires_at
      ? Number(dados.refresh_token_expires_at) * 1000
      : (dados.refresh_token_expires_in ? agora + Number(dados.refresh_token_expires_in) * 1000 : null),
    connected_at: new Date(agora).toISOString(),
  };

  salvarJson(TOKEN_PATH, salvo);
  return salvo;
}

async function atualizarToken() {
  const atual = token();
  const c = config();
  if (!atual?.refresh_token || !estaConfigurado()) return null;

  const basic = Buffer.from(String(c.client_id) + ":" + String(c.client_secret)).toString("base64");
  const resposta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: atual.refresh_token,
    }),
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok) {
    throw new Error("Pinterest recusou a renovação do token: " + JSON.stringify(dados));
  }

  const agora = Date.now();
  const renovado = {
    ...atual,
    access_token: dados.access_token,
    refresh_token: dados.refresh_token || atual.refresh_token,
    token_type: dados.token_type || atual.token_type || "bearer",
    scope: dados.scope || atual.scope,
    expires_at: dados.expires_in ? agora + Number(dados.expires_in) * 1000 : atual.expires_at,
    refresh_token_expires_at: dados.refresh_token_expires_at
      ? Number(dados.refresh_token_expires_at) * 1000
      : atual.refresh_token_expires_at,
    refreshed_at: new Date(agora).toISOString(),
  };

  salvarJson(TOKEN_PATH, renovado);
  return renovado;
}

async function tokenValido() {
  let t = token();
  if (!t?.access_token) return null;

  if (t.expires_at && Date.now() >= Number(t.expires_at) - 5 * 60 * 1000) {
    t = await atualizarToken();
  }
  return t;
}

async function api(pathname, options = {}) {
  const t = await tokenValido();
  if (!t?.access_token) throw new Error("Pinterest não está conectado.");

  const resposta = await fetch(API_URL + pathname, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + t.access_token,
      "Content-Type": "application/json",
    },
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok) {
    const erro = new Error("Pinterest API " + resposta.status + ": " + JSON.stringify(dados));
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }
  return dados;
}

function status() {
  const c = config();
  const t = token();
  return {
    configurado: estaConfigurado(),
    appId: c?.client_id ? String(c.client_id) : null,
    redirectUri: c?.redirect_uri || null,
    conectado: Boolean(t?.access_token),
    scopes: t?.scope || SCOPES.join(" "),
    conectadoEm: t?.connected_at || null,
    expiraEm: t?.expires_at ? new Date(Number(t.expires_at)).toISOString() : null,
  };
}

function desconectar() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  return status();
}

module.exports = {
  SCOPES,
  status,
  urlAutorizacao,
  validarState,
  trocarCodigoPorToken,
  tokenValido,
  api,
  desconectar,
  CONFIG_PATH,
  TOKEN_PATH,
};