"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const catalogo = require(path.join(__dirname, "../../src/content/produtos/index.json"));
const { produtoParaMerchant } = require("../integrations/google-merchant");

function produto(overrides = {}) {
  return {
    id: "prod_teste123",
    slug: "biquini-teste",
    nome: "Biquíni Teste",
    seoTitulo: "Top de Biquíni Teste Rosa | Turkista",
    seoDescricao: "Top de biquíni rosa com alças ajustáveis. Tamanho P.",
    descricaoCurta: "Descrição curta do produto.",
    descricaoCompleta: "Descrição completa do produto.",
    preco: { valor: 49.9 },
    status: "publicado",
    tamanhos: ["P"],
    imagens: [
      { arquivo: "teste-principal.webp" },
      { arquivo: "teste-lateral.webp" }
    ],
    cores: [
      {
        nome: "Rosa",
        hex: "#F279C8",
        imagens: [
          { arquivo: "teste-principal.webp" },
          { arquivo: "teste-lateral.webp" }
        ]
      }
    ],
    ...overrides
  };
}

test("prioriza seoTitulo e seoDescricao nos atributos enviados ao Merchant", () => {
  const payload = produtoParaMerchant(produto());
  assert.equal(payload.productAttributes.title, "Top de Biquíni Teste Rosa | Turkista");
  assert.equal(payload.productAttributes.description, "Top de biquíni rosa com alças ajustáveis. Tamanho P.");
});

test("usa nome e descrição existentes como fallback quando campos SEO não existem", () => {
  const p = produto({
    seoTitulo: "",
    seoDescricao: "",
    descricaoCompleta: "Descrição comercial completa."
  });
  const payload = produtoParaMerchant(p);
  assert.equal(payload.productAttributes.title, "Biquíni Teste");
  assert.equal(payload.productAttributes.description, "Descrição comercial completa.");
});

test("preserva preço, disponibilidade, identificador e link do produto", () => {
  const payload = produtoParaMerchant(produto());
  assert.equal(payload.offerId, "prod_teste123");
  assert.equal(payload.productAttributes.price.amountMicros, "49900000");
  assert.equal(payload.productAttributes.price.currencyCode, "BRL");
  assert.equal(payload.productAttributes.availability, "IN_STOCK");
  assert.equal(payload.productAttributes.link, "https://www.turkista.com.br/produto/biquini-teste.html");
});

test("não repete a imagem principal em additionalImageLinks", () => {
  const payload = produtoParaMerchant(produto());
  assert.equal(payload.productAttributes.imageLink, "https://www.turkista.com.br/assets/produtos/teste-principal.webp");
  assert.deepEqual(payload.productAttributes.additionalImageLinks, [
    "https://www.turkista.com.br/assets/produtos/teste-lateral.webp"
  ]);
});

test("mantém o título SEO no agrupamento e identifica tamanho/cor nas variantes", () => {
  const p = produto({ tamanhos: ["P", "M"] });
  const variantes = require("../integrations/google-merchant").variantesDoProduto(p);
  const primeira = produtoParaMerchant(p, variantes[0], variantes.length, 0);
  const segunda = produtoParaMerchant(p, variantes[1], variantes.length, 1);
  assert.equal(primeira.productAttributes.title, "Top de Biquíni Teste Rosa | Turkista - P - Rosa");
  assert.equal(segunda.productAttributes.title, "Top de Biquíni Teste Rosa | Turkista - M - Rosa");
  assert.equal(segunda.productAttributes.itemGroupTitle, "Top de Biquíni Teste Rosa | Turkista");
  assert.equal(segunda.productAttributes.itemGroupId, "prod_teste123");
  assert.equal(segunda.offerId, "prod_teste123-m-rosa");
});

test("continua rejeitando preço inválido", () => {
  assert.throws(
    () => produtoParaMerchant(produto({ preco: { valor: 0 } })),
    /Preço inválido/
  );
});

test("dry-run dos biquínis do catálogo: usa SEO e preserva os dados comerciais sem chamar a API", () => {
  const ehBiquini = (p) => /biqu[ií]n|bikini|top.*praia/i.test(
    [p.slug, p.nome, p.categoria, p.linha].join(" ")
  );
  const biquinis = catalogo.filter(ehBiquini);
  assert.equal(biquinis.length, 16, "A contagem do catálogo mudou; revisar o escopo do dry-run.");

  const offerIds = new Set();
  for (const p of biquinis) {
    assert.ok(p.seoTitulo, `Falta seoTitulo em ${p.slug}`);
    assert.ok(p.seoDescricao, `Falta seoDescricao em ${p.slug}`);
    const variantes = require("../integrations/google-merchant").variantesDoProduto(p);
    variantes.forEach((variante, indice) => {
      const payload = produtoParaMerchant(p, variante, variantes.length, indice);
      assert.ok(payload.productAttributes.title.startsWith(p.seoTitulo), `Título SEO não mapeado em ${p.slug}`);
      assert.equal(payload.productAttributes.description, p.seoDescricao, `Descrição SEO não mapeada em ${p.slug}`);
      assert.equal(payload.productAttributes.price.currencyCode, "BRL");
      assert.equal(payload.productAttributes.availability, p.status === "esgotado" ? "OUT_OF_STOCK" : "IN_STOCK");
      assert.ok(payload.productAttributes.imageLink.includes("/assets/produtos/"));
      assert.ok(!payload.productAttributes.additionalImageLinks.includes(payload.productAttributes.imageLink));
      assert.ok(!offerIds.has(payload.offerId), `offerId duplicado no dry-run: ${payload.offerId}`);
      offerIds.add(payload.offerId);
    });
  }
  assert.ok(offerIds.size >= 16, "O dry-run deve gerar pelo menos uma oferta por produto.");
});
