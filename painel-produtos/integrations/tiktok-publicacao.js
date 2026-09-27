const fs = require("fs");
const path = require("path");
const tiktokOAuth = require("./tiktok-oauth");

const HISTORICO_DIR = path.join(__dirname, "..", "secrets");
const HISTORICO_PATH = path.join(HISTORICO_DIR, "tiktok-publicacoes.json");

function lerHistorico() {
  if (!fs.existsSync(HISTORICO_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8")); }
  catch { return []; }
}

function salvarHistorico(itens) {
  fs.mkdirSync(HISTORICO_DIR, { recursive: true });
  fs.writeFileSync(HISTORICO_PATH, JSON.stringify(itens, null, 2), "utf8");
}

async function iniciarUploadVideo({ buffer, mimetype }) {
  if (!buffer?.length) throw new Error("O vídeo está vazio.");
  if (!["video/mp4", "video/quicktime", "video/webm"].includes(mimetype)) {
    throw new Error("Formato não suportado. Use MP4, MOV ou WebM.");
  }

  const videoSize = buffer.length;
  const resposta = await tiktokOAuth.api("/post/publish/inbox/video/init/", {
    method: "POST",
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    }),
  });

  const publishId = resposta.data?.publish_id;
  const uploadUrl = resposta.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new Error("TikTok não retornou os dados necessários para o upload.");
  }

  const envio = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimetype,
      "Content-Length": String(videoSize),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: buffer,
  });

  if (!envio.ok) {
    const texto = await envio.text();
    throw new Error("Falha ao enviar o vídeo para o TikTok: " + texto);
  }

  const registro = {
    publish_id: publishId,
    status: "enviado_para_rascunho",
    enviado_em: new Date().toISOString(),
  };
  const historico = lerHistorico();
  historico.unshift(registro);
  salvarHistorico(historico);

  return registro;
}

async function consultarStatus(publishId) {
  if (!publishId) throw new Error("publish_id é obrigatório.");
  return tiktokOAuth.api("/post/publish/status/fetch/", {
    method: "POST",
    body: JSON.stringify({ publish_id: publishId }),
  });
}

function historico() {
  return lerHistorico();
}

module.exports = { iniciarUploadVideo, consultarStatus, historico };