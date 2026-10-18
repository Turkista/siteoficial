"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
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
