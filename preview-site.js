// Pré-visualização local do site — Turkista
//
// Serve o projeto inteiro (index.html, catalogo.html, blog.html etc.) por
// http://localhost, pra que os scripts que buscam produtos/artigos reais
// (catalogo-dinamico.js, blog-dinamico.js) funcionem — isso não acontece
// quando os arquivos .html são abertos direto do disco (file://...).
//
// Não depende do painel nem precisa de "npm install": usa só os módulos
// nativos do Node. Pra usar, dê duplo clique em "abrir-site.bat" (Windows)
// ou "abrir-site.command" (Mac) — ou rode "node preview-site.js" no
// terminal, dentro desta pasta.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORTA = 5500;
const RAIZ = __dirname;
const PAGINA_INICIAL = "/catalogo.html";

const TIPOS_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const servidor = http.createServer((requisicao, resposta) => {
  let caminhoUrl = decodeURIComponent(requisicao.url.split("?")[0]);
  if (caminhoUrl === "/") caminhoUrl = "/index.html";

  const caminhoArquivo = path.join(RAIZ, caminhoUrl);

  // Proteção simples: nunca sair da pasta do projeto.
  if (!caminhoArquivo.startsWith(RAIZ)) {
    resposta.writeHead(403);
    resposta.end("Acesso negado.");
    return;
  }

  fs.readFile(caminhoArquivo, (erro, conteudo) => {
    if (erro) {
      if (erro.code === "ENOENT") {
        // Sem o arquivo pedido: cai na página 404 do próprio site, se existir.
        fs.readFile(path.join(RAIZ, "404.html"), (erro404, conteudo404) => {
          resposta.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          resposta.end(erro404 ? "Página não encontrada." : conteudo404);
        });
        return;
      }
      resposta.writeHead(500);
      resposta.end("Erro interno ao ler o arquivo: " + erro.code);
      return;
    }

    const extensao = path.extname(caminhoArquivo).toLowerCase();
    resposta.writeHead(200, { "Content-Type": TIPOS_MIME[extensao] || "application/octet-stream" });
    resposta.end(conteudo);
  });
});

servidor.listen(PORTA, () => {
  const url = `http://localhost:${PORTA}${PAGINA_INICIAL}`;

  console.log("");
  console.log("=================================================");
  console.log("  Site Turkista rodando em modo pré-visualização!");
  console.log(`  ${url}`);
  console.log("  Pra parar: Ctrl+C aqui no terminal, ou feche esta janela");
  console.log("=================================================");
  console.log("");

  // Abre o navegador sozinho, sem precisar copiar/colar o link.
  const comandoPorSistema = {
    win32: `start ${url}`,
    darwin: `open ${url}`,
    linux: `xdg-open ${url}`,
  };
  const comando = comandoPorSistema[process.platform];
  if (comando) exec(comando, () => {});
});
