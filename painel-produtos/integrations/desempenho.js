const fs = require("fs");
const path = require("path");

const HISTORICO_DIR = path.join(__dirname, "..", "secrets");
const HISTORICO_PATH = path.join(HISTORICO_DIR, "desempenho.json");

function lerDados() {
  if (!fs.existsSync(HISTORICO_PATH)) return { publicacoes: [], metricas: [] };
  try {
    const dados = JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8"));
    return {
      publicacoes: Array.isArray(dados.publicacoes) ? dados.publicacoes : [],
      metricas: Array.isArray(dados.metricas) ? dados.metricas : [],
    };
  } catch {
    return { publicacoes: [], metricas: [] };
  }
}

function salvarDados(dados) {
  fs.mkdirSync(HISTORICO_DIR, { recursive: true });
  fs.writeFileSync(HISTORICO_PATH, JSON.stringify(dados, null, 2), "utf8");
}

function gerarId(prefixo) {
  return prefixo + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function registrarPublicacao(publicacao) {
  const dados = lerDados();
  const registro = {
    id: publicacao.id || gerarId("pub"),
    produto_id: publicacao.produto_id || null,
    slug: publicacao.slug || null,
    canal: publicacao.canal || null,
    external_id: publicacao.external_id || null,
    status: publicacao.status || "pendente",
    data: publicacao.data || new Date().toISOString(),
    metadados: publicacao.metadados || {},
  };
  dados.publicacoes.unshift(registro);
  salvarDados(dados);
  return registro;
}

function registrarMetrica(metrica) {
  const dados = lerDados();
  const registro = {
    id: metrica.id || gerarId("met"),
    publicacao_id: metrica.publicacao_id || null,
    produto_id: metrica.produto_id || null,
    slug: metrica.slug || null,
    canal: metrica.canal || null,
    metrica: metrica.metrica || null,
    valor: Number(metrica.valor || 0),
    unidade: metrica.unidade || "numero",
    data: metrica.data || new Date().toISOString(),
    origem: metrica.origem || "api",
    metadados: metrica.metadados || {},
  };
  dados.metricas.unshift(registro);
  salvarDados(dados);
  return registro;
}

function listarPublicacoes(filtros = {}) {
  return lerDados().publicacoes.filter((item) =>
    (!filtros.canal || item.canal === filtros.canal) &&
    (!filtros.produto_id || item.produto_id === filtros.produto_id) &&
    (!filtros.slug || item.slug === filtros.slug)
  );
}

function listarMetricas(filtros = {}) {
  return lerDados().metricas.filter((item) =>
    (!filtros.canal || item.canal === filtros.canal) &&
    (!filtros.produto_id || item.produto_id === filtros.produto_id) &&
    (!filtros.slug || item.slug === filtros.slug) &&
    (!filtros.metrica || item.metrica === filtros.metrica)
  );
}

function resumo() {
  const dados = lerDados();
  const publicacoes_por_canal = {};
  for (const item of dados.publicacoes) {
    const canal = item.canal || "desconhecido";
    publicacoes_por_canal[canal] = (publicacoes_por_canal[canal] || 0) + 1;
  }
  const metricas_agregadas = {};
  for (const item of dados.metricas) {
    const chave = (item.canal || "desconhecido") + ":" + (item.metrica || "desconhecida");
    metricas_agregadas[chave] = (metricas_agregadas[chave] || 0) + Number(item.valor || 0);
  }
  return {
    publicacoes: dados.publicacoes.length,
    metricas: dados.metricas.length,
    publicacoes_por_canal,
    metricas_agregadas,
  };
}

module.exports = { registrarPublicacao, registrarMetrica, listarPublicacoes, listarMetricas, resumo };
