# Painel Turkista

Painel local com três abas — cadastre produtos, escreva artigos do Blog e
envie fotos institucionais, tudo sem mexer em código. Roda no seu
computador, não depende de internet (depois de instalado) e não sobe nada
pra fora do seu computador.

## As três abas

### 🛍️ Produtos
Formulário completo (nome, linha, categoria, ficha técnica, cor, tamanhos,
preço, selos, tags, status). Ao salvar:
- As fotos são convertidas pra `.webp` e salvas em `../assets/produtos/`
- Gera o `.json` do produto em `../src/content/produtos/`, validado contra
  o schema oficial
- Gera automaticamente a ficha de produto (`../produto/<slug>.html`)
- Se o status for "Publicado": entra sozinho no Catálogo e, se estiver
  entre os mais recentes, na Home também — e entra no `sitemap.xml`

### 📝 Artigos do Blog
Formulário com título, categoria, resumo e o texto do artigo (parágrafos
separados por linha em branco; `## ` cria um subtítulo; `> ` cria um
destaque/citação). Ao salvar:
- A foto de capa é convertida pra `.webp` e salva em `../assets/blog/`
- Gera o `.json` do artigo em `../src/content/artigos/`
- Gera automaticamente a página do artigo (`../blog/<slug>.html`), com o
  mesmo visual dos 9 artigos originais, inclusive a seção "Continue lendo"
  (escolhida automaticamente por categoria)
- Se o status for "Publicado": o card aparece sozinho na grade do Blog
  (`blog.html`, somado aos 9 artigos originais — nenhum é substituído) e
  entra no `sitemap.xml`

### 📸 Fotos do Site
Lista todos os "slots" de foto institucional que o site espera (hero da
Home, os 3 cards de linha, as 3 fotos da colagem "Sobre a Turkista", e uma
capa por artigo do Blog — os 9 originais + os que você for criando na aba
de Artigos). Basta escolher a foto — ela já é salva com o nome e na pasta
exatos, convertida pra `.webp`. Mostra quais já foram enviadas.

## Como usar (primeira vez)

1. Abra a pasta **`turkista-showroom`** inteira no VS Code (não só a pasta
   `painel-produtos`).
2. Abra o terminal integrado (menu **Terminal → Novo Terminal**, ou
   `` Ctrl+` ``).
3. Entre na pasta do painel e instale as dependências (só precisa fazer
   isso uma vez):
   ```
   cd painel-produtos
   npm install
   ```
4. Inicie o painel:
   ```
   npm start
   ```
5. Vai aparecer uma mensagem assim no terminal:
   ```
   Painel Turkista rodando!
   Abra no navegador: http://localhost:3000
   Ver o site com o catálogo/blog reais: http://localhost:3000/site/catalogo.html
   ```
6. Copie esse link e cole no navegador. As três abas (Produtos, Artigos do
   Blog, Fotos do Site) ficam no topo da página.

## ⚠️ Como pré-visualizar o site (catalogo.html, blog.html, index.html...)

**Não abra esses arquivos direto do disco (duplo clique).** O catálogo e o
blog buscam a lista de produtos/artigos reais com `fetch()`, e os
navegadores bloqueiam esse tipo de busca quando a página é aberta como
`file://...` — o site continua funcionando visualmente, mas ele nunca
carrega os produtos/artigos cadastrados no painel, e mostra só os exemplos
antigos fixos no HTML (o que faz parecer que peças estão "sumindo" ao
filtrar por linha).

Com o painel rodando (`npm start`), o site inteiro também fica disponível
em `http://localhost:3000/site/`. Exemplos:
- `http://localhost:3000/site/catalogo.html`
- `http://localhost:3000/site/blog.html`
- `http://localhost:3000/site/index.html`

Por essa rota o `fetch()` funciona normalmente e o catálogo/blog aparecem
com os produtos e artigos reais, exatamente como vão aparecer quando o
site for publicado num domínio de verdade.

## Como usar (das próximas vezes)

Só os passos 4, 5 e 6 — não precisa rodar `npm install` de novo, a menos
que eu avise que atualizei alguma dependência.

## Para parar o painel

Clique no terminal e aperte `Ctrl+C`.

## Observações importantes

- **Produtos: uma cor por cadastro nesta versão.** Se uma peça tiver mais
  de uma cor, cadastre com a primeira e me avise — eu ajusto o `.json`
  gerado pra incluir as demais.
- **Artigos: os 9 artigos originais não aparecem na lista "já cadastrados"
  do painel** — eles foram escritos direto no site antes do painel
  existir. Isso é esperado, não é um erro. Eles continuam no Blog
  normalmente, só não são gerenciáveis por aqui (ainda).
- **O campo "Proteção UV" não existe no formulário de produtos, de
  propósito** — as peças não têm laudo de FPS, então esse campo fica
  sempre em branco (`null`) no arquivo gerado.
- **Status "rascunho"** é o padrão em produtos e artigos — fica salvo,
  mas só aparece no site publicado quando você mudar pra "Publicado".
- Se o slug (nome do arquivo) de um produto ou artigo já existir, o
  painel avisa e não deixa sobrescrever sem querer.
- **Se o Python não estiver instalado** no computador, o painel ainda
  salva os dados normalmente, mas avisa que a página (ficha de produto ou
  artigo) não foi gerada — nesse caso, rode à mão:
  `python scripts/gerar-ficha-produto.py` ou
  `python scripts/gerar-artigo-blog.py` (no Windows, se `python` não
  funcionar, tente `py` no lugar de `python`).

## Se der erro ao instalar (`npm install`)

Esse painel usa uma biblioteca (`sharp`) que faz a conversão das fotos —
ela baixa um componente extra na primeira instalação. Se der erro, o mais
comum é falta de conexão com a internet nesse momento (só na instalação,
não no uso do dia a dia). Rode `npm install` de novo com internet ativa.

