const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DIR = path.join(__dirname, "..", "secrets");
const CONFIG = path.join(DIR, "instagram-oauth.json");
const TOKEN = path.join(DIR, "instagram-token.json");

const AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

const states = new Map();

function read(p) {
  if (!fs.existsSync(p)) return null;

  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function save(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2), "utf8");
}

function config() {
  const f = read(CONFIG) || {};

  return {
    client_id: String(
      process.env.INSTAGRAM_CLIENT_ID || f.client_id || ""
    ).trim(),

    client_secret: String(
      process.env.INSTAGRAM_CLIENT_SECRET || f.client_secret || ""
    ).trim(),

    redirect_uri: String(
      process.env.INSTAGRAM_REDIRECT_URI ||
        f.redirect_uri ||
        "http://localhost:3000/api/instagram/oauth/callback"
    ).trim(),
  };
}

function token() {
  return read(TOKEN);
}

function configured() {
  const c = config();

  return !!(
    c.client_id &&
    c.client_secret &&
    c.redirect_uri
  );
}

function state() {
  const s = crypto.randomBytes(32).toString("hex");

  states.set(s, Date.now());

  return s;
}

function validState(s) {
  if (!s || !states.has(s)) return false;

  const t = states.get(s);

  states.delete(s);

  return Date.now() - t < 600000;
}

function authUrl() {
  if (!configured()) {
    throw new Error(
      "Instagram OAuth não configurado. Defina INSTAGRAM_CLIENT_ID e INSTAGRAM_CLIENT_SECRET ou configure painel-produtos/secrets/instagram-oauth.json."
    );
  }

  const c = config();
  const s = state();

  const q = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: c.redirect_uri,
    response_type: "code",
    scope: SCOPES.join(","),
    state: s,
  });

  return {
    url: AUTHORIZE + "?" + q.toString(),
    state: s,
  };
}

async function body(r) {
  const t = await r.text();

  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

async function exchange(code) {
  const c = config();

  const r = await fetch(TOKEN_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },

    body: new URLSearchParams({
      client_id: c.client_id,
      client_secret: c.client_secret,
      grant_type: "authorization_code",
      redirect_uri: c.redirect_uri,
      code: String(code),
    }),
  });

  const d = await body(r);

  if (!r.ok || !d.access_token) {
    throw new Error(
      "Instagram recusou o token: " + JSON.stringify(d)
    );
  }

  let out = {
    access_token: d.access_token,
    user_id: d.user_id || null,
    token_type: d.token_type || "bearer",
    connected_at: new Date().toISOString(),
    expires_at: null,
    permissions: SCOPES,
  };

  /*
   * Troca o token curto pelo token de longa duração.
   */
  try {
    const q = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: c.client_secret,
      access_token: d.access_token,
    });

    const rr = await fetch(
      GRAPH + "/access_token?" + q.toString()
    );

    const x = await body(rr);

    if (rr.ok && x.access_token) {
      out = {
        ...out,

        access_token: x.access_token,

        expires_at: x.expires_in
          ? Date.now() + Number(x.expires_in) * 1000
          : null,
      };
    }
  } catch {}

  /*
   * Confirma os dados reais da conta diretamente
   * pela API do Instagram.
   *
   * Isso evita confiar no user_id retornado
   * durante a primeira troca do OAuth.
   */
  try {
    const meUrl =
      GRAPH +
      "/me?fields=id,username,account_type&access_token=" +
      encodeURIComponent(out.access_token);

    const meResponse = await fetch(meUrl);
    const me = await body(meResponse);

    if (!meResponse.ok || !me.id) {
      throw new Error(
        "Instagram não retornou os dados da conta: " +
          JSON.stringify(me)
      );
    }

    out = {
      ...out,

      user_id: me.id,

      username: me.username || null,

      account_type: me.account_type || null,
    };
  } catch (err) {
    throw new Error(
      "Não foi possível confirmar a conta do Instagram: " +
        err.message
    );
  }

  save(TOKEN, out);

  return out;
}

async function refresh() {
  const t = token();

  if (!t?.access_token) return null;

  const q = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: t.access_token,
  });

  const r = await fetch(
    GRAPH + "/refresh_access_token?" + q.toString()
  );

  const d = await body(r);

  if (!r.ok || !d.access_token) {
    throw new Error(
      "Instagram recusou a renovação: " +
        JSON.stringify(d)
    );
  }

  const n = {
    ...t,

    access_token: d.access_token,

    expires_at: d.expires_in
      ? Date.now() + Number(d.expires_in) * 1000
      : t.expires_at,

    refreshed_at: new Date().toISOString(),
  };

  save(TOKEN, n);

  return n;
}

async function validToken() {
  let t = token();

  if (!t?.access_token) return null;

  if (
    t.expires_at &&
    Date.now() > Number(t.expires_at) - 86400000
  ) {
    t = await refresh();
  }

  return t;
}

async function api(p, opt = {}) {
  const t = await validToken();

  if (!t?.access_token) {
    throw new Error("Instagram não está conectado.");
  }

  const u = p.startsWith("http")
    ? p
    : GRAPH + p;

  const sep = u.includes("?") ? "&" : "?";

  const r = await fetch(
    u +
      sep +
      "access_token=" +
      encodeURIComponent(t.access_token),
    {
      ...opt,

      headers: {
        ...(opt.headers || {}),

        ...(opt.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
    }
  );

  const d = await body(r);

  if (!r.ok || d.error) {
    const e = new Error(
      "Instagram API " +
        r.status +
        ": " +
        JSON.stringify(d)
    );

    e.status = r.status;
    e.dados = d;

    throw e;
  }

  return d;
}

function status() {
  const c = config();
  const t = token();

  return {
    configurado: configured(),

    clientId: c.client_id || null,

    redirectUri: c.redirect_uri || null,

    conectado: !!t?.access_token,

    userId: t?.user_id || null,

    username: t?.username || null,

    accountType: t?.account_type || null,

    conectadoEm: t?.connected_at || null,

    expiraEm: t?.expires_at
      ? new Date(
          Number(t.expires_at)
        ).toISOString()
      : null,

    scopes: t?.permissions || SCOPES,
  };
}

function desconectar() {
  if (fs.existsSync(TOKEN)) {
    fs.unlinkSync(TOKEN);
  }

  return status();
}

module.exports = {
  SCOPES,

  status,

  urlAutorizacao: authUrl,

  validarState: validState,

  trocarCodigoPorToken: exchange,

  tokenValido: validToken,

  atualizarToken: refresh,

  api,

  desconectar,
};