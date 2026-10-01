const fs = require("fs");
const path = require("path");

const {
  produtoParaMerchant,
  variantesDoProduto,
} = require("../painel-produtos/integrations/google-merchant");

const ROOT = path.join(__dirname, "..");
const PRODUCTS = path.join(ROOT, "src", "content", "produtos");

function carregarProdutos() {
  return fs
    .readdirSync(PRODUCTS)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((arquivo) =>
      JSON.parse(
        fs.readFileSync(path.join(PRODUCTS, arquivo), "utf8")
      )
    );
}

function main() {
  const produtos = carregarProdutos();

  let totalVariantes = 0;
  let aptas = 0;
  let ignoradas = 0;

  const ignorados = [];
  const erros = [];
  const resumo = [];

  for (const produto of produtos) {
    const variantes = variantesDoProduto(produto);

    totalVariantes += variantes.length;

    if (produto.status === "descontinuado") {
      ignoradas += variantes.length;

      ignorados.push({
        produto: produto.slug,
        nome: produto.nome,
        status: produto.status,
        variantes: variantes.map((v) => ({
          tamanho: v.tamanho,
          cor: v.cor?.nome || null,
        })),
      });

      continue;
    }

    for (let indice = 0; indice < variantes.length; indice++) {
      const variante = variantes[indice];

      try {
        const payload = produtoParaMerchant(
          produto,
          variante,
          variantes.length,
          indice
        );

        const attrs = payload.productAttributes;

        if (!attrs.title) throw new Error("title ausente");
        if (!attrs.link) throw new Error("link ausente");
        if (!attrs.imageLink) throw new Error("imageLink ausente");
        if (!attrs.price) throw new Error("price ausente");
        if (!attrs.availability) throw new Error("availability ausente");
        if (!attrs.brand) throw new Error("brand ausente");
        if (!attrs.gender) throw new Error("gender ausente");
        if (!attrs.ageGroup) throw new Error("ageGroup ausente");
        if (!attrs.color) throw new Error("color ausente");
        if (!attrs.size) throw new Error("size ausente");
        if (!attrs.sizeSystem) throw new Error("sizeSystem ausente");

        aptas++;

        resumo.push({
          produto: produto.slug,
          offerId: payload.offerId,
          titulo: attrs.title,
          tamanho: attrs.size,
          cor: attrs.color,
          itemGroupId: attrs.itemGroupId || null,
          imagensAdicionais:
            attrs.additionalImageLinks?.length || 0,
        });
      } catch (error) {
        erros.push({
          produto: produto.slug,
          nome: produto.nome,
          indice,
          tamanho: variante?.tamanho || null,
          cor: variante?.cor?.nome || null,
          erro: error.message,
        });
      }
    }
  }

  console.log("Turkista — DRY-RUN Google Merchant");
  console.log("========================================");
  console.log("NENHUM PRODUTO FOI ENVIADO");
  console.log("========================================");
  console.log("");

  console.log(`Produtos analisados: ${produtos.length}`);
  console.log(`Variantes encontradas: ${totalVariantes}`);
  console.log(`Variantes aptas: ${aptas}`);
  console.log(`Variantes ignoradas: ${ignoradas}`);
  console.log(`Variantes com erro: ${erros.length}`);
  console.log("");

  if (ignorados.length) {
    console.log("========================================");
    console.log("IGNORADOS");
    console.log("========================================");

    for (const item of ignorados) {
      console.log("");
      console.log(`${item.produto} — ${item.nome}`);
      console.log(`Status: ${item.status}`);

      for (const variante of item.variantes) {
        console.log(
          `  ${variante.tamanho} — ${variante.cor}`
        );
      }
    }

    console.log("");
  }

  if (erros.length) {
    console.log("========================================");
    console.log("ERROS");
    console.log("========================================");
    console.log(JSON.stringify(erros, null, 2));
    console.log("");
  }

  console.log("========================================");
  console.log("RESUMO DOS PAYLOADS APTOS");
  console.log("========================================");

  for (const item of resumo) {
    console.log(
      `${item.produto} | ` +
      `${item.offerId} | ` +
      `${item.tamanho} | ` +
      `${item.cor} | ` +
      `imagens adicionais: ${item.imagensAdicionais}`
    );
  }

  console.log("");

  if (erros.length === 0) {
    console.log("========================================");
    console.log("DRY-RUN APROVADO");
    console.log(
      `${produtos.length} produtos analisados / ` +
      `${aptas} variantes aptas / ` +
      `${ignoradas} ignoradas.`
    );
    console.log("Nenhuma chamada de envio foi realizada.");
    console.log("========================================");
  } else {
    console.log("========================================");
    console.log("DRY-RUN REPROVADO");
    console.log("Corrigir os erros antes de sincronizar.");
    console.log("========================================");
    process.exitCode = 1;
  }
}

main();
