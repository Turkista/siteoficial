// Painel local — Turkista
//
// Um único servidor Node local com três funções:
// 1. Cadastro de PRODUTOS (aba "Produtos") — gera .json + ficha de produto
// 2. Cadastro de ARTIGOS da Revista Turkista (aba "Artigos do Blog") — gera
//    .json + página do artigo
// 3. Envio de FOTOS INSTITUCIONAIS (aba "Fotos do Site") — hero da Home,
//    fotos das 3 linhas, colagem "Sobre a Turkista" e capas do Blog
//
// Tudo roda 100% local — não sobe nada pra internet, não precisa de
// internet depois de instalado (só na hora do "npm install").

const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const { spawnSync } = require("child_process");

const app = express();
const PORTA = 3000;

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

// Slots de fotos institucionais conhecidos — nome de arquivo exato que
// cada página espera (documentado nos READMEs de assets/*), pra o painel
// nunca salvar com nome errado.
const SLOTS_FOTOS_INSTITUCIONAIS = [
  { chave: "hero-praia", pasta: "hero", arquivo: "hero-praia.webp", rotulo: "Hero da Home", descricao: "Foto principal do topo da Home (index.html)" },
  { chave: "linha-praia", pasta: "linhas", arquivo: "praia.webp", rotulo: "Card da linha Praia (Home)", descricao: "Foto do card \"Moda Praia\" na Home" },
  { chave: "linha-surf", pasta: "linhas", arquivo: "surf.webp", rotulo: "Card da linha Surf (Home)", descricao: "Foto do card \"Surf\" na Home" },
  { chave: "linha-turk-fit", pasta: "linhas", arquivo: "turk-fit.webp", rotulo: "Card da linha Turk Fit (Home)", descricao: "Foto do card \"Turk Fit\" na Home" },
  { chave: "bastidores-1", pasta: "sobre", arquivo: "bastidores-1.webp", rotulo: "Colagem \"Sobre a Turkista\" — foto grande", descricao: "Foto grande à esquerda da colagem, na Home" },
  { chave: "bastidores-2", pasta: "sobre", arquivo: "bastidores-2.webp", rotulo: "Colagem \"Sobre a Turkista\" — foto pequena (topo)", descricao: "Foto pequena superior direita da colagem, na Home" },
  { chave: "bastidores-3", pasta: "sobre", arquivo: "bastidores-3.webp", rotulo: "Colagem \"Sobre a Turkista\" — foto pequena (base)", descricao: "Foto pequena inferior direita da colagem, na Home" },
];

for (const pasta of [PRODUTOS.pastaJSON, PRODUTOS.pastaAssets, ARTIGOS.pastaJSON, ARTIGOS.pastaAssets]) {
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
}

app.use(express.static(path.join(__dirname, "public")));
// Serve o site completo (catalogo.html, blog.html etc.) em /site — em rota
// separada da UI do painel (que já usa "/") pra não haver conflito entre os
// dois index.html. Isso existe porque os scripts catalogo-dinamico.js e
// blog-dinamico.js usam fetch() pra buscar o manifesto de produtos/artigos,
// e fetch() é bloqueado por segurança quando a página é aberta direto do
// disco (file://) — abrindo por aqui (http://localhost:3000/site/...) o
// fetch funciona normalmente e o catálogo real aparece na pré-visualização.
app.use("/site", express.static(RAIZ_PROJETO));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------------
// Utilitários gerais
// ---------------------------------------------------------------

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

// Reconstrói o index.json de uma pasta de conteúdo (produtos ou artigos) —
// é este arquivo que o site lê no navegador pra montar os cards sozinho.
function regenerarManifesto(config) {
  const arquivos = fs
    .readdirSync(config.pastaJSON)
    .filter((f) => f.endsWith(".json") && f !== "index.json");
  const itens = arquivos.map((f) => JSON.parse(fs.readFileSync(path.join(config.pastaJSON, f), "utf-8")));
  fs.writeFileSync(path.join(config.pastaJSON, "index.json"), JSON.stringify(itens, null, 2), "utf-8");
  return itens.length;
}

// Roda o gerador Python correspondente (ficha de produto ou artigo de blog).
// Tenta "python3", "python" e "py" (o lançador oficial do Python no
// Windows). Importante: no Windows, o comando "python" às vezes existe mas
// é só o atalho falso da Microsoft Store (não erra ao rodar, só não faz
// nada útil) — por isso continuamos tentando os próximos comandos sempre
// que o resultado não for "sucesso real" (status 0), não só quando o
// comando não existe de verdade.
function rodarGerador(caminhoScript) {
  if (!fs.existsSync(caminhoScript)) return { ok: false, motivo: "script não encontrado" };

  let ultimoErro = "nenhum interpretador Python funcionou";
  for (const comando of ["python3", "python", "py"]) {
    const resultado = spawnSync(comando, [caminhoScript], { cwd: RAIZ_PROJETO, encoding: "utf-8" });
    if (resultado.error) {
      continue; // comando não existe de verdade — tenta o próximo
    }
    if (resultado.status === 0) {
      return { ok: true }; // sucesso real
    }
    // Comando existe mas falhou (pode ser o atalho fake da Microsoft Store,
    // pode ser erro real no script) — guarda o erro e tenta o próximo
    // comando antes de desistir.
    ultimoErro = resultado.stderr || `saiu com código ${resultado.status}`;
  }

  console.warn(`Aviso: não consegui gerar a página automaticamente (${path.basename(caminhoScript)}). Último erro: ${ultimoErro}`);
  console.warn(`Rode manualmente: py scripts/${path.basename(caminhoScript)}  (ou "python scripts/..." / "python3 scripts/...")`);
  return { ok: false, motivo: ultimoErro };
}

// Acrescenta uma URL nova ao sitemap.xml, se ainda não existir. Só é
// chamado para itens com status "publicado" — rascunhos não entram no SEO.
function adicionarAoSitemap(caminhoRelativo) {
  if (!fs.existsSync(CAMINHO_SITEMAP)) return;
  const conteudo = fs.readFileSync(CAMINHO_SITEMAP, "utf-8");
  const url = `https://www.turkista.com.br/${caminhoRelativo}`;
  if (conteudo.includes(`<loc>${url}</loc>`)) return; // já existe

  const novaEntrada = `  <url>\n    <loc>${url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>`;
  const atualizado = conteudo.replace(/<\/urlset>\s*$/, novaEntrada);
  fs.writeFileSync(CAMINHO_SITEMAP, atualizado, "utf-8");
}

function validarComSchema(caminhoSchema, objeto) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(fs.readFileSync(caminhoSchema, "utf-8"));
  const validar = ajv.compile(schema);
  return { valido: validar(objeto), erros: validar.errors };
}

// Garante que os manifestos já existem assim que o painel sobe.
regenerarManifesto(PRODUTOS);
regenerarManifesto(ARTIGOS);

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
// formulário de edição com o que já está salvo).
app.get("/api/produtos/:slug", (req, res) => {
  const arquivo = path.join(PRODUTOS.pastaJSON, `${req.params.slug}.json`);
  if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: "Produto não encontrado." });
  res.json(JSON.parse(fs.readFileSync(arquivo, "utf-8")));
});

app.post("/api/produtos", upload.array("fotos", 6), async (req, res) => {
  try {
    const corpo = req.body;
    const nome = (corpo.nome || "").trim();
    if (!nome) return res.status(400).json({ erro: "Nome do produto é obrigatório." });

    const slug = gerarSlug(nome);
    const id = gerarId("prod", slug);
    const arquivoDestino = path.join(PRODUTOS.pastaJSON, `${slug}.json`);
    if (fs.existsSync(arquivoDestino)) {
      return res.status(409).json({ erro: `Já existe um produto com o slug "${slug}". Escolha um nome diferente.` });
    }

    const arquivos = req.files || [];
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

    const produto = {
      id, slug, nome,
      linha: corpo.linha,
      categoria: corpo.categoria,
      descricaoCurta: corpo.descricaoCurta || "",
      descricaoCompleta: corpo.descricaoCompleta || "",
      composicao: {
        tecido: corpo.tecido || "PREENCHER — confirmar com a marca",
        protecaoUV: null,
        paisDeFabricacao: corpo.paisDeFabricacao || "Brasil",
      },
      cores: [{ nome: corpo.corNome || "Único", hex: corpo.corHex || "#F279C8", imagens }],
      tamanhos,
      preco: corpo.preco ? { valor: parseFloat(corpo.preco), parcelamento: corpo.parcelamento || "" } : null,
      imagens,
      badges,
      tags,
      status: corpo.status || "rascunho",
      dataCriacao: new Date().toISOString().slice(0, 10),
    };

    const { valido, erros } = validarComSchema(PRODUTOS.schema, produto);
    fs.writeFileSync(arquivoDestino, JSON.stringify(produto, null, 2), "utf-8");
    regenerarManifesto(PRODUTOS);
    const resultadoFicha = rodarGerador(PRODUTOS.gerador);

    if (!valido) {
      return res.status(200).json({ aviso: "Produto salvo, mas com pendências no schema — revise antes de publicar.", detalhes: erros, slug });
    }

    if (produto.status === "publicado") {
      adicionarAoSitemap(`${PRODUTOS.paginaSlugPrefixo}${slug}.html`);
    }

    let mensagem = "Produto salvo com sucesso!";
    mensagem += produto.status === "publicado"
      ? " Já vai aparecer no Catálogo e, se estiver entre os mais recentes, na Home também."
      : " Está como rascunho — mude o status para \"Publicado\" quando quiser que ele apareça no site.";
    if (!resultadoFicha.ok) mensagem += " (ficha de produto não gerada automaticamente — rode: python scripts/gerar-ficha-produto.py — ou 'py scripts/gerar-ficha-produto.py' no Windows)";

    res.status(201).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar o produto.", detalhes: erro.message });
  }
});

// Edita um produto já existente. O slug (e por consequência a URL da
// ficha de produto, já indexada no Google se publicada) fica travado —
// mudar o "nome" só atualiza o texto exibido, não o endereço da página.
// Cada foto já cadastrada pode ser mantida, trocada (campo
// "substituto_<posição>") ou removida (via "fotosExistentes"); também dá
// pra anexar fotos novas no fim ("novasFotos").
const CAMPOS_EDICAO_PRODUTO = [
  ...Array.from({ length: 6 }, (_, i) => ({ name: `substituto_${i}`, maxCount: 1 })),
  { name: "novasFotos", maxCount: 6 },
];

app.put("/api/produtos/:slug", upload.fields(CAMPOS_EDICAO_PRODUTO), async (req, res) => {
  try {
    const slug = req.params.slug;
    const arquivoDestino = path.join(PRODUTOS.pastaJSON, `${slug}.json`);
    if (!fs.existsSync(arquivoDestino)) return res.status(404).json({ erro: "Produto não encontrado." });

    const produtoAntigo = JSON.parse(fs.readFileSync(arquivoDestino, "utf-8"));
    const corpo = req.body;
    const arquivos = req.files || {};

    const nome = (corpo.nome || "").trim();
    if (!nome) return res.status(400).json({ erro: "Nome do produto é obrigatório." });

    // fotosExistentes: JSON com as fotos já cadastradas que devem
    // permanecer, na ordem final desejada — cada uma com { arquivo, alt,
    // posicao } onde "posicao" indica qual campo substituto_N (se houver)
    // corresponde a ela.
    let fotosExistentes = [];
    try {
      fotosExistentes = corpo.fotosExistentes ? JSON.parse(corpo.fotosExistentes) : [];
    } catch {
      return res.status(400).json({ erro: "Lista de fotos existentes veio em formato inválido." });
    }

    // Monta a lista final de imagens (buffer em memória + alt), na ordem:
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

    // Apaga os arquivos antigos (já lidos em memória acima, se precisavam
    // ser reaproveitados) antes de gravar os novos, pra não sobrar foto
    // órfã em assets/produtos/ com nome antigo.
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

    const produto = {
      ...produtoAntigo,
      nome,
      linha: corpo.linha,
      categoria: corpo.categoria,
      descricaoCurta: corpo.descricaoCurta || "",
      descricaoCompleta: corpo.descricaoCompleta || "",
      composicao: {
        ...produtoAntigo.composicao,
        tecido: corpo.tecido || "PREENCHER — confirmar com a marca",
        paisDeFabricacao: corpo.paisDeFabricacao || "Brasil",
      },
      cores: [{ nome: corpo.corNome || "Único", hex: corpo.corHex || "#F279C8", imagens }],
      tamanhos,
      preco: corpo.preco ? { valor: parseFloat(corpo.preco), parcelamento: corpo.parcelamento || "" } : null,
      imagens,
      badges,
      tags,
      status: corpo.status || produtoAntigo.status || "rascunho",
      // id, slug e dataCriacao originais são preservados via spread acima.
    };

    const { valido, erros } = validarComSchema(PRODUTOS.schema, produto);
    fs.writeFileSync(arquivoDestino, JSON.stringify(produto, null, 2), "utf-8");
    regenerarManifesto(PRODUTOS);
    const resultadoFicha = rodarGerador(PRODUTOS.gerador);

    if (!valido) {
      return res.status(200).json({ aviso: "Produto atualizado, mas com pendências no schema — revise antes de publicar.", detalhes: erros, slug });
    }

    if (produto.status === "publicado") {
      adicionarAoSitemap(`${PRODUTOS.paginaSlugPrefixo}${slug}.html`);
    }

    let mensagem = "Produto atualizado com sucesso!";
    if (!resultadoFicha.ok) mensagem += " (ficha de produto não gerada automaticamente — rode: python scripts/gerar-ficha-produto.py — ou 'py scripts/gerar-ficha-produto.py' no Windows)";

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

// Devolve o cadastro completo de um artigo (pra preencher o formulário
// de edição com o que já está salvo).
app.get("/api/artigos/:slug", (req, res) => {
  const arquivo = path.join(ARTIGOS.pastaJSON, `${req.params.slug}.json`);
  if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: "Artigo não encontrado." });
  res.json(JSON.parse(fs.readFileSync(arquivo, "utf-8")));
});

app.post("/api/artigos", upload.single("capa"), async (req, res) => {
  try {
    const corpo = req.body;
    const titulo = (corpo.titulo || "").trim();
    const textoCorpo = (corpo.corpo || "").trim();
    if (!titulo) return res.status(400).json({ erro: "Título do artigo é obrigatório." });
    if (!textoCorpo) return res.status(400).json({ erro: "O texto do artigo não pode ficar vazio." });
    if (!corpo.categoria) return res.status(400).json({ erro: "Selecione uma categoria." });

    const slug = gerarSlug(titulo);
    const id = gerarId("art", slug);
    const arquivoDestino = path.join(ARTIGOS.pastaJSON, `${slug}.json`);
    if (fs.existsSync(arquivoDestino)) {
      return res.status(409).json({ erro: `Já existe um artigo com o slug "${slug}". Escolha um título diferente.` });
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
    fs.writeFileSync(arquivoDestino, JSON.stringify(artigo, null, 2), "utf-8");
    regenerarManifesto(ARTIGOS);
    const resultadoPagina = rodarGerador(ARTIGOS.gerador);

    if (!valido) {
      return res.status(200).json({ aviso: "Artigo salvo, mas com pendências no schema — revise antes de publicar.", detalhes: erros, slug });
    }

    if (artigo.status === "publicado") {
      adicionarAoSitemap(`${ARTIGOS.paginaSlugPrefixo}${slug}.html`);
    }

    let mensagem = "Artigo salvo com sucesso!";
    mensagem += artigo.status === "publicado"
      ? " Já vai aparecer na grade da Revista Turkista (blog.html)."
      : " Está como rascunho — mude o status para \"Publicado\" quando quiser que ele apareça no Blog.";
    if (!resultadoPagina.ok) mensagem += " (página do artigo não gerada automaticamente — rode: python scripts/gerar-artigo-blog.py — ou 'py scripts/gerar-artigo-blog.py' no Windows)";

    res.status(201).json({ mensagem, slug });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar o artigo.", detalhes: erro.message });
  }
});

// Edita um artigo já existente. Slug (URL do artigo) fica travado —
// mudar o "título" só atualiza o texto exibido, não o endereço da
// página. A foto de capa é opcional aqui: só troca se uma nova for
// enviada, senão mantém a atual.
app.put("/api/artigos/:slug", upload.single("novaCapa"), async (req, res) => {
  try {
    const slug = req.params.slug;
    const arquivoDestino = path.join(ARTIGOS.pastaJSON, `${slug}.json`);
    if (!fs.existsSync(arquivoDestino)) return res.status(404).json({ erro: "Artigo não encontrado." });

    const artigoAntigo = JSON.parse(fs.readFileSync(arquivoDestino, "utf-8"));
    const corpo = req.body;
    const titulo = (corpo.titulo || "").trim();
    const textoCorpo = (corpo.corpo || "").trim();
    if (!titulo) return res.status(400).json({ erro: "Título do artigo é obrigatório." });
    if (!textoCorpo) return res.status(400).json({ erro: "O texto do artigo não pode ficar vazio." });
    if (!corpo.categoria) return res.status(400).json({ erro: "Selecione uma categoria." });

    let nomeArquivoCapa = artigoAntigo.capa?.arquivo || `${slug}.webp`;
    if (req.file) {
      // Sempre grava com o nome padrão <slug>.webp, sobrescrevendo a capa
      // anterior — mesmo comportamento de "trocar foto" da aba Fotos do Site.
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
      // id, slug e dataCriacao originais são preservados via spread acima.
    };

    const { valido, erros } = validarComSchema(ARTIGOS.schema, artigo);
    fs.writeFileSync(arquivoDestino, JSON.stringify(artigo, null, 2), "utf-8");
    regenerarManifesto(ARTIGOS);
    const resultadoPagina = rodarGerador(ARTIGOS.gerador);

    if (!valido) {
      return res.status(200).json({ aviso: "Artigo atualizado, mas com pendências no schema — revise antes de publicar.", detalhes: erros, slug });
    }

    if (artigo.status === "publicado") {
      adicionarAoSitemap(`${ARTIGOS.paginaSlugPrefixo}${slug}.html`);
    }

    let mensagem = "Artigo atualizado com sucesso!";
    if (!resultadoPagina.ok) mensagem += " (página do artigo não gerada automaticamente — rode: python scripts/gerar-artigo-blog.py — ou 'py scripts/gerar-artigo-blog.py' no Windows)";

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
  // Slots fixos (hero, linhas, colagem) + um slot por artigo já existente
  // (os 9 originais + os cadastrados no painel), pra cobrir as capas do Blog também.
  const slotsBlogOriginais = [
    ["cuidados-biquini", "Como cuidar do seu biquíni e fazer durar muito mais"],
    ["tecido-certo", "O tecido certo faz toda a diferença"],
    ["moda-praia-ano-inteiro", "Moda praia o ano inteiro"],
    ["biquini-ou-top", "Biquíni ou top esportivo?"],
    ["atelie-peca-pronta", "Do ateliê à peça pronta"],
    ["lavagem-secagem", "Lavagem, secagem e armazenamento corretos"],
    ["fabricacao-propria", "Fabricação própria: por que fazemos assim"],
    ["pecas-movimento", "Peças que te acompanham em cada movimento"],
    ["cores-tom-de-pele", "Cores que valorizam seu tom de pele"],
  ].map(([slug, titulo]) => ({
    chave: `blog-${slug}`, pasta: "blog", arquivo: `${slug}.webp`,
    rotulo: `Capa do artigo: ${titulo}`, descricao: "Revista Turkista (blog.html)",
  }));

  const arquivosArtigos = fs.readdirSync(ARTIGOS.pastaJSON).filter((f) => f.endsWith(".json") && f !== "index.json");
  const slotsBlogNovos = arquivosArtigos.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(ARTIGOS.pastaJSON, f), "utf-8"));
    return { chave: `blog-${d.slug}`, pasta: "blog", arquivo: `${d.slug}.webp`, rotulo: `Capa do artigo: ${d.titulo}`, descricao: "Revista Turkista (blog.html) — cadastrado no painel" };
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
    if (!slot) return res.status(400).json({ erro: "Destino da foto não reconhecido." });

    const pastaDestino = path.join(RAIZ_PROJETO, "assets", slot.pasta);
    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });

    await sharp(req.file.buffer).webp({ quality: 85 }).toFile(path.join(pastaDestino, slot.arquivo));

    res.status(201).json({ mensagem: `Foto salva em assets/${slot.pasta}/${slot.arquivo} — já aparece no site.` });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno ao salvar a foto.", detalhes: erro.message });
  }
});

app.listen(PORTA, () => {
  console.log("");
  console.log("=================================================");
  console.log("  Painel Turkista rodando!");
  console.log(`  Abra no navegador: http://localhost:${PORTA}`);
  console.log(`  Ver o site com o catálogo/blog reais: http://localhost:${PORTA}/site/catalogo.html`);
  console.log("  (abrir catalogo.html/blog.html direto do disco não carrega os produtos/artigos reais)");
  console.log("  Pra parar: Ctrl+C aqui no terminal");
  console.log("=================================================");
  console.log("");
});
