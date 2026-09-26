const fs = require("fs");
const { spawnSync } = require("child_process");

const ROOT = require("path").resolve(__dirname, "..");

function run(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    windowsHide: true,
    ...options,
  });
  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "Git retornou erro.").trim());
  return (result.stdout || "").trim();
}

function status() {
  const branch = run(["branch", "--show-current"]);
  const porcelain = run(["status", "--porcelain"]);
  let upstream = null;
  try { upstream = run(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]); } catch {}
  const counts = upstream ? run(["rev-list", "--left-right", "--count", upstream + "...HEAD"]).split(/\s+/).map(Number) : [0, 0];
  return {
    ok: true,
    branch,
    upstream,
    alterado: porcelain.length > 0,
    arquivosAlterados: porcelain ? porcelain.split("\n").filter(Boolean) : [],
    atras: counts[0] || 0,
    aFrente: counts[1] || 0,
  };
}

function diff() {
  return {
    unstaged: run(["diff", "--stat"]),
    staged: run(["diff", "--cached", "--stat"]),
    resumo: run(["status", "--short"]),
  };
}

function ensureBranch(branchName) {
  if (!/^[a-zA-Z0-9._/-]{1,80}$/.test(branchName)) throw new Error("Nome de branch inválido.");
  const current = run(["branch", "--show-current"]);
  if (current === branchName) return current;
  let exists = false;
  try { run(["show-ref", "--verify", "refs/heads/" + branchName]); exists = true; } catch {}
  if (exists) run(["switch", branchName]);
  else run(["switch", "-c", branchName]);
  return run(["branch", "--show-current"]);
}

function commit(message) {
  if (!message || message.trim().length < 3) throw new Error("A mensagem do commit é obrigatória.");
  if (!run(["status", "--porcelain"])) return { committed: false, mensagem: "Não há alterações para commit." };
  const permitidos = [
    "src/content/produtos/",
    "src/content/artigos/",
    "assets/produtos/",
    "assets/blog/",
    "assets/hero/",
    "assets/linhas/",
    "assets/sobre/",
    "produto/",
    "blog/",
    "sitemap.xml",
  ];

  const linhas = run(["status", "--porcelain"]).split("\n").filter(Boolean);
  const foraDoCMS = linhas.filter(linha => {
    const caminho = linha.slice(3).replace(/^"|"$/g, "");
    return !permitidos.some(prefixo => caminho === prefixo || caminho.startsWith(prefixo));
  });

  if (foraDoCMS.length) {
    throw new Error(
      "Existem alterações fora do conteúdo administrado pelo CMS. Revise o Git manualmente antes de publicar: " +
      foraDoCMS.join(" | ")
    );
  }

  run(["add", "--", ...permitidos]);
  if (!run(["diff", "--cached", "--name-only"])) {
    return { committed: false, mensagem: "Não há alterações de conteúdo para commit." };
  }
  run(["commit", "-m", message.trim()]);
  return { committed: true, commit: run(["rev-parse", "--short", "HEAD"]), mensagem: "Commit criado com sucesso." };
}

function log(limit = 10) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const output = run(["log", "-" + safeLimit, "--pretty=format:%h|%ad|%an|%s", "--date=short"]);
  return output.split("\n").filter(Boolean).map(line => {
    const [sha, data, autor, ...resto] = line.split("|");
    return { sha, data, autor, mensagem: resto.join("|") };
  });
}


function hasRemote() {
  try {
    return Boolean(run(["remote", "get-url", "origin"]));
  } catch {
    return false;
  }
}

function remote() {
  return run(["remote", "-v"]).split("\n").filter(Boolean);
}

function push(branchName) {
  const branch = branchName || run(["branch", "--show-current"]);
  if (!hasRemote()) throw new Error("O remote origin não está configurado neste projeto.");
  if (!/^[a-zA-Z0-9._/-]{1,80}$/.test(branch)) throw new Error("Nome de branch inválido.");
  const remotes = remote();
  if (!remotes.length) throw new Error("Nenhum remote Git configurado.");
  run(["push", "-u", "origin", branch]);
  return { pushed: true, branch, remote: "origin" };
}

module.exports = { status, diff, ensureBranch, commit, log, remote, hasRemote, push };
