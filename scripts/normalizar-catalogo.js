const fs = require("fs");
const path = require("path");
const { normalizarProduto } = require("../painel-produtos/catalogo-normalizacao");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "src", "content", "produtos");
const MANIFEST = path.join(DIR, "index.json");

const arquivos = fs.readdirSync(DIR).filter(f => f.endsWith(".json") && f !== "index.json");
const alterados = [];

for (const arquivo of arquivos) {
  const caminho = path.join(DIR, arquivo);
  const original = JSON.parse(fs.readFileSync(caminho, "utf8"));
  const normalizado = normalizarProduto(original);
  if (JSON.stringify(original) !== JSON.stringify(normalizado)) {
    fs.writeFileSync(caminho, JSON.stringify(normalizado, null, 2) + "\n", "utf8");
    alterados.push(arquivo);
  }
}

const produtos = arquivos.map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
fs.writeFileSync(MANIFEST, JSON.stringify(produtos, null, 2) + "\n", "utf8");

console.log("Produtos analisados:", arquivos.length);
console.log("Produtos normalizados:", alterados.length);
console.log("Categorias normalizadas.");
console.log("Gênero definido como feminino.");
console.log("Faixa etária definida como 15+.");
