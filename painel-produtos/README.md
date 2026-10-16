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

## Central Pinterest — configuração inicial

A integração do Pinterest fica na aba **Pinterest** do painel local, em
`http://localhost:3000/pinterest.html`. Ela permite conectar a conta,
listar/criar Boards, publicar um produto como Pin e consultar o histórico.

### 1. Configurar as credenciais localmente

1. Copie `pinterest-oauth.example.json` para
   `secrets/pinterest-oauth.json` dentro de `painel-produtos`.
   Crie a pasta `secrets` se ela ainda não existir.
2. Abra **somente o arquivo local**
   `painel-produtos/secrets/pinterest-oauth.json` e preencha:
   - `client_id`: ID do aplicativo Pinterest.
   - `client_secret`: chave secreta do aplicativo Pinterest.
   - `redirect_uri`: `http://localhost:3000/api/pinterest/oauth/callback`.
3. No painel de desenvolvedor do Pinterest, confirme que a URL de redirecionamento
   autorizada é exatamente a mesma, incluindo protocolo, porta, caminho e ausência
   de barra final.
4. Salve o arquivo e reinicie o painel se ele já estiver aberto.

**Segurança:** não coloque a chave secreta nem tokens em arquivos versionados,
prints públicos, mensagens ou commits. A pasta `painel-produtos/secrets/` já está
no `.gitignore`; mantenha as credenciais somente nela. O arquivo de exemplo
versionado deve conter apenas texto de preenchimento, nunca a chave real.

### 2. Conectar e validar

1. Inicie o painel com `npm start`.
2. Abra `http://localhost:3000/pinterest.html` e clique em **Conectar Pinterest**.
3. Autorize as permissões solicitadas na página oficial do Pinterest.
4. Ao retornar ao painel, confira o estado da conexão e se os Boards aparecem.
5. Antes de publicar um produto real, valide primeiro a conta e a leitura dos Boards.
   Se a conta/app estiver com acesso limitado, Pins de teste podem ficar visíveis
   somente para a conta que os criou, conforme as permissões concedidas pelo Pinterest.
6. Faça a primeira publicação com um produto de teste que tenha imagem pública
   acessível por HTTPS. Confira o Pin na conta Pinterest e o histórico do painel.

### 3. Se a conexão falhar

- `OAuth aguardando Client Secret`: confira se o arquivo local existe e se os três
  campos estão preenchidos.
- Erro de redirecionamento: compare a URL cadastrada no Pinterest com
  `http://localhost:3000/api/pinterest/oauth/callback`.
- Erro de escopo/permissão ou resposta 401/403: confira no painel de desenvolvedor
  o nível de acesso liberado e as permissões aprovadas para o aplicativo.
- Erro ao publicar uma imagem: verifique se a imagem do produto está disponível
  publicamente em HTTPS e se a URL não exige login.

A chave secreta do aplicativo não é o mesmo que o token OAuth da conta. O token
é obtido durante a conexão autorizada e salvo localmente em
`painel-produtos/secrets/pinterest-token.json`; não o adicione ao Git.
