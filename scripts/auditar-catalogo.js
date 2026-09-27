const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { normalizarProduto } = require("../painel-produtos/catalogo-normalizacao");

const ROOT = path.join(__dirname, "..");
const PRODUCTS = path.join(ROOT, "src", "content", "produtos");
const ASSETS = path.join(ROOT, "assets", "produtos");
const SITE = (process.env.TURKISTA_SITE_URL || "https://www.turkista.com.br").replace(/\/$/, "");

async function main() {
  const files = fs.readdirSync(PRODUCTS).filter(f => f.endsWith(".json") && f !== "index.json");
  const assets = new Set(fs.readdirSync(ASSETS));
  const report = {
    produtos: files.length,
    categorias: {},
    genero: {},
    faixaEtaria: {},
    imagens: { referencias: 0, ausentes: [], nomesDiferentes: [], dimensoesInvalidas: [], urlsPublicasComProblema: [] },
    produtosInvalidos: []
  };

  for (const file of files) {
    const produto = normalizarProduto(JSON.parse(fs.readFileSync(path.join(PRODUCTS, file), "utf8")));
    report.categorias[produto.categoria] = (report.categorias[produto.categoria] || 0) + 1;
    report.genero[produto.genero] = (report.genero[produto.genero] || 0) + 1;
    report.faixaEtaria[produto.faixaEtaria] = (report.faixaEtaria[produto.faixaEtaria] || 0) + 1;

    if (!produto.id || !produto.slug || !produto.nome || !produto.preco || !Number.isFinite(Number(produto.preco.valor))) {
      report.produtosInvalidos.push({ file, motivo: "id, slug, nome ou preço inválido/ausente" });
    }

    for (const imagem of produto.imagens || []) {
      const nome = imagem && imagem.arquivo;
      if (!nome) continue;
      report.imagens.referencias++;
      const caminho = path.join(ASSETS, nome);
      if (!assets.has(nome)) {
        const alternativa = [...assets].find(a => a.toLowerCase() === nome.toLowerCase());
        if (alternativa) report.imagens.nomesDiferentes.push({ file, referencia: nome, arquivoExistente: alternativa });
        else report.imagens.ausentes.push({ file, referencia: nome });
        continue;
      }
      try {
        const meta = await sharp(caminho).metadata();
        if (!meta.width || !meta.height || meta.width < 250 || meta.height < 250) {
          report.imagens.dimensoesInvalidas.push({ file, imagem: nome, width: meta.width, height: meta.height });
        }
      } catch (e) {
        report.imagens.dimensoesInvalidas.push({ file, imagem: nome, erro: e.message });
      }

      if (imagem === (produto.imagens || [])[0]) {
        try {
          const response = await fetch(SITE + "/assets/produtos/" + encodeURIComponent(nome), { redirect: "manual" });
          const contentType = response.headers.get("content-type") || "";
          if (response.status < 200 || response.status >= 300 || !contentType.toLowerCase().startsWith("image/")) {
            report.imagens.urlsPublicasComProblema.push({ file, imagem: nome, status: response.status, contentType, location: response.headers.get("location") || "" });
          }
        } catch (e) {
          report.imagens.urlsPublicasComProblema.push({ file, imagem: nome, erro: e.message });
        }
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error(e); process.exitCode = 1; });
