// \n\nPainel local â€” Turkista
//
// Um Ãºnico servidor Node local com trÃªs funÃ§Ãµes:
// 1. Cadastro de PRODUTOS (aba "Produtos") â€” gera .json + ficha de produto
// 2. Cadastro de ARTIGOS da Revista Turkista (aba "Artigos do Blog") â€” gera
//    .json + pÃ¡gina do artigo
// 3. Envio de FOTOS INSTITUCIONAIS (aba "Fotos do Site") â€” hero da Home,
//    fotos das 3 linhas, colagem "Sobre a Turkista" e capas do Blog
//
// Tudo roda 100% local â€” nÃ£o sobe nada pra internet, nÃ£o precisa de
// internet depois de instalado (sÃ³ na hora do "npm install").

const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const { spawnSync } = require("child_process");
const gitLocal = require("./git-local");
const { normalizarProduto } = require("./catalogo-normalizacao");
const pinterestOAuth = require("./integrations/pinterest-oauth");
const pinterestPublicacao = require("./integrations/pinterest-publicacao");
const tiktokOAuth = require("./integrations/tiktok-oauth");
const tiktokPublicacao = require("./integrations/tiktok-publicacao");
const instagramOAuth = require("./integrations/instagram-oauth");
const instagramPublicacao = require("./integrations/instagram-publicacao");
const desempenho = require("./integrations/desempenho");
const googleMerchant = require("./integrations/google-merchant");
const googleAnalytics = require("./integrations/google-analytics");

const app = express();
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});
const PORTA = Number(process.env.PORT || 3000);

const RAIZ_PROJETO = path.join(__dirname, ".."); // pasta turkista-showroom
const CAMINHO_SITEMAP = path.join(RAIZ_PROJETO, "sitemap.xml");

const PRODUTOS = {
  pastaJSON: path.join(RAIZ_PROJETO, "src", "content", "produtos"),
  pastaAssets: path.join(RAIZ_PROJETO, "assets", "produtos"),
  schema: path.join(RAIZ_PROJETO, "src", "schema", "produto.schema.json"),
  gerador: path.join(RAIZ_PROJETO, "scripts", "gerar-ficha-produto.py"),
  paginaSlugPrefixo: "produto/",
};

const ARTIGOS = {
  pastaJSON: path.join(RAIZ_PROJETO, "src", "content", "artigos"),
  pastaAssets: path.join(RAIZ_PROJETO, "assets", "blog"),
  schema: path.join(RAIZ_PROJETO, "src", "schema", "artigo.schema.json"),
  gerador: path.join(RAIZ_PROJETO, "scripts", "gerar-artigo-blog.py"),
  paginaSlugPrefixo: "blog/",
};

// Slots de fotos institucionais conhecidos â€” nome de arquivo exato que
// cada pÃ¡gina espera (documentado nos READMEs de assets/*), pra o painel
// nunca salvar com nome errado.
const SLOTS_FOTOS_INSTITUCIONAIS = [
  { chave: "hero-praia", pasta: "hero", arquivo: "hero-praia.webp", rotulo: "Hero da Home", descricao: "Foto principal do topo da Home (index.html)" },
  { chave: "linha-praia", pasta: "linhas", arquivo: "praia.webp", rotulo: "Card da linha Praia (Home)", descricao: "Foto do card \"Moda Praia\" na Home" },
  { chave: "linha-surf", pasta: "linhas", arquivo: "surf.webp", rotulo: "Card da linha Surf (Home)", descricao: "Foto do card \"Surf\" na Home" },
  { chave: "linha-turk-fit", pasta: "linhas", arquivo: "turk-fit.webp", rotulo: "Card da linha Turk Fit (Home)", descricao: "Foto do card \"Turk Fit\" na Home" },
  { chave: "bastidores-1", pasta: "sobre", arquivo: "bastidores-1.webp", rotulo: "Colagem \"Sobre a Turkista\" â€” foto grande", descricao: "Foto grande Ã  esquerda da colagem, na Home" },
  { chave: "bastidores-2", pasta: "sobre", arquivo: "bastidores-2.webp", rotulo: "Colagem \"Sobre a Turkista\" â€” foto pequena (topo)", descricao: "Foto pequena superior direita da colagem, na Home" },
  { chave: "bastidores-3", pasta: "sobre", arquivo: "bastidores-3.webp", rotulo: "Colagem \"Sobre a Turkista\" â€” foto pequena (base)", descricao: "Foto pequena inferior direita da colagem, na Home" },
];

for (const pasta of [PRODUTOS.pastaJSON, PRODUTOS.pastaAssets, ARTIGOS.pastaJSON, ARTIGOS.pastaAssets]) {
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
}

app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------
// INSTAGRAM / MÍDIA TEMPORÁRIA PARA PUBLICAÇÃO
// ---------------------------------------------------------------

const INSTAGRAM_TEMP_MEDIA_DIR = path.join(
  __dirname,
  "secrets",
  "instagram-media-temp"
);

if (!fs.existsSync(INSTAGRAM_TEMP_MEDIA_DIR)) {
  fs.mkdirSync(INSTAGRAM_TEMP_MEDIA_DIR, { recursive: true });
}

app.get("/api/instagram/media/:arquivo", (req, res) => {
  try {
    const arquivo = String(req.params.arquivo || "");

    // Somente arquivos JPEG gerados pelo módulo do Instagram.
    if (!/^[a-zA-Z0-9_-]+\.jpg$/i.test(arquivo)) {
      return res.status(400).send("Arquivo de mídia inválido.");
    }

    const caminho = path.resolve(
      INSTAGRAM_TEMP_MEDIA_DIR,
      arquivo
    );

    const raiz = path.resolve(INSTAGRAM_TEMP_MEDIA_DIR) + path.sep;

    if (!caminho.startsWith(raiz)) {
      return res.status(403).send("Arquivo não permitido.");
    }

    if (!fs.existsSync(caminho)) {
      return res.status(404).send("Mídia não encontrada.");
    }

    if (!fs.statSync(caminho).isFile()) {
      return res.status(404).send("Mídia não encontrada.");
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Disposition", "inline");

    return res.sendFile(caminho);
  } catch (erro) {
    console.error("Instagram mídia temporária:", erro);
    return res.status(500).send("Erro ao servir a mídia.");
  }
});
// Serve o site completo (catalogo.html, blog.html etc.) em /site â€” em rota
// separada da UI do painel (que jÃ¡ usa "/") pra nÃ£o haver conflito entre os
// dois index.html. Isso existe porque os scripts catalogo-dinamico.js e
// blog-dinamico.js usam fetch() pra buscar o manifesto de produtos/artigos,
// e fetch() Ã© bloqueado por seguranÃ§a quando a pÃ¡gina Ã© aberta direto do
// disco (file://) â€” abrindo por aqui (http://localhost:3000/site/...) o
// fetch funciona normalmente e o catÃ¡logo real aparece na prÃ©-visualizaÃ§Ã£o.
app.use("/site", express.static(RAIZ_PROJETO));

function reescreverCaminhosPreview(html) {
  return html.replace(/(href|src|action)=(["'])\/(?!\/)/g, '$1=$2/preview/');
}

function servirPreviewArquivo(caminhoRelativo, res) {
  const rel = caminhoRelativo.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel || rel.includes("\0") || rel.split("/").includes("..")) {
    return res.status(400).send("Caminho de preview invÃ¡lido.");
  }

  const partes = rel.split("/");
  const bloqueadas = new Set([".git", ".github", "painel-produtos", "scripts", "config"]);
  if (partes.some((parte) => bloqueadas.has(parte))) {
    return res.status(403).send("Arquivo nÃ£o disponÃ­vel na prÃ©-visualizaÃ§Ã£o.");
  }

  const absoluto = path.resolve(RAIZ_PROJETO, ...partes);
  const raizNormalizada = path.resolve(RAIZ_PROJETO) + path.sep;
  if (!absoluto.startsWith(raizNormalizada)) {
    return res.status(403).send("Caminho de preview invÃ¡lido.");
  }

  if (!fs.existsSync(absoluto) || !fs.statSync(absoluto).isFile()) {
    return res.status(404).send("Arquivo nÃ£o encontrado no projeto.");
  }

  const extensao = path.extname(absoluto).toLowerCase();
  if (extensao === ".html") {
    const html = fs.readFileSync(absoluto, "utf-8");
    return res.type("html").send(reescreverCaminhosPreview(html));
  }

  return res.sendFile(absoluto);
}

app.get("/preview", (req, res) => servirPreviewArquivo("index.html", res));
app.get("/preview/*", (req, res) => servirPreviewArquivo(req.params[0], res));
app.use(express.json());

const CANAIS_PUBLICACAO_PADRAO = Object.freeze({
  site: true,
  googleMerchant: true,
  pinterest: false,
  tiktok: false,
});

function lerCanaisPublicacao(valor, existentes = {}) {
  let recebidos = {};
  try {
    if (valor) recebidos = typeof valor === "string" ? JSON.parse(valor) : valor;
  } catch {
    throw new Error("ConfiguraÃ§Ã£o de canais de publicaÃ§Ã£o invÃ¡lida.");
  }
  return {
    ...CANAIS_PUBLICACAO_PADRAO,
    ...existentes,
    ...recebidos,
    site: recebidos.site !== undefined ? Boolean(recebidos.site) : (existentes.site !== undefined ? Boolean(existentes.site) : CANAIS_PUBLICACAO_PADRAO.site),
    googleMerchant: recebidos.googleMerchant !== undefined ? Boolean(recebidos.googleMerchant) : (existentes.googleMerchant !== undefined ? Boolean(existentes.googleMerchant) : CANAIS_PUBLICACAO_PADRAO.googleMerchant),
    pinterest: recebidos.pinterest !== undefined ? Boolean(recebidos.pinterest) : (existentes.pinterest !== undefined ? Boolean(existentes.pinterest) : CANAIS_PUBLICACAO_PADRAO.pinterest),
    tiktok: recebidos.tiktok !== undefined ? Boolean(recebidos.tiktok) : (existentes.tiktok !== undefined ? Boolean(existentes.tiktok) : CANAIS_PUBLICACAO_PADRAO.tiktok),
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const permitidos = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!permitidos.has(file.mimetype)) {
      return cb(new Error("Formato de imagem nÃ£o permitido. Use JPG, PNG ou WebP."));
    }
    cb(null, true);
  }
});


const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const permitidos = new Set(["video/mp4", "video/quicktime", "video/webm"]);
    if (!permitidos.has(file.mimetype)) {
      return cb(new Error("Formato de vÃ­deo nÃ£o permitido. Use MP4, MOV ou WebM."));
    }
    cb(null, true);
  }
});

// ---------------------------------------------------------------
// UtilitÃ¡rios gerais
// ---------------------------------------------------------------

function validarImagemProcessada(buffer, nome = "imagem") {
  if (!buffer || buffer.length < 100) throw new Error("Arquivo de imagem vazio ou invÃ¡lido.");
  const assinatura = buffer.subarray(0, 12).toString("hex");
  const assinaturas = ["89504e470d0a1a0a", "ffd8ff", "52494646"];
  if (!assinaturas.some(s => assinatura.startsWith(s))) {
    throw new Error("O conteÃºdo enviado nÃ£o corresponde a uma imagem vÃ¡lida.");
  }
  return true;
}

function gerarSlug(texto) {
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function gerarId(prefixo, slug) {
  const sufixo = slug.replace(/-/g, "").slice(0, 8).padEnd(6, "0");
  return `${prefixo}_${sufixo}`;
}

function validarSlugParametro(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug invÃ¡lido.");
  }
  return slug;
}

function validarArquivosUpload(arquivos) {
  for (const arquivo of arquivos) validarImagemProcessada(arquivo.buffer, arquivo.originalname);
}

// ReconstrÃ³i o index.json de uma pasta de conteÃºdo (produtos ou artigos) â€”
// Ã© este arquivo que o site lÃª no navegador pra montar os cards sozinho.
function regenerarManifesto(config) {
  const arquivos = fs
    .readdirSync(config.pastaJSON)
    .filter((f) => f.endsWith(".json") && f !== "index.json");
  const itens = arquivos.map((f) => JSON.parse(fs.readFileSync(path.join(config.pastaJSON, f), "utf-8")));
  fs.writeFileSync(path.join(config.pastaJSON, "index.json"), JSON.stringify(itens, null, 2), "utf-8");
  return itens.length;
}

// Roda o gerador Python correspondente (ficha de produto ou artigo de blog).
// Tenta "python3", "python" e "py" (o lanÃ§ador oficial do Python no
// Windows). Importante: no Windows, o comando "python" Ã s vezes existe mas
// Ã© sÃ³ o atalho falso da Microsoft Store (nÃ£o erra ao rodar, sÃ³ nÃ£o faz
// nada Ãºtil) â€” por isso continuamos tentando os prÃ³ximos comandos sempre
// que o resultado nÃ£o for "sucesso real" (status 0), nÃ£o sÃ³ quando o
// comando nÃ£o existe de verdade.
function rodarGerador(caminhoScript) {
  if (!fs.existsSync(caminhoScript)) return { ok: false, motivo: "script nÃ£o encontrado" };

  let ultimoErro = "nenhum interpretador Python funcionou";
  for (const comando of ["python3", "python", "py"]) {
    const resultado = spawnSync(comando, [caminhoScript], { cwd: RAIZ_PROJETO, encoding: "utf-8" });
    if (resultado.error) {
      continue; // comando nÃ£o existe de verdade â€” tenta o prÃ³ximo
    }
    if (resultado.status === 0) {
      return { ok: true }; // sucesso real
    }
    // Comando existe mas falhou (pode ser o atalho fake da Microsoft Store,
    // pode ser erro real no script) â€” guarda o erro e tenta o prÃ³ximo
    // comando antes de desistir.
    ultimoErro = resultado.stderr || `saiu com cÃ³digo ${resultado.status}`;
  }

  console.warn(`Aviso: nÃ£o consegui gerar a pÃ¡gina automaticamente (${path.basename(caminhoScript)}). Ãšltimo erro: ${ultimoErro}`);
  console.warn(`Rode manualmente: py scripts/${path.basename(caminhoScript)}  (ou "python scripts/..." / "python3 scripts/...")`);
  return { ok: false, motivo: ultimoErro };
}

// Acrescenta uma URL nova ao sitemap.xml, se ainda nÃ£o existir. SÃ³ Ã©
// chamado para itens com status "publicado" â€” rascunhos nÃ£o entram no SEO.
function atualizarSitemapDeterministico() {
  const script = path.join(RAIZ_PROJETO, "scripts", "gerar-sitemap.py");
  return rodarGerador(script);
}
function validarComSchema(caminhoSchema, objeto) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(fs.readFileSync(caminhoSchema, "utf-8"));
  const validar = ajv.compile(schema);
  return { valido: validar(objeto), erros: validar.errors };
}

// Garante que os manifestos jÃ¡ existem assim que o painel sobe.
regenerarManifesto(PRODUTOS);
regenerarManifesto(ARTIGOS);

// ---------------------------------------------------------------
// GIT / CMS
// ---------------------------------------------------------------

app.get("/api/git/status", (req, res) => {
  try { res.json(gitLocal.status()); }
  catch (erro) { res.status(500).json({ erro: "NÃ£o foi possÃ­vel ler o estado do Git.", detalhes: erro.message }); }
});

app.post("/api/cms/validate", (req, res) => {
  try {
    const script = path.join(RAIZ_PROJETO, "scripts", "validar-conteudo.py");
    const resultado = rodarGerador(script);
    if (resultado.ok) return res.json({ valido: true, mensagem: "ConteÃºdo vÃ¡lido." });
    return res.status(422).json({ valido: false, mensagem: "A validaÃ§Ã£o encontrou problemas.", detalhes: resultado.motivo });
  } catch (erro) {
    return res.status(500).json({ valido: false, erro: erro.message });
  }
});

app.post("/api/cms/prepare-publication", (req, res) => {
  try {
    const estadoGit = gitLocal.status();
    if (estadoGit.branch === "main") {
      return res.status(409).json({ pronto: false, mensagem: "O CMS nÃ£o prepara publicaÃ§Ã£o diretamente na branch main. Ative uma branch de trabalho." });
    }
    const validacao = rodarGerador(path.join(RAIZ_PROJETO, "scripts", "validar-conteudo.py"));
    if (!validacao.ok) {
      return res.status(422).json({ pronto: false, mensagem: "A validaÃ§Ã£o do conteÃºdo falhou." });
    }
    regenerarManifesto(PRODUTOS);
    regenerarManifesto(ARTIGOS);
    if (!rodarGerador(path.join(RAIZ_PROJETO, "scripts", "gerar-ficha-produto.py")).ok) {
      throw new Error("A geraÃ§Ã£o das pÃ¡ginas de produto falhou.");
    }
    if (!rodarGerador(path.join(RAIZ_PROJETO, "scripts", "gerar-artigo-blog.py")).ok) {
      throw new Error("A geraÃ§Ã£o das pÃ¡ginas de artigo falhou.");
    }
    if (!atualizarSitemapDeterministico().ok) {
      throw new Error("A geraÃ§Ã£o do sitemap falhou.");
    }
    const estadoFinal = gitLocal.status();
    return res.json({ pronto: true, branch: estadoFinal.branch, arquivosAlterados: estadoFinal.arquivosAlterados, mensagem: "Projeto validado e artefatos regenerados." });
  } catch (erro) {
    return res.status(500).json({ pronto: false, erro: erro.message });
  }
});

app.get("/api/git/diff", (req, res) => {
  try { res.json(gitLocal.diff()); }
  catch (erro) { res.status(500).json({ erro: "NÃ£o foi possÃ­vel obter o diff.", detalhes: erro.message }); }
});

app.get("/api/git/log", (req, res) => {
  try { res.json(gitLocal.log(req.query.limit)); }
  catch (erro) { res.status(500).json({ erro: "NÃ£o foi possÃ­vel ler o histÃ³rico.", detalhes: erro.message }); }
});

app.post("/api/git/branch", (req, res) => {
  try {
    const nome = String(req.body.nome || "").trim();
    const branch = gitLocal.ensureBranch(nome);
    res.json({ mensagem: "Branch ativa.", branch });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.get("/api/github/auth", (req, res) => {
  try {
    res.json(gitLocal.githubAuth());
  } catch (erro) {
    res.status(500).json({ instalado: false, autenticado: false, mensagem: erro.message });
  }
});

app.post("/api/github/pr", (req, res) => {
  try {
    const status = gitLocal.status();
    if (status.branch === "main") return res.status(409).json({ erro: "Ative uma branch de trabalho antes de criar o PR." });
    if (status.alterado) return res.status(409).json({ erro: "Existem alteraÃ§Ãµes nÃ£o commitadas. Crie o commit antes do PR." });
    if (!status.upstream) return res.status(409).json({ erro: 'A branch ainda nÃ£o foi enviada ao GitHub. Use "Enviar para GitHub" antes de criar o PR.' });
    const resultado = gitLocal.pullRequest(
      status.branch,
      req.body.titulo || "CMS: atualizaÃ§Ã£o do site",
      req.body.corpo || "AlteraÃ§Ãµes preparadas pelo CMS local."
    );
    res.json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.get("/api/git/remote", (req, res) => {
  try {
    res.json({ remotes: gitLocal.remote() });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/git/push", (req, res) => {
  try {
    const status = gitLocal.status();
    if (status.alterado) {
      return res.status(409).json({ erro: "Existem alteraÃ§Ãµes nÃ£o commitadas. Crie o commit antes do push." });
    }
    const resultado = gitLocal.push(status.branch);
    res.json(resultado);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/git/commit", (req, res) => {
  try {
    const resultado = gitLocal.commit(req.body.mensagem);
    res.json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: "NÃ£o foi possÃ­vel criar o commit.", detalhes: erro.message });
  }
});

// ---------------------------------------------------------------
// PRODUTOS
// ---------------------------------------------------------------

app.get("/api/produtos", (req, res) => {
  const arquivos = fs.readdirSync(PRODUTOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
  const produtos = arquivos.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(PRODUTOS.pastaJSON, f), "utf-8"));
    return { slug: d.slug, nome: d.nome, linha: d.linha, categoria: d.categoria, status: d.status };
  });
  res.json(produtos);
});

// Devolve o cadastro completo de um produto (usado pra preencher o
// formulÃ¡rio de ediÃ§Ã£o com o que jÃ¡ estÃ¡ salvo).
app.get("/api/produtos/:slug", (req, res) => {
  const slug = validarSlugParametro(req.params.slug);
  const arquivo = path.join(PRODUTOS.pastaJSON, `${slug}.json`);
  if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: "Produto nÃ£o encontrado." });
  res.json(JSON.parse(fs.readFileSync(arquivo, "utf-8")));
});

app.post("/api/produtos", upload.array("fotos", 6), async (req, res) => {
  try {
    const corpo = req.body;
    if (req.file) validarArquivosUpload([req.file]);
    const nome = (corpo.nome || "").trim();
    if (!nome) return res.status(400).json({ erro: "Nome do produto Ã© obrigatÃ³rio." });

    const slug = gerarSlug(nome);
    const id = gerarId("prod", slug);
    const arquivoDestino = path.join(PRODUTOS.pastaJSON, `${slug}.json`);
    if (fs.existsSync(arquivoDestino)) {
      return res.status(409).json({ erro: `JÃ¡ existe um produto com o slug "${slug}". Escolha um nome diferente.` });
    }

    const arquivos = req.files || [];
    validarArquivosUpload(arquivos);
    if (arquivos.length === 0) return res.status(400).json({ erro: "Envie pelo menos uma foto do produto." });

    const imagens = [];
    for (let i = 0; i < arquivos.length; i++) {
      const sufixo = arquivos.length > 1 ? `-${i + 1}` : "";
      const nomeArquivo = `${slug}${sufixo}.webp`;
      await sharp(arquivos[i].buffer).webp({ quality: 85 }).toFile(path.join(PRODUTOS.pastaAssets, nomeArquivo));
      imagens.push({ arquivo: nomeArquivo, alt: `${nome}${arquivos.length > 1 ? ` - foto ${i + 1}` : ""}`, proporcao: "3:4" });
    }

    let tamanhos = corpo.tamanhos || [];
    if (!Array.isArray(tamanhos)) tamanhos = [tamanhos];
    let badges = corpo.badges || [];
    if (!Array.isArray(badges)) badges = [badges];
    const tags = (corpo.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    const produto = normalizarProduto({
      id, slug, nome,
      linha: corpo.linha,
      categoria: corpo.categoria,
      descricaoCurta: corpo.descricaoCurta || "",
      descricaoCompleta: corpo.descricaoCompleta || "",
      composicao: {
        tecido: corpo.tecido || "PREENCHER â€” confirmar com a marca",
        protecaoUV: null,
        paisDeFabricacao: corpo.paisDeFabricacao || "Brasil",
      },
      cores: [{ nome: corpo.corNome || "Ãšnico", hex: corpo.corHex || "#F279C8", imagens }],
      tamanhos,
      preco: corpo.preco ? { valor: parseFloat(corpo.preco), parcelamento: corpo.parcelamento || "" } : null,
      imagens,
      badges,
      tags,
      status: corpo.status || "rascunho",
      canaisPublicacao: lerCanaisPublicacao(corpo.canaisPublicacao),
      dataCriacao: new Date().toISOString().slice(0, 10),
    });

    const { valido, erros } = validarComSchema(PRODUTOS.schema, produto);
    if (!valido) return res.status(422).json({ erro: "Produto rejeitado pela validaÃ§Ã£o do schema.", detalhes: erros });
    fs.writeFileSync(arquivoDestino, JSON.stringify(produto, null, 2), "utf-8");
    regenerarManifesto(PRODUTOS);
    const resultadoFicha = rodarGerador(PRODUTOS.gerador);

    if (produto.status === "publicado") {
      atualizarSitemapDeterministico();
    }

    let mensagem = "Produto salvo com sucesso!";
    mensagem += produto.status === "publicado"
      ? " JÃ¡ vai aparecer no CatÃ¡logo e, se estiver entre os mais recentes, na Home tambÃ©m."
      : " EstÃ¡ como rascunho â€” mude o status para \"Publicado\" quando quiser que ele apareÃ§a no site.";
    if (!resultadoFicha.ok) mensagem += " (ficha de produto nÃ£o gerada automaticamente â€” rode: python scripts/gerar-ficha-produto.py â€” ou 'py scripts/gerar-ficha-produto.py' no Windows)";

    res.status(201).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar o produto.", detalhes: erro.message });
  }
});

// Edita um produto jÃ¡ existente. O slug (e por consequÃªncia a URL da
// ficha de produto, jÃ¡ indexada no Google se publicada) fica travado â€”
// mudar o "nome" sÃ³ atualiza o texto exibido, nÃ£o o endereÃ§o da pÃ¡gina.
// Cada foto jÃ¡ cadastrada pode ser mantida, trocada (campo
// "substituto_<posiÃ§Ã£o>") ou removida (via "fotosExistentes"); tambÃ©m dÃ¡
// pra anexar fotos novas no fim ("novasFotos").
const CAMPOS_EDICAO_PRODUTO = [
  ...Array.from({ length: 6 }, (_, i) => ({ name: `substituto_${i}`, maxCount: 1 })),
  { name: "novasFotos", maxCount: 6 },
];

app.put("/api/produtos/:slug", upload.fields(CAMPOS_EDICAO_PRODUTO), async (req, res) => {
  try {
    const slug = validarSlugParametro(req.params.slug);
    const arquivoDestino = path.join(PRODUTOS.pastaJSON, `${slug}.json`);
    if (!fs.existsSync(arquivoDestino)) return res.status(404).json({ erro: "Produto nÃ£o encontrado." });

    const produtoAntigo = JSON.parse(fs.readFileSync(arquivoDestino, "utf-8"));
    const corpo = req.body;
    const arquivos = req.files || {};
    validarArquivosUpload(Object.values(arquivos).flat());

    const nome = (corpo.nome || "").trim();
    if (!nome) return res.status(400).json({ erro: "Nome do produto Ã© obrigatÃ³rio." });

    // fotosExistentes: JSON com as fotos jÃ¡ cadastradas que devem
    // permanecer, na ordem final desejada â€” cada uma com { arquivo, alt,
    // posicao } onde "posicao" indica qual campo substituto_N (se houver)
    // corresponde a ela.
    let fotosExistentes = [];
    try {
      fotosExistentes = corpo.fotosExistentes ? JSON.parse(corpo.fotosExistentes) : [];
    } catch {
      return res.status(400).json({ erro: "Lista de fotos existentes veio em formato invÃ¡lido." });
    }

    // Monta a lista final de imagens (buffer em memÃ³ria + alt), na ordem:
    // primeiro as existentes (mantidas ou trocadas), depois as novas.
    const imagensFinais = [];
    for (const item of fotosExistentes) {
      const campoSubstituto = `substituto_${item.posicao}`;
      const arquivoSubstituto = arquivos[campoSubstituto]?.[0];
      const buffer = arquivoSubstituto
        ? arquivoSubstituto.buffer
        : fs.readFileSync(path.join(PRODUTOS.pastaAssets, item.arquivo));
      imagensFinais.push({ buffer, alt: item.alt || nome });
    }
    const novasFotos = arquivos.novasFotos || [];
    for (const arquivo of novasFotos) {
      imagensFinais.push({ buffer: arquivo.buffer, alt: nome });
    }

    if (imagensFinais.length === 0) {
      return res.status(400).json({ erro: "O produto precisa ter pelo menos uma foto." });
    }

    // Apaga os arquivos antigos (jÃ¡ lidos em memÃ³ria acima, se precisavam
    // ser reaproveitados) antes de gravar os novos, pra nÃ£o sobrar foto
    // Ã³rfÃ£ em assets/produtos/ com nome antigo.
    for (const imgAntiga of produtoAntigo.imagens || []) {
      const caminho = path.join(PRODUTOS.pastaAssets, imgAntiga.arquivo);
      if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    }

    const imagens = [];
    for (let i = 0; i < imagensFinais.length; i++) {
      const sufixo = imagensFinais.length > 1 ? `-${i + 1}` : "";
      const nomeArquivo = `${slug}${sufixo}.webp`;
      await sharp(imagensFinais[i].buffer).webp({ quality: 85 }).toFile(path.join(PRODUTOS.pastaAssets, nomeArquivo));
      imagens.push({ arquivo: nomeArquivo, alt: imagensFinais[i].alt, proporcao: "3:4" });
    }

    let tamanhos = corpo.tamanhos || [];
    if (!Array.isArray(tamanhos)) tamanhos = [tamanhos];
    let badges = corpo.badges || [];
    if (!Array.isArray(badges)) badges = [badges];
    const tags = (corpo.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    const produto = normalizarProduto({
      ...produtoAntigo,
      nome,
      linha: corpo.linha,
      categoria: corpo.categoria,
      descricaoCurta: corpo.descricaoCurta || "",
      descricaoCompleta: corpo.descricaoCompleta || "",
      composicao: {
        ...produtoAntigo.composicao,
        tecido: corpo.tecido || "PREENCHER â€” confirmar com a marca",
        paisDeFabricacao: corpo.paisDeFabricacao || "Brasil",
      },
      cores: [{ nome: corpo.corNome || "Ãšnico", hex: corpo.corHex || "#F279C8", imagens }],
      tamanhos,
      preco: corpo.preco ? { valor: parseFloat(corpo.preco), parcelamento: corpo.parcelamento || "" } : null,
      imagens,
      badges,
      tags,
      status: corpo.status || produtoAntigo.status || "rascunho",
      canaisPublicacao: lerCanaisPublicacao(corpo.canaisPublicacao, produtoAntigo.canaisPublicacao),
      // id, slug e dataCriacao originais sÃ£o preservados via spread acima.
    });

    const { valido, erros } = validarComSchema(PRODUTOS.schema, produto);
    if (!valido) return res.status(422).json({ erro: "Produto rejeitado pela validaÃ§Ã£o do schema.", detalhes: erros, slug });
    fs.writeFileSync(arquivoDestino, JSON.stringify(produto, null, 2), "utf-8");
    regenerarManifesto(PRODUTOS);
    const resultadoFicha = rodarGerador(PRODUTOS.gerador);

    if (produto.status === "publicado") {
      atualizarSitemapDeterministico();
    }

    let mensagem = "Produto atualizado com sucesso!";
    if (!resultadoFicha.ok) mensagem += " (ficha de produto nÃ£o gerada automaticamente â€” rode: python scripts/gerar-ficha-produto.py â€” ou 'py scripts/gerar-ficha-produto.py' no Windows)";

    res.status(200).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao atualizar o produto.", detalhes: erro.message });
  }
});

// ---------------------------------------------------------------
// ARTIGOS DO BLOG
// ---------------------------------------------------------------

app.get("/api/artigos", (req, res) => {
  const arquivos = fs.readdirSync(ARTIGOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
  const artigos = arquivos.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(ARTIGOS.pastaJSON, f), "utf-8"));
    return { slug: d.slug, titulo: d.titulo, categoria: d.categoria, status: d.status, dataCriacao: d.dataCriacao || null };
  });
  res.json(artigos);
});

// Devolve o cadastro completo de um artigo (pra preencher o formulÃ¡rio
// de ediÃ§Ã£o com o que jÃ¡ estÃ¡ salvo).
app.get("/api/artigos/:slug", (req, res) => {
  const slug = validarSlugParametro(req.params.slug);
  const arquivo = path.join(ARTIGOS.pastaJSON, `${slug}.json`);
  if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: "Artigo nÃ£o encontrado." });
  res.json(JSON.parse(fs.readFileSync(arquivo, "utf-8")));
});

app.post("/api/artigos", upload.single("capa"), async (req, res) => {
  try {
    const corpo = req.body;
    if (req.file) validarArquivosUpload([req.file]);
    const titulo = (corpo.titulo || "").trim();
    const textoCorpo = (corpo.corpo || "").trim();
    if (!titulo) return res.status(400).json({ erro: "TÃ­tulo do artigo Ã© obrigatÃ³rio." });
    if (!textoCorpo) return res.status(400).json({ erro: "O texto do artigo nÃ£o pode ficar vazio." });
    if (!corpo.categoria) return res.status(400).json({ erro: "Selecione uma categoria." });

    const slug = gerarSlug(titulo);
    const id = gerarId("art", slug);
    const arquivoDestino = path.join(ARTIGOS.pastaJSON, `${slug}.json`);
    if (fs.existsSync(arquivoDestino)) {
      return res.status(409).json({ erro: `JÃ¡ existe um artigo com o slug "${slug}". Escolha um tÃ­tulo diferente.` });
    }
    if (!req.file) return res.status(400).json({ erro: "Envie a foto de capa do artigo." });

    const nomeArquivoCapa = `${slug}.webp`;
    await sharp(req.file.buffer).webp({ quality: 85 }).toFile(path.join(ARTIGOS.pastaAssets, nomeArquivoCapa));

    const palavras = textoCorpo.split(/\s+/).filter(Boolean).length;
    const tempoLeitura = `${Math.max(1, Math.round(palavras / 200))} min de leitura`;

    const artigo = {
      id, slug, titulo,
      categoria: corpo.categoria,
      resumo: (corpo.resumo || "").trim(),
      corpo: textoCorpo,
      capa: { arquivo: nomeArquivoCapa, alt: titulo },
      tempoLeitura,
      status: corpo.status || "rascunho",
      dataCriacao: new Date().toISOString().slice(0, 10),
    };

    const { valido, erros } = validarComSchema(ARTIGOS.schema, artigo);
    if (!valido) return res.status(422).json({ erro: "Artigo rejeitado pela validaÃ§Ã£o do schema.", detalhes: erros });
    fs.writeFileSync(arquivoDestino, JSON.stringify(artigo, null, 2), "utf-8");
    regenerarManifesto(ARTIGOS);
    const resultadoPagina = rodarGerador(ARTIGOS.gerador);

    if (artigo.status === "publicado") {
      atualizarSitemapDeterministico();
    }

    let mensagem = "Artigo salvo com sucesso!";
    mensagem += artigo.status === "publicado"
      ? " JÃ¡ vai aparecer na grade da Revista Turkista (blog.html)."
      : " EstÃ¡ como rascunho â€” mude o status para \"Publicado\" quando quiser que ele apareÃ§a no Blog.";
    if (!resultadoPagina.ok) mensagem += " (pÃ¡gina do artigo nÃ£o gerada automaticamente â€” rode: python scripts/gerar-artigo-blog.py â€” ou 'py scripts/gerar-artigo-blog.py' no Windows)";

    res.status(201).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar o artigo.", detalhes: erro.message });
  }
});

// Edita um artigo jÃ¡ existente. Slug (URL do artigo) fica travado â€”
// mudar o "tÃ­tulo" sÃ³ atualiza o texto exibido, nÃ£o o endereÃ§o da
// pÃ¡gina. A foto de capa Ã© opcional aqui: sÃ³ troca se uma nova for
// enviada, senÃ£o mantÃ©m a atual.
app.put("/api/artigos/:slug", upload.single("novaCapa"), async (req, res) => {
  try {
    const slug = validarSlugParametro(req.params.slug);
    const arquivoDestino = path.join(ARTIGOS.pastaJSON, `${slug}.json`);
    if (!fs.existsSync(arquivoDestino)) return res.status(404).json({ erro: "Artigo nÃ£o encontrado." });

    const artigoAntigo = JSON.parse(fs.readFileSync(arquivoDestino, "utf-8"));
    const corpo = req.body;
    if (req.file) validarArquivosUpload([req.file]);
    const titulo = (corpo.titulo || "").trim();
    const textoCorpo = (corpo.corpo || "").trim();
    if (!titulo) return res.status(400).json({ erro: "TÃ­tulo do artigo Ã© obrigatÃ³rio." });
    if (!textoCorpo) return res.status(400).json({ erro: "O texto do artigo nÃ£o pode ficar vazio." });
    if (!corpo.categoria) return res.status(400).json({ erro: "Selecione uma categoria." });

    let nomeArquivoCapa = artigoAntigo.capa?.arquivo || `${slug}.webp`;
    if (req.file) {
      // Sempre grava com o nome padrÃ£o <slug>.webp, sobrescrevendo a capa
      // anterior â€” mesmo comportamento de "trocar foto" da aba Fotos do Site.
      nomeArquivoCapa = `${slug}.webp`;
      await sharp(req.file.buffer).webp({ quality: 85 }).toFile(path.join(ARTIGOS.pastaAssets, nomeArquivoCapa));
    }

    const palavras = textoCorpo.split(/\s+/).filter(Boolean).length;
    const tempoLeitura = `${Math.max(1, Math.round(palavras / 200))} min de leitura`;

    const artigo = {
      ...artigoAntigo,
      titulo,
      categoria: corpo.categoria,
      resumo: (corpo.resumo || "").trim(),
      corpo: textoCorpo,
      capa: { arquivo: nomeArquivoCapa, alt: titulo },
      tempoLeitura,
      status: corpo.status || artigoAntigo.status || "rascunho",
      // id, slug e dataCriacao originais sÃ£o preservados via spread acima.
    };

    const { valido, erros } = validarComSchema(ARTIGOS.schema, artigo);
    if (!valido) return res.status(422).json({ erro: "Artigo rejeitado pela validaÃ§Ã£o do schema.", detalhes: erros, slug });
    fs.writeFileSync(arquivoDestino, JSON.stringify(artigo, null, 2), "utf-8");
    regenerarManifesto(ARTIGOS);
    const resultadoPagina = rodarGerador(ARTIGOS.gerador);

    if (artigo.status === "publicado") {
      atualizarSitemapDeterministico();
    }

    let mensagem = "Artigo atualizado com sucesso!";
    if (!resultadoPagina.ok) mensagem += " (pÃ¡gina do artigo nÃ£o gerada automaticamente â€” rode: python scripts/gerar-artigo-blog.py â€” ou 'py scripts/gerar-artigo-blog.py' no Windows)";

    res.status(200).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao atualizar o artigo.", detalhes: erro.message });
  }
});

// ---------------------------------------------------------------
// FOTOS INSTITUCIONAIS (hero, linhas, colagem "Sobre", capas do Blog)
// ---------------------------------------------------------------

app.get("/api/fotos-institucionais/slots", (req, res) => {
  // Slots fixos (hero, linhas, colagem) + um slot por artigo jÃ¡ existente
  // (os 9 originais + os cadastrados no painel), pra cobrir as capas do Blog tambÃ©m.
  const slotsBlogOriginais = [
    ["cuidados-biquini", "Como cuidar do seu biquÃ­ni e fazer durar muito mais"],
    ["tecido-certo", "O tecido certo faz toda a diferenÃ§a"],
    ["moda-praia-ano-inteiro", "Moda praia o ano inteiro"],
    ["biquini-ou-top", "BiquÃ­ni ou top esportivo?"],
    ["atelie-peca-pronta", "Do ateliÃª Ã  peÃ§a pronta"],
    ["lavagem-secagem", "Lavagem, secagem e armazenamento corretos"],
    ["fabricacao-propria", "FabricaÃ§Ã£o prÃ³pria: por que fazemos assim"],
    ["pecas-movimento", "PeÃ§as que te acompanham em cada movimento"],
    ["cores-tom-de-pele", "Cores que valorizam seu tom de pele"],
  ].map(([slug, titulo]) => ({
    chave: `blog-${slug}`, pasta: "blog", arquivo: `${slug}.webp`,
    rotulo: `Capa do artigo: ${titulo}`, descricao: "Revista Turkista (blog.html)",
  }));

  const arquivosArtigos = fs.readdirSync(ARTIGOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
  const slotsBlogNovos = arquivosArtigos.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(ARTIGOS.pastaJSON, f), "utf-8"));
    return { chave: `blog-${d.slug}`, pasta: "blog", arquivo: `${d.slug}.webp`, rotulo: `Capa do artigo: ${d.titulo}`, descricao: "Revista Turkista (blog.html) â€” cadastrado no painel" };
  });

  const todosSlots = [...SLOTS_FOTOS_INSTITUCIONAIS, ...slotsBlogOriginais, ...slotsBlogNovos];

  const comStatus = todosSlots.map((s) => ({
    ...s,
    existe: fs.existsSync(path.join(RAIZ_PROJETO, "assets", s.pasta, s.arquivo)),
  }));

  res.json(comStatus);
});

app.post("/api/fotos-institucionais", upload.single("foto"), async (req, res) => {
  try {
    const { chave } = req.body;
    if (!chave) return res.status(400).json({ erro: "Selecione onde essa foto entra no site." });
    if (!req.file) return res.status(400).json({ erro: "Escolha uma foto para enviar." });

    let slot = SLOTS_FOTOS_INSTITUCIONAIS.find((s) => s.chave === chave);
    if (!slot && chave.startsWith("blog-")) {
      const slug = chave.replace(/^blog-/, "");
      slot = { pasta: "blog", arquivo: `${slug}.webp` };
    }
    if (!slot) return res.status(400).json({ erro: "Destino da foto nÃ£o reconhecido." });

    const pastaDestino = path.join(RAIZ_PROJETO, "assets", slot.pasta);
    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });

    await sharp(req.file.buffer).webp({ quality: 85 }).toFile(path.join(pastaDestino, slot.arquivo));

    res.status(201).json({ mensagem: `Foto salva em assets/${slot.pasta}/${slot.arquivo} â€” jÃ¡ aparece no site.` });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar a foto.", detalhes: erro.message });
  }
});


// ---------------------------------------------------------------
// PINTEREST / OAUTH
// ---------------------------------------------------------------

app.get("/api/pinterest/status", (req, res) => {
  try { res.json(pinterestOAuth.status()); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get("/api/pinterest/oauth/start", (req, res) => {
  try {
    const { url } = pinterestOAuth.urlAutorizacao();
    res.redirect(url);
  } catch (erro) {
    res.status(409).send("Pinterest OAuth nÃ£o configurado. " + erro.message);
  }
});

app.get("/api/pinterest/oauth/callback", async (req, res) => {
  try {
    if (req.query.error) {
      return res.status(400).send("Pinterest OAuth cancelado ou recusado: " + String(req.query.error));
    }
    if (!pinterestOAuth.validarState(req.query.state)) {
      return res.status(400).send("Estado OAuth invÃ¡lido ou expirado. Inicie a conexÃ£o novamente pelo painel.");
    }
    if (!req.query.code) {
      return res.status(400).send("Pinterest nÃ£o retornou o cÃ³digo de autorizaÃ§Ã£o.");
    }
    await pinterestOAuth.trocarCodigoPorToken(req.query.code);
    res.redirect("/pinterest.html?conectado=1");
  } catch (erro) {
    console.error("Pinterest OAuth:", erro);
    res.status(500).send("NÃ£o foi possÃ­vel concluir a conexÃ£o com o Pinterest. " + erro.message);
  }
});

app.post("/api/pinterest/disconnect", (req, res) => {
  try {
    res.json({ ok: true, ...pinterestOAuth.desconectar(), mensagem: "Conta Pinterest desconectada deste painel." });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: erro.message });
  }
});

app.get("/api/pinterest/user", async (req, res) => {
  try {
    const dados = await pinterestOAuth.api("/user_account");
    res.json(dados);
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

// ---------------------------------------------------------------
 // PINTEREST / BOARDS / PINS
 // ---------------------------------------------------------------

app.get("/api/pinterest/boards", async (req, res) => {
  try {
    const boards = await pinterestPublicacao.listarBoards();
    res.json({ items: boards });
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

app.post("/api/pinterest/boards", async (req, res) => {
  try {
    const nome = String(req.body?.name || "").trim();
    const descricao = String(req.body?.description || "").trim();
    if (!nome) return res.status(400).json({ erro: "O nome do Board Ã© obrigatÃ³rio." });
    const board = await pinterestPublicacao.criarBoard({ name: nome, description: descricao });
    res.status(201).json(board);
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

app.get("/api/pinterest/produtos", (req, res) => {
  try {
    const produtos = pinterestPublicacao.listarProdutos().map(p => ({
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      descricaoCurta: p.descricaoCurta || "",
      descricaoCompleta: p.descricaoCompleta || "",
      status: p.status,
      imagem: pinterestPublicacao.imagemPrincipal(p),
      link: pinterestPublicacao.urlProduto(p),
    }));
    res.json({ items: produtos });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.get("/api/pinterest/publicacoes", (req, res) => {
  try {
    res.json({ items: pinterestPublicacao.historico() });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/pinterest/pins", async (req, res) => {
  try {
    const resultado = await pinterestPublicacao.publicarPin({
      slug: req.body?.slug,
      boardId: req.body?.boardId,
      title: req.body?.title,
      description: req.body?.description,
      link: req.body?.link,
    });
    res.status(201).json(resultado);
  } catch (erro) {
    res.status(erro.status || 500).json({
      erro: erro.message,
      publicacao: erro.publicacao || null,
      detalhes: erro.dados || null,
    });
  }
});

// ---------------------------------------------------------------
// TIKTOK / OAUTH + CONTENT POSTING API
// ---------------------------------------------------------------

app.get("/api/tiktok/status", (req, res) => {
  try { res.json(tiktokOAuth.status()); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get("/api/tiktok/oauth/start", (req, res) => {
  try {
    const { url } = tiktokOAuth.urlAutorizacao();
    res.redirect(url);
  } catch (erro) {
    res.status(409).send("TikTok OAuth nÃ£o configurado. " + erro.message);
  }
});

app.get("/api/tiktok/oauth/callback", async (req, res) => {
  try {
    if (req.query.error) {
      return res.status(400).send(
        "TikTok OAuth cancelado ou recusado: " +
        String(
          req.query.error_description ||
          req.query.error
        )
      );
    }

    const oauthState =
      tiktokOAuth.validarState(req.query.state);

    if (!oauthState) {
      return res.status(400).send(
        "Estado OAuth inválido ou expirado. " +
        "Inicie a conexão novamente pelo painel."
      );
    }

    if (!req.query.code) {
      return res.status(400).send(
        "TikTok não retornou o código de autorização."
      );
    }

    await tiktokOAuth.trocarCodigoPorToken(
      req.query.code,
      oauthState.codeVerifier
    );

    res.redirect("/tiktok.html?conectado=1");
  } catch (erro) {
    console.error("TikTok OAuth:", erro);

    res.status(500).send(
      "Não foi possível concluir a conexão com o TikTok. " +
      erro.message
    );
  }
});
app.get("/api/tiktok/publicacoes", (req, res) => {
  try { res.json({ items: tiktokPublicacao.historico() }); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.post("/api/tiktok/upload", videoUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: "Selecione um vÃ­deo." });
    const resultado = await tiktokPublicacao.iniciarUploadVideo({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });
    res.status(201).json(resultado);
  } catch (erro) {
    console.error("TikTok upload:", erro);
    res.status(erro.status || 500).json({
      erro: erro.message,
      detalhes: erro.dados || null,
    });
  }
});

app.get("/api/tiktok/status/:publishId", async (req, res) => {
  try {
    const resultado = await tiktokPublicacao.consultarStatus(req.params.publishId);
    res.json(resultado);
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

// ---------------------------------------------------------------
// INSTAGRAM / OAUTH + CONTENT PUBLISHING
// ---------------------------------------------------------------

app.get("/api/instagram/status", (req, res) => {
  try { res.json(instagramOAuth.status()); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get("/api/instagram/oauth/start", (req, res) => {
  try {
    const { url } = instagramOAuth.urlAutorizacao();
    res.redirect(url);
  } catch (erro) {
    res.status(409).send("Instagram OAuth nÃ£o configurado. " + erro.message);
  }
});

app.get("/api/instagram/oauth/callback", async (req, res) => {
  try {
    if (req.query.error) {
      return res.status(400).send("Instagram OAuth cancelado ou recusado: " + String(req.query.error_description || req.query.error));
    }
    if (!instagramOAuth.validarState(req.query.state)) {
      return res.status(400).send("Estado OAuth invÃ¡lido ou expirado. Inicie a conexÃ£o novamente pelo painel.");
    }
    if (!req.query.code) {
      return res.status(400).send("Instagram nÃ£o retornou o cÃ³digo de autorizaÃ§Ã£o.");
    }
    await instagramOAuth.trocarCodigoPorToken(req.query.code);
    res.redirect("/instagram.html?conectado=1");
  } catch (erro) {
    console.error("Instagram OAuth:", erro);
    res.status(500).send("NÃ£o foi possÃ­vel concluir a conexÃ£o com o Instagram. " + erro.message);
  }
});

app.post("/api/instagram/disconnect", (req, res) => {
  try { res.json({ ok: true, ...instagramOAuth.desconectar() }); }
  catch (erro) { res.status(500).json({ ok: false, erro: erro.message }); }
});

app.get("/api/instagram/user", async (req, res) => {
  try {
    res.json(await instagramOAuth.api("/me?fields=id,user_id,username,name,account_type,profile_picture_url"));
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

app.get("/api/instagram/produtos", (req, res) => {
  try {
    res.json({
      items: instagramPublicacao.listarProdutos().map(p => ({
        id: p.id,
        slug: p.slug,
        nome: p.nome,
        descricaoCurta: p.descricaoCurta || "",
        status: p.status,
        imagem: instagramPublicacao.imagemPrincipal(p),
        link: instagramPublicacao.urlProduto(p),
      }))
    });
  } catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get("/api/instagram/publicacoes", (req, res) => {
  try { res.json({ items: instagramPublicacao.historico() }); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.post("/api/instagram/publicar", async (req, res) => {
  try {
    const resultado = await instagramPublicacao.publicarMidia({
      slug: req.body?.slug,
      mediaUrl: req.body?.mediaUrl,
      tipo: req.body?.tipo || "imagem",
      caption: req.body?.caption,
      altText: req.body?.altText,
    });
    res.status(201).json(resultado);
  } catch (erro) {
    res.status(erro.status || 500).json({
      erro: erro.message,
      publicacao: erro.publicacao || null,
      detalhes: erro.dados || null,
    });
  }
});

app.get("/api/instagram/midias", async (req, res) => {
  try { res.json(await instagramPublicacao.listarMidias({ limit: req.query.limit || 50 })); }
  catch (erro) { res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null }); }
});

app.post("/api/desempenho/instagram/sincronizar", async (req, res) => {
  try { res.json(await instagramPublicacao.sincronizarMetricas()); }
  catch (erro) {
    console.error("Instagram sincronizaÃ§Ã£o:", erro);
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.dados || null });
  }
});

// ---------------------------------------------------------------
// STATUS DO GOOGLE MERCHANT
// ---------------------------------------------------------------
app.get("/api/desempenho/google-merchant/config", (req, res) => {
  try {
    const config = googleMerchant.getConfig();
    let credencialDisponivel = false;
    try {
      googleMerchant.getCredentialPath();
      credencialDisponivel = true;
    } catch (erro) {}

    res.json({
      ok: true,
      accountId: config.accountId,
      dataSourceId: config.dataSourceId,
      siteBaseUrl: config.siteBaseUrl,
      credencialDisponivel
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ---------------------------------------------------------------
// ANÃLISE DE DESEMPENHO
// ---------------------------------------------------------------
app.get("/api/google-merchant/produtos", async (req, res) => {
  try {
    const resultado = await googleMerchant.listarProdutos({ limite: req.query.limite || 1000 });
    const arquivos = fs.readdirSync(PRODUTOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
    const catalogo = arquivos.map((f) => {
      const produto = JSON.parse(fs.readFileSync(path.join(PRODUTOS.pastaJSON, f), "utf-8"));
      return { id: produto.id ? String(produto.id) : "", slug: produto.slug || "", nome: produto.nome || "", statusCms: produto.status || "" };
    });
    const porId = new Map(catalogo.filter(p => p.id).map(p => [p.id, p]));
    const usados = new Set();
    const itens = (resultado.products || []).map((produto) => {
      const offerId = String(produto.offerId || "").trim();
      const local = porId.get(offerId) || null;
      if (local) usados.add(local.id);
      const status = produto.productStatus || {};
      const issues = Array.isArray(status.itemLevelIssues) ? status.itemLevelIssues : [];
      const destinations = Array.isArray(status.destinationStatuses) ? status.destinationStatuses : [];
      const temDestinoReprovado = destinations.some(d => Array.isArray(d.disapprovedCountries) && d.disapprovedCountries.length > 0);
      const temDestinoPendente = destinations.some(d => Array.isArray(d.pendingCountries) && d.pendingCountries.length > 0);
      const temDestinoAprovado = destinations.some(d => Array.isArray(d.approvedCountries) && d.approvedCountries.length > 0);
      const temRevisaoInicial = issues.some(i => String(i.code || "").toLowerCase().startsWith("pending_initial_policy_review"));
      const temProblemaReal = issues.some(i => {
        const code = String(i.code || "").toLowerCase();
        return !code.startsWith("pending_initial_policy_review");
      });
      const estado = temDestinoReprovado || issues.some(i => String(i.severity || "").toUpperCase() === "DISAPPROVED" && !String(i.code || "").toLowerCase().startsWith("pending_initial_policy_review"))
        ? "reprovado"
        : temDestinoPendente || temRevisaoInicial
          ? "pendente"
          : temProblemaReal
            ? "problema"
            : temDestinoAprovado
              ? "aprovado"
              : destinations.length
                ? "processando"
                : "sem_destino";
      return {
        name: produto.name || "", offerId,
        titulo: produto.productAttributes?.title || produto.title || offerId || "Produto sem tÃ­tulo",
        link: produto.productAttributes?.link || produto.link || "",
        imageLink: produto.productAttributes?.imageLink || produto.imageLink || "",
        estado,
        problemas: issues.map(i => ({ severity: i.severity || "", code: i.code || "", attribute: i.attribute || "", description: i.description || i.detail || "" })).slice(0, 5),
        destinos: destinations.map(d => ({ reportingContext: d.reportingContext || "", approvedCountries: d.approvedCountries || [], pendingCountries: d.pendingCountries || [], disapprovedCountries: d.disapprovedCountries || [] })),
        cms: local
      };
    });
    for (const local of catalogo) {
      if (!usados.has(local.id)) {
        itens.push({ name: "", offerId: local.id, titulo: local.nome || local.id, link: local.slug ? "/produto/" + encodeURIComponent(local.slug) + ".html" : "", imageLink: "", estado: "nao_encontrado", problemas: [], destinos: [], cms: local });
      }
    }
    const resumo = {
      merchant: resultado.total || 0,
      aprovados: itens.filter(p => p.estado === "aprovado").length,
      pendentes: itens.filter(p => p.estado === "pendente" || p.estado === "processando").length,
      problemas: itens.filter(p => p.estado === "problema" || p.estado === "reprovado").length,
      naoEncontrados: itens.filter(p => p.estado === "nao_encontrado").length,
      cms: catalogo.length
    };
    res.json({ ok: true, ...resumo, produtos: itens });
  } catch (erro) {
    res.status(erro.status || 500).json({ erro: erro.message, detalhes: erro.response?.data || erro.dados || null });
  }
});
app.get("/api/desempenho/google-merchant", async (req, res) => {
  try {
    const inicio = String(req.query.inicio || "").trim();
    const fim = String(req.query.fim || "").trim();
    const resultado = await googleMerchant.buscarDesempenhoProdutos({ inicio, fim });
    res.json(resultado);
  } catch (erro) {
    res.status(erro.status || 500).json({
      erro: erro.message,
      detalhes: erro.response?.data || erro.dados || null
    });
  }
});

app.post("/api/desempenho/google-merchant/sincronizar", async (req, res) => {
  try {
    const inicio = String(req.body?.inicio || "").trim();
    const fim = String(req.body?.fim || "").trim();
    if (!inicio || !fim) {
      return res.status(400).json({ erro: "Informe inicio e fim no formato YYYY-MM-DD." });
    }

    const resultado = await googleMerchant.buscarDesempenhoProdutos({ inicio, fim });
    const linhas = Array.isArray(resultado?.results) ? resultado.results : [];
    const arquivos = fs.readdirSync(PRODUTOS.pastaJSON)
      .filter((f) => f.endsWith(".json") && f !== "index.json");

    const produtos = arquivos.map((f) => {
      const produto = JSON.parse(fs.readFileSync(path.join(PRODUTOS.pastaJSON, f), "utf-8"));
      return { ...produto, _arquivo: f };
    });

    const porOfferId = new Map();
    for (const produto of produtos) {
      if (produto.id) porOfferId.set(String(produto.id), produto);
    }

    const metricas = ["impressions", "clicks", "click_through_rate", "conversions", "conversion_rate"];
    let metricasNovas = 0;
    let publicacoesNovas = 0;
    let linhasComProduto = 0;

    for (const linha of linhas) {
      const view = linha?.productPerformanceView || linha?.product_performance_view || {};
      const offerId = String(view.offerId || view.offer_id || "").trim();
      const produto = porOfferId.get(offerId);
      if (!offerId || !produto) continue;

      linhasComProduto++;
      const dataObj = view.date || {};
      const data = dataObj.year
        ? new Date(Date.UTC(Number(dataObj.year), Number(dataObj.month || 1) - 1, Number(dataObj.day || 1))).toISOString()
        : new Date().toISOString();
      const canalMarketing = String(view.marketingMethod || view.marketing_method || "UNKNOWN").toLowerCase();

      const publicacaoExistente = desempenho.listarPublicacoes({
        produto_id: produto.id,
        canal: "googleMerchant"
      }).some((p) => p.external_id === offerId + ":" + canalMarketing);

      if (!publicacaoExistente) {
        desempenho.registrarPublicacao({
          produto_id: produto.id,
          slug: produto.slug,
          canal: "googleMerchant",
          external_id: offerId + ":" + canalMarketing,
          status: "ativo",
          data,
          metadados: {
            marketing_method: canalMarketing,
            inicio,
            fim
          }
        });
        publicacoesNovas++;
      }

      for (const nomeMetrica of metricas) {
        const valorBruto = view[nomeMetrica] ?? view[
          nomeMetrica.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase())
        ];
        if (valorBruto === undefined || valorBruto === null) continue;

        const valor = Number(valorBruto);
        if (!Number.isFinite(valor)) continue;

        const duplicada = desempenho.listarMetricas({
          produto_id: produto.id,
          canal: "googleMerchant",
          metrica: nomeMetrica
        }).some((m) =>
          m.data === data &&
          Number(m.valor) === valor &&
          m.metadados?.marketing_method === canalMarketing
        );

        if (!duplicada) {
          desempenho.registrarMetrica({
            publicacao_id: offerId + ":" + canalMarketing,
            produto_id: produto.id,
            slug: produto.slug,
            canal: "googleMerchant",
            metrica: nomeMetrica,
            valor,
            unidade: nomeMetrica.includes("rate") ? "percentual" : "numero",
            data,
            origem: "google_merchant_api",
            metadados: {
              offer_id: offerId,
              marketing_method: canalMarketing,
              inicio,
              fim,
              titulo: view.title || null
            }
          });
          metricasNovas++;
        }
      }
    }

    res.json({
      ok: true,
      periodo: { inicio, fim },
      linhas_recebidas: linhas.length,
      linhas_com_produto: linhasComProduto,
      publicacoes_novas: publicacoesNovas,
      metricas_novas: metricasNovas
    });
  } catch (erro) {
    console.error("Google Merchant sincronizaÃ§Ã£o:", erro);
    res.status(erro.status || 500).json({
      erro: erro.message,
      detalhes: erro.response?.data || erro.dados || null
    });
  }
});

app.get("/api/desempenho/google-analytics", async (req, res) => {
  try {
    const periodo = String(req.query.periodo || "30").trim();

    const periodosPermitidos = new Set(["7", "30", "90", "todos"]);

    if (!periodosPermitidos.has(periodo)) {
      return res.status(400).json({
        ok: false,
        erro: "PerÃ­odo invÃ¡lido. Use 7, 30, 90 ou todos."
      });
    }

    const resultado = await googleAnalytics.relatorioCompleto(periodo);

    res.json(resultado);
  } catch (erro) {
    console.error("Google Analytics:", erro);

    res.status(500).json({
      ok: false,
      erro: erro.message,
      detalhes: erro.response?.data || erro.dados || null
    });
  }
});
app.get("/api/desempenho/status-atual", async (req, res) => {
  try {
    const arquivos = fs.readdirSync(PRODUTOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
    let google = null;
    try {
      const resultado = await googleMerchant.listarProdutos({ limite: 1000 });
      google = { total: resultado.total || 0 };
    } catch (erro) {
      google = { total: null, erro: erro.message };
    }
    res.json({
      ok: true,
      site: { total: arquivos.length },
      googleMerchant: google
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.get("/api/desempenho/resumo", (req, res) => {
  try { res.json(desempenho.resumo()); }
  catch (erro) { res.status(500).json({ erro: erro.message }); }
});

app.get("/api/desempenho/publicacoes", (req, res) => {
  try {
    res.json({ items: desempenho.listarPublicacoes({
      canal: req.query.canal,
      produto_id: req.query.produto_id,
      slug: req.query.slug
    }) });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.get("/api/desempenho/metricas", (req, res) => {
  try {
    res.json({ items: desempenho.listarMetricas({
      canal: req.query.canal,
      produto_id: req.query.produto_id,
      slug: req.query.slug,
      metrica: req.query.metrica
    }) });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/desempenho/publicacoes", (req, res) => {
  try {
    res.status(201).json(desempenho.registrarPublicacao(req.body || {}));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.post("/api/desempenho/metricas", (req, res) => {
  try {
    res.status(201).json(desempenho.registrarMetrica(req.body || {}));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.listen(PORTA, "0.0.0.0", () => {
  console.log("");
  console.log("=================================================");
  console.log("  Painel Turkista rodando!");
  console.log(`  Abra no navegador: http://localhost:${PORTA}`);
  console.log(`  Ver o site com o catÃ¡logo/blog reais: http://localhost:${PORTA}/site/catalogo.html`);
  console.log("  (abrir catalogo.html/blog.html direto do disco nÃ£o carrega os produtos/artigos reais)");
  console.log("  Pra parar: Ctrl+C aqui no terminal");
  console.log("=================================================");
  console.log("");
});

