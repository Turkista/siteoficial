const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SECRETS_DIR = path.join(__dirname, "..", "secrets");
const CONFIG_PATH = path.join(SECRETS_DIR, "tiktok-oauth.json");
const TOKEN_PATH = path.join(SECRETS_DIR, "tiktok-token.json");

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API_URL = "https://open.tiktokapis.com/v2";

const SCOPES = ["user.info.basic", "video.upload"];
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
  return Boolean(c?.client_key && c?.client_secret && c?.redirect_uri);
}

function criarState() {
  const state = crypto.randomBytes(32).toString("hex");
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
    throw new Error("TikTok OAuth ainda não está configurado. Crie painel-produtos/secrets/tiktok-oauth.json.");
  }
  const c = config();
  const state = criarState();
  const params = new URLSearchParams({
    client_key: String(c.client_key),
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: String(c.redirect_uri),
    state,
  });
  return { url: AUTHORIZE_URL + "?" + params.toString(), state };
}

async function trocarCodigoPorToken(code) {
  const c = config();
  const resposta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: String(c.client_key),
      client_secret: String(c.client_secret),
      code: String(code),
      grant_type: "authorization_code",
      redirect_uri: String(c.redirect_uri),
    }),
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok || dados.error) {
    throw new Error("TikTok recusou o token: " + JSON.stringify(dados));
  }

  const agora = Date.now();
  const salvo = {
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    open_id: dados.open_id || null,
    scope: dados.scope || SCOPES.join(","),
    expires_at: dados.expires_in ? agora + Number(dados.expires_in) * 1000 : null,
    refresh_token_expires_at: dados.refresh_expires_in
      ? agora + Number(dados.refresh_expires_in) * 1000
      : null,
    token_type: dados.token_type || "Bearer",
    connected_at: new Date(agora).toISOString(),
  };

  salvarJson(TOKEN_PATH, salvo);
  return salvo;
}

async function atualizarToken() {
  const atual = token();
  const c = config();
  if (!atual?.refresh_token || !estaConfigurado()) return null;

  const resposta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: String(c.client_key),
      client_secret: String(c.client_secret),
      grant_type: "refresh_token",
      refresh_token: String(atual.refresh_token),
    }),
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok || dados.error) {
    throw new Error("TikTok recusou a renovação do token: " + JSON.stringify(dados));
  }

  const agora = Date.now();
  const renovado = {
    ...atual,
    access_token: dados.access_token,
    refresh_token: dados.refresh_token || atual.refresh_token,
    scope: dados.scope || atual.scope,
    expires_at: dados.expires_in ? agora + Number(dados.expires_in) * 1000 : atual.expires_at,
    refresh_token_expires_at: dados.refresh_expires_in
      ? agora + Number(dados.refresh_expires_in) * 1000
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
  if (!t?.access_token) throw new Error("TikTok não está conectado.");

  const resposta = await fetch(API_URL + pathname, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + t.access_token,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

  const texto = await resposta.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { raw: texto }; }

  if (!resposta.ok || dados.error?.code && dados.error.code !== "ok") {
    const erro = new Error("TikTok API " + resposta.status + ": " + JSON.stringify(dados));
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
    clientKey: c?.client_key ? String(c.client_key) : null,
    redirectUri: c?.redirect_uri || null,
    conectado: Boolean(t?.access_token),
    openId: t?.open_id || null,
    scopes: t?.scope || SCOPES.join(","),
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