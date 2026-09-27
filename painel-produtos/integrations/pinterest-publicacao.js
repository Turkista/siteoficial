const fs = require("fs");
const path = require("path");
const pinterestOAuth = require("./pinterest-oauth");

const RAIZ_PROJETO = path.join(__dirname, "..", "..");
const PRODUTOS_DIR = path.join(RAIZ_PROJETO, "src", "content", "produtos");
const HISTORICO_DIR = path.join(__dirname, "..", "secrets");
const HISTORICO_PATH = path.join(HISTORICO_DIR, "pinterest-publicacoes.json");
const SITE_BASE_URL = process.env.TURKISTA_SITE_URL || "https://turkista.com.br";

function lerHistorico() {
  if (!fs.existsSync(HISTORICO_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8")); }
  catch { return []; }
}

function salvarHistorico(itens) {
  fs.mkdirSync(HISTORICO_DIR, { recursive: true });
  fs.writeFileSync(HISTORICO_PATH, JSON.stringify(itens, null, 2), "utf8");
}

function listarProdutos() {
  if (!fs.existsSync(PRODUTOS_DIR)) return [];
  return fs.readdirSync(PRODUTOS_DIR)
    .filter(f => f.endsWith(".json") && f !== "index.json")
    .map(f => JSON.parse(fs.readFileSync(path.join(PRODUTOS_DIR, f), "utf8")))
    .filter(p => p.status !== "descontinuado")
    .sort((a,b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

function imagemPrincipal(produto) {
  const arquivo = produto.imagens?.[0]?.arquivo || produto.cores?.[0]?.imagens?.[0]?.arquivo;
  if (!arquivo) throw new Error("O produto não possui imagem principal.");
  return SITE_BASE_URL.replace(/\/$/, "") + "/assets/produtos/" + encodeURIComponent(arquivo);
}

function urlProduto(produto) {
  return SITE_BASE_URL.replace(/\/$/, "") + "/produto/" + encodeURIComponent(produto.slug) + ".html";
}

function publicacaoExistente(slug) {
  return lerHistorico().find(item => item.slug === slug && item.status === "publicado") || null;
}

async function listarBoards() {
  const dados = await pinterestOAuth.api("/boards?page_size=100");
  return (dados.items || []).map(board => ({
    id: board.id,
    name: board.name,
    description: board.description || "",
    privacy: board.privacy || null,
    pin_count: board.pin_count ?? null,
    url: board.url || null,
  }));
}

async function criarBoard({ name, description = "", privacy = "PUBLIC" }) {
  const dados = await pinterestOAuth.api("/boards", {
    method: "POST",
    body: JSON.stringify({ name, description, privacy }),
  });
  return dados;
}

async function publicarPin({ slug, boardId, title, description, link }) {
  const produto = listarProdutos().find(p => p.slug === slug);
  if (!produto) throw new Error("Produto não encontrado.");
  if (produto.status === "descontinuado") throw new Error("Produtos descontinuados não podem ser publicados.");
  if (!boardId) throw new Error("Selecione um Board.");

  const anterior = publicacaoExistente(slug);
  if (anterior) {
    const erro = new Error("Este produto já possui um Pin registrado no painel.");
    erro.status = 409;
    erro.publicacao = anterior;
    throw erro;
  }

  const payload = {
    title: String(title || produto.nome).slice(0, 100),
    description: String(description || produto.descricaoCompleta || produto.descricaoCurta || "").slice(0, 800),
    board_id: String(boardId),
    link: String(link || urlProduto(produto)),
    media_source: {
      source_type: "image_url",
      url: imagemPrincipal(produto),
    },
  };

  const pin = await pinterestOAuth.api("/pins", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const historico = lerHistorico();
  historico.push({
    slug: produto.slug,
    produto_id: produto.id,
    nome: produto.nome,
    board_id: String(boardId),
    pin_id: pin.id || null,
    pin_url: pin.link || pin.url || null,
    status: "publicado",
    publicado_em: new Date().toISOString(),
  });
  salvarHistorico(historico);
  return { pin, publicacao: historico[historico.length - 1] };
}

function historico() {
  return lerHistorico().sort((a,b) => String(b.publicado_em).localeCompare(String(a.publicado_em)));
}

module.exports = {
  listarProdutos,
  listarBoards,
  criarBoard,
  publicarPin,
  historico,
  imagemPrincipal,
  urlProduto,
};
