# TURKISTA — Status de Implementação
### Atualização do Plano Mestre de Implementação (v1.0, Agosto de 2026)
Preparado a partir de: Plano Mestre de Implementação, Arquitetura Técnica, Manual da Marca, Documentação de UX, SEO Master Plan.

---

## Resumo executivo

Iniciei a construção seguindo exatamente a ordem definida no Plano Mestre: **Fundação → Design System → Páginas**. Nesta primeira entrega, priorizei deixar a **Etapa 0** e a **Etapa 1** com uma base sólida e a **Etapa 3** com a Home totalmente funcional, para que a marca já possa visualizar o showroom real (não wireframe) e validar direção visual antes de eu continuar para catálogo e ficha de produto.

Stack usada nesta fase: **HTML/CSS/JS estático**, sem framework — decisão deliberada porque a Arquitetura Técnica define a árvore de pastas como "agnóstica de framework" (seção 02) e o objetivo imediato é ter algo navegável e revisável pela marca o quanto antes. Migrar para Astro/Next mais tarde não exige reestruturar `pages/`, `content/` ou `styles/`, pois já seguem a convenção da Arquitetura Técnica.

---

## Progresso por etapa

### ✅ Etapa 0 — Fundação Técnica e Ambientes — **parcialmente concluída**
- [x] Árvore de pastas criada seguindo exatamente a Arquitetura Técnica (seção 02): `public/`, `src/{components,layouts,pages,styles,scripts,content,schema,utils}`, `assets/`, `config/`, `docs/`.
- [x] Estrutura pronta para versionamento Git (`.gitignore` recomendado, `README.md` a redigir).
- [ ] **Pendente (depende de decisões externas à codificação):** domínio (`www.turkista.com.br`), certificado SSL, CDN, pipeline de CI/CD e escolha final de hospedagem — isso exige acesso às contas da marca (registro.br, provedor de hospedagem) e não pode ser feito apenas com código.
- [ ] Rotas `/carrinho/` e `/checkout/` reservadas no `robots.txt` — ainda não criado.

### ✅ Etapa 1 — Design System e Componentes Base — **núcleo concluído**
- [x] Tokens de cor 100% fiéis à paleta do Manual da Marca (seção 09): Rosa Turkista `#F279C8`, Rosa Profundo `#C94E9C`, Preto Grafite `#0C1014`, Branco Cristal `#FFFFFF`, Cinza Neutro `#6B6B6B`.
- [x] Escala tipográfica mobile→desktop implementada (`clamp()`), com par tipográfico Fraunces (títulos, serifada de peso forte) + Manrope (texto, sans-serif limpa).
- [x] Componentes construídos e testados: **botões** (todos os 6 estados: padrão, hover, pressed, foco de teclado, desabilitado, carregando), **header fixo** com nav desktop e **menu mobile em tela cheia**, **footer completo**, **cards de linha de produto**, **card de diferencial** com ícone circular (padrão "selo" do Instagram da marca), **badge de exclusividade**, **botão flutuante de WhatsApp** com comportamento de rolagem.
- [x] Validado visualmente em 360–390px e em desktop (capturas de tela revisadas nesta sessão).
- [x] Foco de teclado visível globalmente, nunca removido.
- [ ] Pendente: componentes ainda não usados na Home (filtros de catálogo, FAQ/accordion, galeria de produto, seletor de tamanho/cor) — entram nas Etapas 4 e 5.
- [ ] Pendente: auditoria formal de contraste WCAG AA em todas as combinações de cor (checklist de qualidade da etapa).

### 🟡 Etapa 2 — Modelagem de Conteúdo e Catálogo — **não iniciada**
Bloqueada por um pré-requisito externo crítico já identificado no próprio Plano Mestre: **produção fotográfica do estoque em padrão still-life**. Sem isso, não faz sentido cadastrar produtos "de verdade" — o Plano Mestre é explícito que cadastrar com `lorem ipsum` esconde lacunas do esquema de dados. Posso desenhar o *schema* de produto (JSON) sem esperar as fotos, se você quiser que eu avance nisso primeiro.

### ✅ Etapa 3 — Páginas Institucionais — **concluída**
- [x] **Home** — hero institucional, destaque das 3 linhas (Praia, Surf, Turk Fit), bloco de 4 diferenciais, seção de newsletter.
- [x] **Sobre a Marca** — todos os 6 blocos da UX (seção 8.6): abertura narrativa, linha do tempo (Origem → Consolidação → Momento atual → Próximo passo), manifesto em destaque tipográfico, os 5 valores da marca, bastidores de produção (placeholders de foto até a sessão fotográfica) e CTA de fechamento.
- [x] **Contato** — CTA de WhatsApp com horário de atendimento, links diferenciados para os dois perfis de Instagram (@turkista.com.br e @turkfit.com.br), formulário alternativo e localização institucional (Araruama, Região dos Lagos).
- [x] **Como Cuidar da Peça** — orientações de lavagem, uso e armazenamento, com bloco destacado da política de conserto ("Se soltar um ponto, a gente conserta") e CTA direto de WhatsApp para acionar reparo.
- [x] **Política de Privacidade** — dados coletados, uso, compartilhamento, direitos do titular e cookies, em linguagem simples (LGPD), com `noindex` no `<meta name="robots">` (página legal, não precisa competir por indexação).
- [x] Header fixo e footer completos em todas as 5 páginas; breadcrumb presente em todas exceto a Home.
- [x] Navegação cruzada entre as 5 páginas testada (links internos conferidos programaticamente — nenhum link quebrado).
- [ ] Pendente do checklist de qualidade da etapa: revisão final da marca (Danielle/Yansix) sobre o texto — o conteúdo aqui foi escrito com base fiel no Manual da Marca e no Documento Mestre, mas ainda não passou por aprovação humana da marca.
- [ ] Pendente: fotos reais (still-life e uso real) — atualmente placeholders visuais nomeados, aguardando a produção fotográfica (pré-requisito da Etapa 2).

### ⬜ Etapas 4 a 15 — **não iniciadas**
Catálogo por linha, ficha de produto, SEO técnico, blog, landing de lançamento, performance, acessibilidade, mensuração, QA, deploy, pós-lançamento e prontidão para e-commerce seguem exatamente como descritas no Plano Mestre original — nenhuma delas pode ser antecipada sem que as etapas anteriores (principalmente Etapa 2, o catálogo real) estejam prontas, conforme o próprio mapa de dependências do documento.

---

## O que ver agora
Abra `index.html` na raiz do projeto — a partir dele dá para navegar pelas 6 páginas principais (Home, Blog, Sobre a Marca, Contato, Como Cuidar da Peça, Política de Privacidade) e, a partir do Blog, para as 10 páginas de artigo dentro de `blog/`, cada uma com texto completo, artigos relacionados e CTA de WhatsApp. Menu mobile, botão de WhatsApp flutuante e todos os componentes do Design System já estão em uso real, não como wireframe.

## Próximos passos recomendados (em ordem)
*(Nota: a lista original abaixo ficou desatualizada pelos Adendos 1–11; ver Adendo 10 e
Adendo 11 para o estado real de cada item.)*
1. ~~Aprovação da marca sobre os textos das páginas do site~~ — aprovado (Adendo 12).
2. Fotos still-life do estoque (pré-requisito da Etapa 2) — a marca vai produzir e enviar em breve (Adendo 12); também substitui os placeholders de foto usados hoje em Sobre a Marca, na Home, na Ficha de Produto e no Catálogo.
3. ~~Definir domínio/hospedagem/CDN~~ — a marca cuida diretamente disso (Adendo 10); não é mais pendência de código.
4. Validar o schema de dados de produto (Etapa 2) com pelo menos 3 peças de cada linha — segue pendente (hoje há só 1 exemplo por linha, adiantado no Adendo 6).
5. ~~Seguir para Etapa 4 (Catálogo por Linha e Filtros)~~ — adiantada no Adendo 11 com os 4 produtos de exemplo, mesmo princípio já usado na Ficha de Produto (Adendo 9).

---

## Adendo — Auditoria contra as referências visuais (blog.png / 02.png)
*Adicionado em: Agosto de 2026, pós-entrega da v1.0*

Comparei o build real (`index.html` e demais páginas) contra as duas imagens de referência fornecidas pela marca para validar se o showroom construído condiz com a proposta visual.

### ✅ Home (referência `02.png`) — condiz
A Home construída bate com a referência: hero "Feita para o seu movimento", os 3 blocos de linha (Praia, Surf, Turk Fit), os 4 diferenciais, seção "Do ateliê da minha mãe para o seu movimento", depoimentos e footer. Nenhuma ação necessária aqui.

### ⬜ Blog (referência `blog.png`) — ainda não construído, e está correto que não esteja
A referência mostra a página "Revista Turkista" (grade de artigos com categorias: Guia de Cuidados, Tecido & Tecnologia, Estilo, Treino & Performance, Bastidores). Confirmei no código que **não existe `blog.html`** nem qualquer referência a blog nas 5 páginas entregues. Isso é esperado, não é uma lacuna do que foi prometido para esta entrega: o Blog é a **Etapa 6** do Plano Mestre, dentro do bloco "Etapas 4 a 15 — não iniciadas", e depende do catálogo (Etapa 2) estar pronto antes.

### 🔧 Divergência encontrada e corrigida — nav desktop incompleto
A referência `02.png` mostra o menu desktop com: `Praia · Surf · Turk Fit · Sobre a Marca · Guia de Cuidados · Blog`.

O nav desktop real tinha: `Praia · Surf · Turk Fit · Sobre a Marca · Contato` — faltava o link para **Guia de Cuidados** (a página `como-cuidar-da-peca.html` já existia e estava completa, mas só era acessível pelo menu mobile, não pelo desktop).

**Correção aplicada nesta atualização:** adicionei o link "Guia de Cuidados" ao nav desktop nas 5 páginas (`index.html`, `sobre-a-marca.html`, `contato.html`, `como-cuidar-da-peca.html`, `politica-de-privacidade.html`), mantendo o padrão de link relativo já usado em cada página e o `aria-current="page"` na própria página de destino. O item "Blog" não foi adicionado ao nav, pois a página ainda não existe — adicioná-lo agora criaria um link quebrado.

### Pendência remanescente
- [ ] Quando a Etapa 6 (Blog) for iniciada, adicionar o link "Blog" ao nav desktop e ao menu mobile nas 5 páginas existentes, seguindo o mesmo padrão de correção usado para "Guia de Cuidados".

---

## Adendo 2 — Home reconstruída no tema claro da referência + correção da árvore de pastas
*Adicionado em: Agosto de 2026, pós-Adendo 1*

### Home redesenhada
A Home (`index.html` + `src/pages/home/home.css`) foi reconstruída para refletir fielmente a referência visual em tema claro aprovada pela marca (fundo branco/rosa, não o tema escuro da v1.0). Nenhuma outra página foi alterada — `sobre-a-marca.html`, `contato.html`, `como-cuidar-da-peca.html` e `politica-de-privacidade.html` continuam no tema escuro original. Seções novas adicionadas à Home: "Peças que acompanham o seu movimento" (produtos em destaque), preview de "Sobre a Turkista" (split com colagem de fotos, linkando para a página completa), "O que nossas clientes dizem" (depoimentos) e a faixa de benefícios (WhatsApp / Envio / Compra segura) acima da newsletter.

### 🔧 Correção estrutural — árvore de pastas não batia com o descrito
Ao criar a pasta de assets para as fotos da Home, encontrei uma divergência entre o que o Adendo 1 do status e a v1.0 afirmavam ("árvore de pastas criada seguindo exatamente a Arquitetura Técnica — `public/`, `assets/`, etc.") e o que de fato existia no projeto: **não havia `public/` nem `assets/`**, e havia um diretório-lixo literal chamado `{public` (artefato de um comando `mkdir` com brace expansion que não expandiu corretamente, deixando a string `{public/favicon,src/...}` virar nome de pasta ao invés de criar a árvore pretendida).

**Correção aplicada:**
- Removido o diretório `{public` (estava vazio, sem risco de perda de conteúdo).
- Criado `public/favicon/` (com README explicando o que colocar ali).
- Criado `assets/hero/`, `assets/linhas/`, `assets/produtos/` e `assets/sobre/`, cada um com um `README.md` listando o **nome exato de arquivo esperado**, para que a marca só precise soltar a foto com o nome certo na pasta certa — sem precisar mexer em código.

### Fotos reais — estrutura pronta, sem base64 e sem imagens fake
Todos os placeholders visuais da Home (hero, cards de linha, produtos em destaque, colagem "Sobre a Turkista") agora são tags `<img>` reais apontando para caminhos em `assets/`, e **não** dados embutidos em base64. Como as fotos ainda não existem (Etapa 2, pendente), cada `<img>` tem um fallback (`onerror`) que esconde a tag automaticamente caso o arquivo não exista, revelando o gradiente CSS placeholder que já estava por trás — ou seja, hoje a Home continua visualmente idêntica ao que já foi aprovado, mas assim que a marca colocar os arquivos de foto com os nomes indicados nos READMEs, eles aparecem automaticamente, sem qualquer alteração de código.

---

## Adendo 3 — Blog (Etapa 6) construído + link no menu superior
*Adicionado em: Agosto de 2026, pós-Adendo 2*

### O que foi pedido
Faltava o link "Blog" no menu superior, e o adendo anterior já havia identificado (auditoria contra `blog.png`) que a página do blog ainda não existia. Esta atualização resolve as duas coisas: cria `blog.html` (Revista Turkista) e adiciona o link no menu.

### `blog.html` criado
Nova página, tema claro (mesmo padrão da Home v2, fundo branco/rosa), fiel à referência `blog.png`:
- **Hero**: eyebrow "Blog", título "Revista Turkista", subtítulo "Conteúdo sobre moda praia, performance, tecidos e cuidados para te acompanhar sempre."
- **Filtro de categorias**: Todos · Guia de Cuidados · Tecido & Tecnologia · Estilo · Treino & Performance · Bastidores — funcional em JS puro (`src/scripts/componentes/filtro-blog.js`), filtra os cards no cliente sem recarregar a página; sem JS, todos os artigos continuam visíveis (degrada bem).
- **Grade de 10 artigos**, com os mesmos títulos e categorias da referência (Como cuidar do seu biquíni…, O tecido certo faz toda a diferença, Moda praia o ano inteiro, Biquíni ou top esportivo?, Do ateliê à peça pronta, Lavagem/secagem/armazenamento, Proteção UV, Fabricação própria, Peças que te acompanham em cada movimento, Cores que valorizam seu tom de pele). Cada card tem categoria, título, resumo curto e link "Ler artigo".
- **CTA "Ver todos os artigos"** ao final da grade.
- Header, footer e botão flutuante de WhatsApp completos, no mesmo padrão das demais páginas.

### Fotos dos artigos — mesmo padrão da Home (sem fake, sem base64)
Cada card aponta para `assets/blog/nome-do-arquivo.jpg` com fallback (`onerror`) que esconde a imagem e revela um gradiente placeholder caso o arquivo ainda não exista. Criado `assets/blog/README.md` com o nome exato esperado para cada uma das 10 fotos, seguindo a mesma lógica já usada em `assets/hero/`, `assets/linhas/`, `assets/produtos/` e `assets/sobre/`.

### O que os artigos ainda não têm
Os links "Ler artigo" e "Ver todos os artigos" ainda apontam para `#` — o texto completo de cada matéria e a página de listagem paginada dependem do catálogo (Etapa 2) e são o próximo passo dentro da própria Etapa 6. O que foi entregue aqui é a estrutura visual completa e navegável da Revista Turkista, pronta para receber o conteúdo redigido sem precisar mexer em layout.

### Link "Blog" adicionado ao menu superior
Adicionado nas 6 páginas do showroom (`index.html`, `sobre-a-marca.html`, `contato.html`, `como-cuidar-da-peca.html`, `politica-de-privacidade.html` e o próprio `blog.html`):
- Nav desktop, na posição indicada pela referência (logo após "Turk Fit", antes de "Sobre a Marca").
- Menu mobile em tela cheia, mesma posição.
- Coluna "Marca" do rodapé.

**Nota sobre o item "Contato" no nav**: a referência `blog.png`/`02.png` não mostra "Contato" no menu desktop (usa ícones de busca/WhatsApp em vez disso). Mantive "Contato" como link de texto, seguindo a mesma decisão já tomada no Adendo 1 — o botão "Fale conosco" e os ícones de busca não fazem parte dos componentes do Design System construídos na Etapa 1, e remover o único link de texto para a página de contato reduziria a facilidade de conversão sem ganho real de fidelidade visual.

### Pendências remanescentes (Etapa 6)
- [ ] Redigir o conteúdo completo de cada um dos 10 artigos (ou dos que forem priorizados primeiro).
- [ ] Criar o template de página de artigo individual (`blog/[slug].html` ou equivalente) e apontar os links "Ler artigo" para ele.
- [ ] Criar a página de listagem paginada / "Ver todos os artigos".
- [ ] Fotos reais de cada artigo (`assets/blog/`, nomes já definidos no README da pasta).

---

## Adendo 4 — As 10 páginas de artigo da Revista Turkista
*Adicionado em: Agosto de 2026, pós-Adendo 3*

### O que foi feito
O Adendo 3 deixou registrado que os links "Ler artigo" ainda apontavam para `#`, sem página de destino. Esta atualização resolve essa pendência: criei as 10 páginas de artigo, com texto completo redigido (não `lorem ipsum`), e liguei todos os links de `blog.html` a elas.

- **Pasta nova `blog/`**, com uma página HTML estática por artigo (ex.: `blog/cuidados-biquini.html`, `blog/tecido-certo.html` etc.), seguindo o mesmo padrão de sites estáticos já usado no resto do projeto — sem framework, uma página por conteúdo.
- **Layout de leitura novo** (`src/pages/blog/artigo.css`): breadcrumb Home / Blog / Artigo, categoria + tempo estimado de leitura, título, imagem de capa, corpo do texto, um bloco de destaque tipográfico (mesmo padrão do manifesto da página Sobre a Marca) e um CTA de WhatsApp específico do artigo ao final.
- **Seção "Continue lendo"** ao final de cada artigo, com 3 artigos relacionados (priorizando a mesma categoria), reaproveitando o componente `.card-artigo` já criado para a grade do blog — nenhum CSS novo duplicado.
- **Texto redigido com base nos fatos já estabelecidos** no restante do site — política de lavagem/armazenamento (`como-cuidar-da-peca.html`), a história do ateliê da família (`sobre-a-marca.html`), as três linhas Praia/Surf/Turk Fit e a política "se soltar um ponto, a gente conserta". Nenhum dado novo foi inventado sobre a marca; onde o texto precisa de uma decisão que só a Danielle pode confirmar (ex.: tom mais técnico sobre proteção UV do tecido), o texto foi escrito de forma factualmente conservadora, sem alegações que exijam laudo técnico.
- **Marcação `Article` em JSON-LD** em cada página (título, descrição, categoria), para SEO — mesmo padrão de schema já usado no projeto de outro cliente (Danny Queiroz).
- **`blog.html` atualizado**: os 10 links "Ler artigo" agora apontam para as páginas reais (`blog/<slug>.html`), e o botão "Ver todos os artigos" rola até o topo da grade (`#grade-artigos`) — como todos os artigos já existentes já aparecem na própria página, uma paginação separada só faz sentido quando houver mais de ~10-15 artigos publicados.
- Gerador reaproveitável: as 10 páginas foram produzidas por um script Python com um template único (não há 10 arquivos mantidos manualmente de forma independente) — facilita revisar o texto de todos de uma vez e gerar novos artigos no mesmo padrão depois.

### Revisão da marca ainda pendente
Os textos dos 10 artigos foram escritos com base fiel no que já está aprovado no restante do site (Manual da Marca, Sobre a Marca, Como Cuidar da Peça), mas — como todo o conteúdo institucional — ainda não passaram por aprovação humana da Danielle/Yansix. Mesmo tratamento dado ao texto das 5 páginas institucionais na Etapa 3.

### Pendências remanescentes (Etapa 6)
- [ ] Aprovação da marca sobre o texto dos 10 artigos.
- [ ] Fotos reais de cada artigo (`assets/blog/`, nomes já definidos no README da pasta) — cada `<img>` já está pronta para recebê-las via fallback automático.
- [ ] Se o volume de artigos crescer além de ~15, avaliar página de listagem paginada separada da Home do blog.
- [ ] Link para a peça específica mencionada em cada artigo, assim que o catálogo (Etapa 2) e a ficha de produto (Etapa 5) existirem.

---

## Adendo 5 — Correção de extensão de imagem em assets/produtos
*Adicionado em: Agosto de 2026, pós-Adendo 4*

Durante uma checagem geral dos READMEs de pastas de foto, encontrei uma foto de produto já enviada (`assets/produtos/maio-surf-bloom.png`) que não aparecia no site: o código em `index.html` esperava `maio-surf-bloom.jpg`, então o `onerror` estava escondendo a imagem e mostrando o gradiente placeholder por trás, mesmo com o arquivo já existindo na pasta.

**Correção aplicada:** o `<img>` do produto "Maiô Surf Bloom" em `index.html` agora aponta para `assets/produtos/maio-surf-bloom.png`, batendo com a extensão real do arquivo já enviado. Atualizei também `assets/produtos/README.md` para refletir a extensão correta e reforcei ali que a extensão faz parte do nome esperado (`.jpg` e `.png` não são intercambiáveis automaticamente).

Encontrei também um arquivo órfão na mesma pasta, `assets/produtos/01.jpg`, que não corresponde a nenhum dos 4 nomes esperados e não é referenciado em nenhuma página — sinalizado no README daquela pasta para confirmação da marca (renomear para um dos slots existentes ou remover).

---
*Documento gerado como atualização viva do Plano Mestre de Implementação original — este arquivo, e não o PDF estático, deve ser consultado para saber o que já foi construído.*

---

## Adendo 6 — Pendências de Etapa 0 e Etapa 1 fechadas + Etapa 2 adiantada (schema de produto)
*Adicionado em: Agosto de 2026, pós-Adendo 5*

### O que foi pedido
Continuar implementando melhorias e atualizar o roadmap. Revisei os itens marcados como `[ ]` (pendentes) no restante do documento e fechei todos os que **não dependem de decisão externa à codificação** (domínio, fotos, aprovação humana da marca).

### 🔧 Etapa 0 — `robots.txt` criado
Pendência do checklist: "Rotas `/carrinho/` e `/checkout/` reservadas no `robots.txt` — ainda não criado." Resolvida.

- `robots.txt` na raiz do projeto, bloqueando `/carrinho/` e `/checkout/` (Etapa 15, prontidão para e-commerce — essas rotas não existem ainda, mas ficam reservadas de antemão para não serem indexadas quando forem construídas).
- Reforçado `Disallow` para `politica-de-privacidade.html`, que já tinha `noindex` na tag `<meta>` (dupla garantia).
- Comentário lembrando de adicionar a linha `Sitemap:` assim que o domínio final for definido (ainda bloqueado por decisão de hospedagem, fora do escopo de código).
- Também criado `.gitignore` na raiz (SO, editores, e já preparado para uma eventual migração futura a Astro/Next, prevista na Arquitetura Técnica, mesmo que hoje o projeto seja 100% estático sem passo de build).

### 🔧 Etapa 1 — Auditoria formal de contraste WCAG AA concluída
Pendência do checklist: "auditoria formal de contraste WCAG AA em todas as combinações de cor." Resolvida.

Calculei o contraste real (fórmula de luminância relativa do WCAG) de todos os pares cor-de-texto × cor-de-fundo efetivamente usados no CSS do projeto — não apenas a paleta em abstrato, mas o uso real em cada componente. Rodei isso contra `tokens.css` e contra os 4 arquivos de página/componente que usam a paleta em fundo claro (`home.css`, `blog.css`, `artigo.css`) e escuro (`header.css`, `cards.css`, `botoes.css`, `institucional.css`, `footer.css`).

**Resultado:** a paleta funciona bem sobre fundo escuro (o tema padrão das páginas institucionais) — todos os pares ali passam em AA, inclusive `--cor-rosa-turkista` sobre `--cor-preto-grafite` (7,59:1). O problema apareceu especificamente onde a paleta é usada em **texto pequeno/semibold sobre fundo claro** (tema claro da Home v2 e do Blog): `--cor-rosa-profundo` sozinho dá 4,16:1, abaixo do mínimo de 4,5:1 exigido para texto que não é "grande" (< 18,7px em negrito ou < 24px regular) — e a maior parte dos usos afetados eram rótulos de 11–13px.

**7 pontos corrigidos**, todos em estado *persistente* (não hover — hover é feedback transitório e não estava sendo contado como falha):
1. Botão "Fazer parte do showroom" (Home) e "Ver todos os artigos" (Blog) — `.botao--contorno-rosa`.
2. Link "Ver produto" nos cards de produto da Home — `.card-produto__link`.
3. Rótulo de categoria nos cards de artigo do Blog — `.card-artigo__categoria`.
4. Link "Ler artigo" nos cards de artigo — `.card-artigo__link`.
5. Categoria no hero de cada página de artigo — `.artigo-hero__categoria`.
6. Item de menu ativo (`aria-current="page"`) no header em tema claro do Blog.
7. Filtro de categoria selecionado (`aria-pressed="true"`) na página do Blog.

**Correção aplicada:** criado um token derivado em `tokens.css`, `--cor-rosa-acessivel: #BF4A94` — mesma família de cor de `--cor-rosa-profundo` (`#C94E9C`), ~4pt mais escuro em V (HSV), dando 4,54:1 de contraste sobre branco. Visualmente quase indistinguível do rosa original, mas dentro do mínimo AA. Aplicado nos 7 pontos acima, cada um com comentário no CSS explicando o motivo da troca. **A paleta institucional oficial do Manual da Marca não foi alterada** — o token novo é só uma variante funcional, seguindo o mesmo padrão já usado para `--cor-grafite-elevado` e `--cor-grafite-linha`.

Ícones decorativos (ex.: ícone do card de diferencial, ícone da faixa de benefícios) foram revisados e não precisaram de correção — não carregam informação textual e já ficam acima do mínimo de 3:1 para elementos gráficos não textuais.

### 🟡 Etapa 2 — Schema de produto adiantado (sem esperar as fotos)
O próprio status anterior já registrava: *"Posso desenhar o schema de produto (JSON) sem esperar as fotos, se você quiser que eu avance nisso primeiro."* Avancei nisso nesta atualização.

- **`src/schema/produto.schema.json`** — JSON Schema (draft-07) completo cobrindo: identificação (`id`, `slug`, `nome`), agrupamento (`linha`: praia/surf/turk-fit, `categoria`), ficha técnica (`composicao.tecido`, `composicao.protecaoUV`), variação por cor com fotos próprias, grade de tamanhos (`PP` a `GG`), tabela de medidas por tamanho, preço (opcional), imagens com `alt` obrigatório, badges (reaproveitando o componente já existente da Etapa 1: novo/exclusivo/últimas unidades/reposição), tags de busca e `status` de publicação (rascunho/publicado/esgotado/descontinuado).
- **`src/content/produtos/`** — 4 arquivos de exemplo, um para cada produto que já existe hardcoded em `index.html` hoje (Biquíni Aurora, Maiô Surf Bloom, Top Turk Fit Essence, Short Turk Fit Flow). Usei os nomes e a linha reais — já aprovados, pois já estão na Home — em vez de `lorem ipsum`, seguindo o mesmo princípio já usado nos textos do Blog (Adendo 4).
- **Validação:** os 4 exemplos foram validados programaticamente contra o schema (biblioteca `jsonschema`) — todos passam.
- Campos que só a marca pode decidir foram deixados deliberadamente como placeholder, nunca inventados: `composicao.tecido` como `"PREENCHER — confirmar com a marca"` (a % exata de poliamida/elastano varia por peça), `composicao.protecaoUV` como `null` (mesmo critério já usado no Adendo 4 — nenhuma alegação de FPS sem laudo técnico) e `preco` como `null` (hoje a venda é 100% via WhatsApp, sem preço público fixo, conforme `contato.html`).
- Criado README em `src/content/produtos/` explicando essas pendências e como o schema se conecta à Etapa 4 (Catálogo por Linha e Filtros) quando ela começar — hoje **nada lê estes arquivos ainda**; os 4 produtos continuam hardcoded em `index.html`, exatamente como estavam. Isso é intencional: o schema precisa existir e ser validado antes de qualquer página passar a consumi-lo.

### O que continua bloqueado por decisão externa (não tocado nesta atualização)
- Domínio, SSL, CDN, CI/CD e hospedagem (Etapa 0) — decisão da marca, fora do escopo de código.
- Fotos still-life do estoque (Etapa 2) — pré-requisito explícito do Plano Mestre antes do catálogo real.
- Aprovação da marca sobre o texto das 5 páginas institucionais e dos 10 artigos do Blog (Etapas 3 e 6).
- Arquivo órfão `assets/produtos/01.jpg` (Adendo 5) — segue aguardando confirmação da Danielle (renomear ou remover).
- Componentes de filtro de catálogo, FAQ/accordion, galeria de produto e seletor de tamanho/cor (Etapa 1, uso na Home) — entram nas Etapas 4 e 5, que dependem do catálogo real.
- Validar o schema de produto com pelo menos 3 peças **de cada** linha, não apenas 1 por peça já existente — depende da marca confirmar composição de tecido das próximas peças.

### Checklist atualizado — Etapa 0
- [x] Árvore de pastas criada seguindo a Arquitetura Técnica.
- [x] Estrutura pronta para versionamento Git — `.gitignore` criado; `README.md` do repositório segue como próximo passo recomendado.
- [ ] Domínio, SSL, CDN, CI/CD, hospedagem — depende de acesso a contas da marca.
- [x] Rotas `/carrinho/` e `/checkout/` reservadas no `robots.txt`.

### Checklist atualizado — Etapa 1
- [x] Tokens de cor, tipografia, componentes (já concluído em sessões anteriores).
- [ ] Componentes ainda não usados na Home (filtros, FAQ, galeria, seletor) — Etapas 4/5.
- [x] Auditoria formal de contraste WCAG AA em todas as combinações de cor — 7 correções aplicadas.

### Checklist atualizado — Etapa 2
- [x] Schema de produto (JSON) desenhado e validado com 4 exemplos reais.
- [ ] Bloqueada para o catálogo real: produção fotográfica still-life do estoque.
- [ ] Validar o schema com pelo menos 3 peças de cada linha (hoje: 1 exemplo por peça, cobrindo as 3 linhas).

---
*Documento gerado como atualização viva do Plano Mestre de Implementação original — este arquivo, e não o PDF estático, deve ser consultado para saber o que já foi construído.*

---

## Adendo 7 — Todas as imagens do projeto convertidas para WebP (performance / Core Web Vitals)
*Adicionado em: Agosto de 2026, pós-Adendo 6*

### O que foi pedido
Converter todas as imagens do projeto para uma extensão mais leve, sem perder qualidade, visando um LCP (Largest Contentful Paint, métrica de Core Web Vitals) melhor — e atualizar todas as referências de imagem no código.

### Imagens reais convertidas
O projeto tinha 3 arquivos de imagem reais (todas as outras pastas de `assets/` só têm README aguardando fotos ainda não enviadas pela marca — ver Etapa 2). Convertidas de `.jpg`/`.png` para `.webp`, qualidade 85 (sem perda perceptível — inspecionado visualmente lado a lado):

| Arquivo | Antes | Depois | Redução |
|---|---|---|---|
| `assets/produtos/biquini-aurora` | 2.502 KB (.jpg) | 195 KB (.webp) | -92% |
| `assets/produtos/maio-surf-bloom` | 2.106 KB (.png) | 133 KB (.webp) | -94% |
| `assets/produtos/01` (arquivo órfão, Adendo 5) | 2.000 KB (.jpg) | 92 KB (.webp) | -95% |

**Achado lateral:** ao inspecionar os bytes dos 3 arquivos (não só a extensão), descobri que os arquivos com extensão `.jpg` (`biquini-aurora.jpg` e o antigo `01.jpg`) eram, na verdade, PNG por dentro — o navegador ainda exibia certo porque navegadores modernos leem pela assinatura do arquivo, não pela extensão, mas o `Content-Type` servido por um servidor de produção teria ficado incorreto. A conversão para `.webp` resolve isso de quebra, já que o arquivo novo é de fato WebP por dentro.

### Todas as referências de imagem atualizadas no código
Busquei por toda extensão de imagem pesada (`.jpg`, `.jpeg`, `.png`) em todo o projeto e troquei por `.webp` em:

- **`index.html`** — hero, 3 cards de linha, 4 cards de produto, 3 fotos de bastidores.
- **`blog.html`** — 10 imagens de capa dos artigos.
- **As 10 páginas em `blog/`** — a própria capa de cada artigo + as chamadas para os 3 artigos relacionados em "Continue lendo" (cobre também as fotos que ainda não existem, ver abaixo).
- **`src/pages/home/home.css`** — comentário que citava o nome do arquivo do hero.
- **`src/content/produtos/*.json`** (os 4 exemplos do Adendo 6) — campo `arquivo` de cada imagem.
- **`src/schema/produto.schema.json`** — exemplo e texto explicativo do campo `arquivo`, agora recomendando `.webp` como padrão do projeto.
- **Os 5 READMEs de `assets/`** (`hero`, `linhas`, `sobre`, `blog`, `produtos`) — nomes de arquivo esperados atualizados para `.webp`, com uma nota nova explicando que a marca pode enviar a foto original em qualquer formato (JPG, PNG, HEIC do celular) e a conversão para `.webp` com o nome exato é feita antes de a foto entrar na pasta — ninguém do lado da marca precisa saber converter arquivo.

Nenhuma referência de imagem pesada ficou para trás — conferido com busca em todo o projeto (HTML, CSS, JS, JSON) ao final da atualização.

### Fotos que ainda não existem (Etapa 2, sem mudança de status)
As pastas `assets/hero/`, `assets/linhas/`, `assets/sobre/` e `assets/blog/` continuam sem fotos reais — a mudança aqui foi só o **nome esperado do arquivo** (de `.jpg` para `.webp`), preparando o terreno para quando a sessão fotográfica acontecer. O mecanismo de fallback (`onerror` escondendo a imagem e revelando o gradiente placeholder) continua funcionando exatamente igual.

### Exceção deliberada: favicon
`public/favicon/` foi a única pasta **não** convertida para o padrão WebP — documentei no README de lá que `favicon.ico` e `apple-touch-icon.png` precisam manter seus formatos originais, porque navegadores e o iOS não têm suporte garantido a WebP para ícones de aba/tela inicial.

### Por que WebP e não outro formato mais novo (AVIF)
Optei por WebP e não AVIF (que comprime ainda mais) porque WebP já tem suporte universal em todos os navegadores relevantes hoje, sem necessidade de `<picture>` com fallback, mantendo o HTML simples — uma única tag `<img>` por imagem, como já era. Se a prioridade máxima de performance justificar o ganho adicional de AVIF (tipicamente mais 20-30% menor que WebP) no futuro, dá para reavaliar quando o catálogo real (Etapa 2) tiver volume maior de fotos.

### Impacto esperado no Core Web Vitals
A imagem do hero (`hero-praia`) e as imagens de produto na Home são as candidatas mais prováveis a LCP (maior elemento visível na primeira dobra) — hoje ainda são placeholders (gradiente CSS), mas o padrão de nomenclatura e o mecanismo de fallback já garantem que, assim que as fotos reais entrarem, elas entrem já otimizadas, sem precisar de mais uma rodada de correção depois.

---
*Documento gerado como atualização viva do Plano Mestre de Implementação original — este arquivo, e não o PDF estático, deve ser consultado para saber o que já foi construído.*

---

## Adendo 8 — Página 404, sitemap.xml, canonical e Open Graph/Twitter Card em todo o site
*Adicionado em: Agosto de 2026, pós-Adendo 7*

### Contexto
Com o Adendo 7 fechado, revisei novamente todo o checklist do documento (Etapas 0 a 6) em busca de pendências que **não dependem de decisão externa à codificação** (domínio, fotos, aprovação humana da marca). Encontrei que praticamente todo o checklist restante já estava, de fato, bloqueado externamente — mas identifiquei 4 lacunas técnicas reais que não tinham sido registradas como pendência em nenhum adendo anterior, porque não faziam parte do escopo original de nenhuma etapa: página de erro 404, `sitemap.xml`, URLs canônicas e metadados de compartilhamento (Open Graph/Twitter Card). Resolvi as 4, em ordem de menor para maior tempo de execução.

### 1. Página `404.html` criada
O projeto não tinha página de erro — um link quebrado (comum durante a fase de revisão, ou depois que o domínio for ao ar) caía na página em branco padrão do servidor. Criada `404.html` na raiz, seguindo exatamente o mesmo padrão visual das páginas institucionais (header fixo, footer completo, botão flutuante de WhatsApp, tema escuro), com:
- Número "404" em destaque tipográfico (Fraunces, cor rosa Turkista).
- Mensagem curta e no tom de voz da marca ("Essa peça não está no nosso showroom").
- Dois CTAs: voltar para a Home e falar no WhatsApp (usando o mesmo padrão de link `wa.me` com mensagem pré-preenchida já usado nas outras páginas).
- `<meta name="robots" content="noindex, follow">` — a própria página de erro não deve ser indexada, mas os links nela devem ser seguidos.

### 2. `sitemap.xml` criado
Criado na raiz, listando as 15 páginas indexáveis do site (as 5 institucionais + `blog.html` + os 10 artigos), com `changefreq` e `priority` proporcionais à importância de cada página (Home = 1.0, artigos de blog = 0.5). `politica-de-privacidade.html` foi deliberadamente omitida, por já ter `noindex`. `404.html` também não entra (página de erro nunca deve estar em sitemap).

Usei o domínio-alvo `www.turkista.com.br`, que já era conhecido desde a v1.0 do documento (Etapa 0, linha do domínio) — mas **a linha `Sitemap:` em `robots.txt` continua comentada**, exatamente como já estava documentada, até o domínio estar de fato publicado. Atualizei apenas o comentário em `robots.txt` para deixar claro que o arquivo já existe e só falta descomentar a linha quando o site for ao ar; nenhuma outra ação de código será necessária nesse momento.

### 3. URLs canônicas (`<link rel="canonical">`) em todas as 17 páginas
Adicionada em cada página, apontando para a própria URL em `www.turkista.com.br` (mesmo domínio-alvo do item 2). Evita problemas de conteúdo duplicado para buscadores caso a mesma página um dia fique acessível por mais de um caminho (ex.: com e sem `www`, ou durante testes em ambiente de homologação).

### 4. Open Graph e Twitter Card em todas as 17 páginas
Nenhuma página tinha metadados de compartilhamento — ou seja, qualquer link do site colado no WhatsApp, Instagram ou Facebook (o principal canal de venda da marca, conforme `contato.html`) aparecia sem preview de imagem, título ou descrição, prejudicando diretamente a conversão desses canais. Adicionado em cada página:
- `og:type` (`website` nas 6 páginas institucionais/blog-índice, `article` nos 10 artigos).
- `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:url`, `og:image`.
- `article:section` nos 10 artigos, usando a mesma categoria já exibida em `blog.html` (Guia de Cuidados, Tecido & Tecnologia, Estilo, Treino & Performance, Bastidores).
- `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.

Título e descrição reaproveitam exatamente o `<title>` e `<meta name="description">` que cada página já tinha (nenhum texto novo foi inventado). A imagem (`og:image`/`twitter:image`) segue o mesmo princípio já estabelecido nos Adendos 2 e 3 para fotos ainda não enviadas pela marca: aponta para o nome de arquivo `.webp` já documentado nos READMEs de `assets/hero/` e `assets/blog/` (ex.: `assets/hero/hero-praia.webp` para as páginas institucionais, `assets/blog/<slug>.webp` para cada artigo). Hoje esses arquivos ainda não existem, então o preview aparece sem imagem ao compartilhar — mas assim que a marca colocar as fotos reais nos nomes já esperados (Etapa 2), o preview passa a exibi-las automaticamente, sem qualquer alteração de código, exatamente como já acontece com o mecanismo de fallback (`onerror`) usado nas imagens do próprio site.

### Validação
- Checagem programática (Python) em todos os 17 arquivos HTML: nenhuma tag `<html>`, `<head>` ou `<body>` desbalanceada; `canonical` e `og:title` presentes em 100% das páginas.
- Nenhuma foto real foi referenciada como se existisse — todos os caminhos de imagem usados em `og:image`/`twitter:image` já estavam documentados como nomes esperados nos READMEs de `assets/`, mantendo o princípio de nunca inventar conteúdo (mesmo critério já aplicado às fotos, ao FPS/UV e ao preço no Adendo 6).

### O que continua bloqueado por decisão externa (sem mudança nesta atualização)
- Domínio, SSL, CDN, CI/CD e hospedagem (Etapa 0).
- Fotos still-life do estoque e demais fotos reais (Etapa 2) — inclusive as que agora também alimentariam `og:image`.
- Aprovação da marca sobre o texto das 5 páginas institucionais e dos 10 artigos do Blog.
- Arquivo órfão `assets/produtos/01.jpg` (Adendo 5) — segue aguardando confirmação da Danielle.
- Componentes de filtro de catálogo, FAQ/accordion, galeria de produto e seletor de tamanho/cor — Etapas 4 e 5, dependem do catálogo real.
- Validar o schema de produto com pelo menos 3 peças de cada linha.

Com este adendo, **todas as pendências de código de escopo conhecido e não bloqueado por decisão externa estão fechadas.** O próximo trabalho de codificação com valor real depende de pelo menos um dos itens acima ser resolvido pela marca — a lista de "Próximos passos recomendados" original (topo deste documento) continua válida e é a ordem sugerida para retomar.

---
*Documento gerado como atualização viva do Plano Mestre de Implementação original — este arquivo, e não o PDF estático, deve ser consultado para saber o que já foi construído.*

---

## Adendo 9 — Ficha de Produto (Etapa 5, adiantada) para os 4 produtos de exemplo
*Adicionado em: Agosto de 2026, pós-Adendo 8*

### O que foi pedido
Avançar em partes do projeto que não dependem da sessão de fotos still-life (Etapa 2)
nem de outras decisões externas. Combinado começar pela **ficha de produto** (Etapa 5),
usando os 4 exemplos de produto já validados contra o schema (Adendo 6).

### Por que isso não fura a ordem do Plano Mestre
A Etapa 5 formalmente só começaria depois da Etapa 4 (Catálogo por Linha e Filtros), que
por sua vez depende do catálogo real (Etapa 2 — bloqueada por fotos). Mas o **template** da
ficha de produto — layout, componentes de seleção de cor/tamanho, ficha técnica, CTA de
WhatsApp, JSON-LD — não depende de o catálogo estar completo, só de o schema existir (que já
existia desde o Adendo 6). Mesma lógica já usada para adiantar o próprio schema: construir a
estrutura agora evita retrabalho de layout quando o catálogo real chegar.

### O que foi construído

**`src/pages/produto/produto.css`** — CSS da página, tema claro (mesma família visual da
Home v2 e do Blog). Três componentes novos que ainda não existiam em nenhuma página do site
(pendência registrada desde a Etapa 1): galeria com miniaturas, seletor de cor (swatches) e
seletor de tamanho.

**`src/scripts/componentes/ficha-produto.js`** — interatividade client-side, degrada bem
sem JS (a primeira imagem/tamanho continuam visíveis mesmo se o script não rodar):
- Clique em miniatura troca a imagem principal.
- Seletor de cor troca o nome exibido (com apenas 1 cor por produto nos 4 exemplos atuais,
  este seletor não aparece ainda — só aparece quando um produto tiver 2+ cores cadastradas).
- Seletor de tamanho alterna estado visual **e** atualiza a mensagem pré-preenchida do botão
  de WhatsApp para já incluir o tamanho escolhido — evita que a cliente precise digitar de
  novo na conversa.

**`scripts/gerar-ficha-produto.py`** — gerador Python, mesmo princípio já usado nos 10
artigos do blog (Adendo 4): lê cada JSON de `src/content/produtos/`, valida a estrutura
esperada e gera uma página estática em `produto/<slug>.html`. Reaproveitável: quando o
catálogo real crescer (Etapa 4), roda-se o script de novo para qualquer produto novo, sem
escrever HTML à mão peça por peça. Cada página gerada inclui:
- Breadcrumb (Home → Linha → Produto).
- Galeria com fallback (`onerror`) idêntico ao resto do site — hoje mostra o gradiente
  placeholder, porque as fotos ainda não existem (Etapa 2).
- Badges (reaproveitando o componente já existente da Etapa 1).
- Bloco de preço: mostra o valor quando `preco` não é `null`, ou uma nota "Preço sob
  consulta" com CTA de WhatsApp quando é `null` (hoje, para os 4 exemplos) — nunca inventa
  um preço.
- Ficha técnica (`<dl>`): omite automaticamente qualquer campo ainda com placeholder
  (`composicao.tecido` como "PREENCHER —…" não aparece na página; só campos já confirmados).
- Seção "Combina com essa" — produtos relacionados da mesma linha, gerada automaticamente
  a partir dos outros JSONs (hoje só aparece quando há 2+ produtos na mesma linha; entre os
  4 exemplos atuais, isso já acontece para Turk Fit).
- `<title>`, meta description, canonical, Open Graph, Twitter Card e **JSON-LD `Product`**
  (nome, imagem, descrição, marca, cor e — só quando há preço confirmado — bloco `offers`),
  seguindo exatamente o mesmo padrão já estabelecido para as páginas institucionais (Adendo
  8) e para os artigos do blog (`Article`, Adendo 4).

**4 páginas geradas e validadas:** `produto/biquini-aurora.html`,
`produto/maio-surf-bloom.html`, `produto/top-turk-fit-essence.html`,
`produto/short-turk-fit-flow.html`. Validação programática: JSON dos 4 produtos contra
`produto.schema.json` (`jsonschema`, todos passam), HTML das 4 páginas geradas (tags
balanceadas, canonical e Open Graph presentes em 100%), e checagem de link quebrado em
todo o projeto (21 páginas HTML, nenhum link de navegação quebrado).

### 🔧 Correção estrutural — CSS de `.card-produto` movido para componente compartilhado
Ao construir a seção "Combina com essa" da ficha de produto, percebi que os estilos de
`.card-produto`/`.grade-produtos` estavam definidos **só** em `src/pages/home/home.css` —
ou seja, qualquer outra página que tentasse reaproveisar esse card (como a ficha de produto
está fazendo agora) ficaria sem estilo nenhum. Migrei o bloco inteiro (cerca de 35 linhas,
incluindo a variação de gradiente por posição e o breakpoint desktop) de `home.css` para
`src/styles/componentes/cards.css`, que já é carregado por toda página que precisa de cards.
`index.html` não teve nenhuma mudança visual — continua carregando `cards.css` como já
carregava para os cards de diferencial.

### Os 4 cards de "Produtos em Destaque" da Home agora linkam para a ficha real
`href="#"` nos 4 cards de `index.html` foi trocado para `produto/<slug>.html`
correspondente. Nenhuma outra mudança na Home.

### O que a ficha de produto ainda não faz (fora do escopo deste adendo)
- **Carrinho/compra pelo site** — não existe e não é esperado nesta fase (Etapa 15,
  Prontidão para E-commerce, não iniciada). O CTA principal continua sendo WhatsApp.
- **Trocar a galeria inteira ao mudar de cor** — hoje o seletor de cor só troca o nome
  exibido (documentado no próprio `ficha-produto.js`), porque nenhum dos 4 exemplos tem
  mais de uma cor cadastrada ainda. Assim que um produto real tiver 2+ cores com fotos
  próprias (já previsto no schema, campo `cores[].imagens`), este é o próximo ajuste.
- **Filtro de catálogo, paginação e página de listagem por linha** — Etapa 4, ainda não
  iniciada; a ficha de produto foi construída para ser o destino desses filtros quando
  existirem, não para substituí-los.

### O que continua bloqueado por decisão externa (sem mudança nesta atualização)
- Domínio, SSL, CDN, CI/CD e hospedagem (Etapa 0).
- Fotos still-life do estoque (Etapa 2) — inclusive as que a galeria da ficha de produto já
  está pronta para exibir assim que existirem, sem qualquer alteração de código.
- Composição de tecido, proteção UV e preço reais de cada peça (aguardando confirmação da
  marca — os placeholders "PREENCHER" seguem intactos e propositalmente fora da ficha
  publicada).
- Aprovação da marca sobre os textos já existentes no site.
- Arquivo órfão `assets/produtos/01.jpg` (Adendo 5).

### Próximo passo natural
Quando a planilha de estoque revisada pela Danielle chegar, os próximos produtos entram
pelo mesmo fluxo: criar o JSON em `src/content/produtos/` seguindo o schema → rodar
`python3 scripts/gerar-ficha-produto.py` → a ficha de produto sai pronta, no mesmo padrão
visual e técnico já validado aqui — sem esperar as fotos para o texto/estrutura existir,
exatamente como o restante do site já faz.

---
## Adendo 10 — Ajustes de conteúdo em Sobre a Marca/Blog e decisões da marca sobre pendências
*Adicionado em: Agosto de 2026, pós-Adendo 9*

### Conteúdo removido/ajustado a pedido da marca
- **`sobre-a-marca.html`** — removida a seção "Jornada da marca" (linha do tempo Origem → Consolidação → Momento atual → Próximo passo).
- **`blog.html`** — testado remover o "TURK" do logo do rodapé e depois revertido: o rodapé do blog volta a mostrar "TURKISTA" completo, igual às demais páginas do site.

### Pendências resolvidas
- **Arquivo órfão `assets/produtos/01.jpg`/`01.webp`** (sinalizado desde o Adendo 5) — removido a pedido da marca. `assets/produtos/README.md` atualizado para refletir a remoção.

### Decisões da marca sobre itens antes listados como pendentes
- **Domínio, SSL, CDN, CI/CD e hospedagem (Etapa 0)** — a marca vai cuidar diretamente da contratação e configuração da hospedagem/servidor; não é uma tarefa de implementação de código deste projeto. Deixa de aparecer como pendência técnica minha.

---

## Adendo 11 — Catálogo por Linha e Filtros (Etapa 4, adiantada)
*Adicionado em: Agosto de 2026, pós-Adendo 10*

### O que foi construído
Assim como a Ficha de Produto (Etapa 5) foi adiantada no Adendo 9 usando os 4 produtos de
exemplo já existentes, a Etapa 4 (Catálogo por Linha e Filtros) segue o mesmo princípio:
construída com os mesmos 4 exemplos, sem esperar o catálogo real (que segue bloqueado pela
sessão still-life e pela confirmação de tecido/preço da marca — ver `src/content/produtos/README.md`).

**`catalogo.html`** — nova página, tema claro (mesma família visual da Home v2, do Blog e da
Ficha de Produto). Traz:
- Filtro por linha (Todas / Praia / Surf / Turk Fit), reaproveitando o padrão de pílulas já
  usado no filtro de categorias do Blog.
- Grade com os 4 produtos de exemplo, cada card linkando para a ficha de produto real
  (Etapa 5).
- Leitura da âncora da URL (`#praia`, `#surf`, `#turk-fit`) ao carregar — os links "Praia /
  Surf / Turk Fit" do site inteiro agora chegam aqui já filtrados pela linha certa.
- Mesmo aviso de transparência já usado na Home ("fotos e preços reais entram assim que a
  sessão still-life e o catálogo completo forem concluídos").

**`src/scripts/componentes/filtro-catalogo.js`** — mesmo princípio do `filtro-blog.js`
(Adendo 3): filtra no cliente, sem recarregar a página, degrada bem sem JS (todas as peças
continuam visíveis).

### 🔧 Componentes de CSS movidos para compartilhado (mesmo padrão do Adendo 9)
- `.filtro-categorias` (antes só em `blog.css`) → `src/styles/componentes/filtros.css`,
  agora carregado por `blog.html` e `catalogo.html`.
- `.aviso-catalogo` (antes só em `home.css`) → `src/styles/componentes/cards.css`, agora
  carregado por `index.html` e `catalogo.html`.
Nenhuma mudança visual em `blog.html` ou `index.html` — só reorganização de onde a regra
mora, mesmo princípio já usado para `.card-produto`/`.grade-produtos` no Adendo 9.

### Navegação atualizada em todo o site
Os 3 cards de linha da Home (Praia/Surf/Turk Fit, que apontavam para `href="#"`, sem destino)
agora levam ao catálogo já filtrado. E em **todas as outras páginas do site** (Blog, os 10
artigos, as 4 fichas de produto, as 4 páginas institucionais e a 404) os links "Praia / Surf /
Turk Fit" do menu, do rodapé e do breadcrumb — que antes apontavam para `index.html#praia`
(rolagem até a Home) — agora apontam para `catalogo.html#praia` (catálogo real, filtrado).
`sitemap.xml` atualizado com a nova página.

### Validação
Varredura programática em todo o projeto (22 páginas HTML): nenhum link interno quebrado,
tags balanceadas em `catalogo.html`. Os únicos `src` de imagem "ausentes" encontrados na
varredura são as fotos still-life que ainda não existem — mesmo placeholder com fallback
`onerror` já documentado no restante do site, não uma regressão desta atualização.

### O que ainda não faz (fora do escopo deste adendo)
- **Paginação e ordenação** — só fará sentido com um volume maior de produtos; hoje 4 peças
  cabem inteiras na mesma tela.
- **Filtro por categoria/tamanho/cor dentro de cada linha** — o schema já suporta (`categoria`,
  `tamanhos`, `cores`), mas não há produtos suficientes por linha ainda para justificar um
  segundo nível de filtro.
- **Grade consumindo os JSONs diretamente** (em vez de HTML escrito à mão, como hoje) — só
  faz sentido quando o catálogo real substituir os exemplos, seguindo `status: "publicado"`,
  como já registrado no README de `src/content/produtos/`.

---

## Adendo 12 — Aprovação da marca, FAQ (Etapa 1, componente adiantado) e status dos bloqueios externos
*Adicionado em: Agosto de 2026, pós-Adendo 11*

### Decisões da marca registradas
- **Aprovação de texto:** a marca aprovou os textos publicados no site até aqui. Eventuais correções pontuais serão repassadas depois, sem bloquear o restante do trabalho.
- **Fotos still-life:** a marca vai produzir as fotos e enviar em breve. Segue como pendência, mas não é mais um bloqueio indefinido — só uma questão de tempo.
- **Tecido/composição e preço por peça:** a marca vai confirmar e enviar esses dados em breve, o que permitirá validar o schema de produto com peças reais (Etapa 2) e destravar o catálogo publicado.

### FAQ (Etapa 1, componente adiantado)
Único componente do Design System que ainda não tinha sido usado em nenhuma página
("FAQ/accordion", pendência registrada desde a Etapa 1 do resumo executivo). Construído como
página própria, a pedido da marca.

**`faq.html`** — nova página, tema claro (mesma família visual das demais páginas novas:
Catálogo, Ficha de Produto). Acordeão com 8 perguntas, todas baseadas em conteúdo que já
existia em outras páginas do site — nenhuma informação nova foi inventada:
- Como comprar (WhatsApp, sem carrinho no site).
- Preço sob consulta.
- Tamanhos (P/M/G, conforme os exemplos já cadastrados).
- Política de não-reposição em série (do Manifesto).
- Horário de atendimento (de `contato.html`).
- Política de conserto ("Se soltar um ponto, a gente conserta", de `como-cuidar-da-peca.html`).
- Onde ver novidades (os 2 perfis de Instagram).
- Se há loja física (ateliê em Araruama, atendimento por WhatsApp/Instagram).

**`src/pages/faq/faq.css`** — usa `<details>/<summary>` nativos do HTML para o acordeão: abre,
fecha e é lido corretamente por leitor de tela sem depender de nenhum JavaScript, mesmo
princípio de "degrada bem sem JS" já seguido nos outros componentes interativos do site.

**SEO:** página inclui dados estruturados `FAQPage` (JSON-LD) — no Google, isso é o que
habilita a peça de FAQ expandir direto no resultado de busca (rich result), aumentando a
área ocupada pelo site na página de resultados sem custo de mídia.

### Navegação
Link "Perguntas Frequentes" adicionado na coluna "Marca" do rodapé em **todas as 22 páginas
do site**, e no menu mobile da própria página de FAQ. Não foi adicionado ao nav desktop
principal (já com 7 itens) nem ao menu mobile das demais páginas, seguindo o mesmo critério já
usado para `politica-de-privacidade.html` — página de apoio, acessível pelo rodapé, sem
disputar espaço com a navegação primária.

`sitemap.xml` atualizado com a nova página.

### Validação
Varredura programática em todo o projeto (23 páginas HTML): nenhum link interno quebrado,
tags balanceadas em `faq.html` (incluindo os 8 pares `<details>`/`<summary>`).

---

## Adendo 13 — Remoção do artigo "Proteção UV" (decisão da marca) + correção de alegação indevida
*Adicionado em: Agosto de 2026, pós-Adendo 12*

### Contexto
A marca confirmou que as peças Turkista **não têm proteção UV** (nenhum laudo ou dado de FPS
existente). Isso já era tratado corretamente na ficha técnica de cada produto
(`composicao.protecaoUV: null`, Adendo 6 — nenhum número era publicado). Mas, ao revisar o
site por causa dessa confirmação, identifiquei um problema real: o artigo do Blog
`blog/protecao-uv.html` afirmava, em texto corrido, que **"a lycra usada nas peças Turkista
tem uma trama pensada para oferecer uma barreira física consistente contra os raios
solares"** — uma alegação de proteção sem laudo técnico por trás, mesmo sem citar um número
de FPS. Contradiz diretamente o mesmo princípio já seguido no schema de produto (nunca
alegar proteção sem confirmação da marca). A marca pediu a remoção do artigo.

### O que foi removido
- **`blog/protecao-uv.html`** — arquivo excluído do projeto.
- **Card do artigo em `blog.html`** — removido da grade (a Revista Turkista passa de 10 para
  **9 artigos**).
- **Entrada no `sitemap.xml`** — removida.
- **Entrada em `assets/blog/README.md`** — removida da lista de fotos esperadas.

### O que foi ajustado (para não deixar link quebrado)
O artigo `blog/tecido-certo.html` tinha, na seção "Continue lendo", um card apontando para
o artigo removido. Substituí por um card para **"Peças que te acompanham em cada
movimento"** (`pecas-movimento.html`, categoria Treino & Performance) — outro artigo que já
existia, sem inventar conteúdo novo.

### Validação
Nova varredura programática em todo o projeto (22 páginas HTML, uma a menos que antes):
nenhum link interno quebrado, nenhuma referência remanescente a `protecao-uv` em HTML, XML
ou nos READMEs de `assets/`.

### Nota sobre o restante do site
Nenhuma outra página faz alegação de proteção UV — a busca por "proteção UV"/"FPS" em todo o
projeto retornou apenas menções neutras (ex.: o card do artigo "O tecido certo" na Home, que
não fala de UV). A ficha técnica dos 4 produtos de exemplo já estava correta desde o Adendo 6
e não precisou de nenhuma alteração.

---

## Adendo 14 — Painel Turkista (Produtos + Artigos + Fotos), Catálogo/Blog/Home dinâmicos, correção de rodapé
*Adicionado em: Agosto de 2026, pós-Adendo 13*

### Contexto
A Danielle passou a usar o painel local (criado como ferramenta auxiliar) para
cadastrar produtos de verdade. Pediu que o fluxo ficasse **totalmente
automático**: cadastrar no painel → aparecer no site sozinho, sem rodar
nenhum script à mão. Também pediu para ampliar o painel para cobrir fotos
institucionais e artigos do Blog, e reportou dois bugs visuais no rodapé.

### 1. Catálogo, Home e Blog passaram a ser dinâmicos
- `src/scripts/componentes/catalogo-dinamico.js` (substitui `filtro-catalogo.js`):
  busca `src/content/produtos/index.json` no navegador; se houver produtos
  reais com status "publicado"/"esgotado", troca os 4 cards de exemplo por
  eles; senão, mantém os exemplos. O filtro por linha (Todas/Praia/Surf/Turk
  Fit) continua funcionando do mesmo jeito, seja com exemplos ou produtos reais.
- `src/scripts/componentes/destaques-dinamico.js` (novo, `index.html`): mesma
  lógica para os "Produtos em Destaque" da Home — mostra até 4 produtos reais
  mais recentes com status "publicado"; sem produtos publicados, mantém os
  4 exemplos.
- `src/scripts/componentes/blog-dinamico.js` (substitui `filtro-blog.js`):
  busca `src/content/artigos/index.json`; ao contrário do catálogo, os 9
  artigos originais **não são substituídos** (já são conteúdo real e
  aprovado) — os artigos novos do painel são **acrescentados** à grade.

### 2. Painel Turkista — três abas
`painel-produtos/server.js` foi reescrito para servir três seções, cada uma
com endpoint próprio (`/api/produtos`, `/api/artigos`,
`/api/fotos-institucionais`):

- **Produtos** (já existia, Adendo anterior) — sem mudança de comportamento
  pro usuário, além de agora também atualizar o `sitemap.xml` automaticamente
  quando o status é "publicado".
- **Artigos do Blog** (novo) — formulário com título, categoria, resumo e
  corpo (texto simples: linha em branco separa parágrafos, `## ` cria
  subtítulo, `> ` cria destaque). Ao salvar, gera `src/content/artigos/<slug>.json`
  e roda `scripts/gerar-artigo-blog.py` (novo script, mesmo princípio do
  gerador de ficha de produto), que monta `blog/<slug>.html` já com a seção
  "Continue lendo" escolhida automaticamente por categoria (misturando os
  artigos originais e os novos do painel).
- **Fotos do Site** (novo) — lista os slots de foto institucional conhecidos
  (hero da Home, os 3 cards de linha, as 3 fotos da colagem "Sobre a
  Turkista", e uma capa por artigo do Blog) com indicação visual de quais já
  foram enviadas. Envia a foto certa pro lugar certo, já convertida pra
  `.webp`, sem precisar saber nomes de arquivo.

### 3. Automação completa por cadastro
A cada produto ou artigo salvo com status "publicado": o manifesto
(`index.json`) é regenerado, a página individual é gerada via Python
(`spawnSync`, com aviso no terminal se Python não estiver disponível), e a
URL entra automaticamente no `sitemap.xml` (rascunhos não entram).

### 4. Correção de bug de CSS no rodapé (reportado pela Danielle)
Causa raiz: `src/pages/blog/blog.css` tinha uma regra
`.cabecalho__logo { color: var(--cor-preto-grafite); }` sem escopo — pensada
só pro cabeçalho (fundo claro do Blog precisa de logo escura), mas como a
mesma classe é reaproveitada dentro do rodapé (`.rodape__marca .cabecalho__logo`),
a regra também escurecia o "TURKISTA" no rodapé, que é um fundo escuro
— texto quase invisível. Corrigido escopando a regra para
`.cabecalho .cabecalho__logo`. Na mesma investigação, os círculos de
Instagram/WhatsApp do rodapé (`.rodape__redes a`) também ficavam com o texto
invisível em `blog.html` pelo mesmo motivo indireto (herdavam a cor escura do
`body` que o `blog.css` define para o tema claro da página). Corrigido dando
cor explícita e permanente a `.rodape__redes a` em `footer.css`, o que também
protege qualquer página clara futura do mesmo problema.

### 5. Remoção de textos de placeholder
Removidos, a pedido da Danielle: o aviso "Estrutura visual completa da
Revista Turkista — os textos dos artigos entram na Etapa 6..." em
`blog.html`, e o aviso "Fotos e preços reais entram assim que a sessão
still-life e o catálogo (Etapa 2)..." na seção de Produtos em Destaque da
Home (`index.html`). Note que o aviso equivalente em `catalogo.html`
**não foi removido** (não foi pedido) — some sozinho via JavaScript assim que
houver produtos reais publicados.

### 6. Pendência identificada, não resolvida por pedido explícito
`sobre-a-marca.html` **não tem nenhum placeholder de foto** — a página é hoje
100% texto. O README de `assets/sobre/` menciona que as fotos "podem ser
reaproveitadas" nessa página, mas isso nunca foi implementado no HTML. Se a
Danielle quiser fotos nessa página, precisa pedir explicitamente — não foi
presumido aqui.

### Validação
- Testado de ponta a ponta (servidor local + fotos de teste): cadastro de
  produto publicado → ficha gerada, aparece no manifesto, entra no sitemap.
  Cadastro de artigo publicado → página gerada com "Continue lendo"
  correto, aparece no manifesto, entra no sitemap. Envio de foto
  institucional → salva no slot certo.
- Varredura completa pós-limpeza dos testes: 22 páginas HTML, **0 links
  internos quebrados**. Um problema real foi pego nessa varredura (ficha de
  produto com link para produto de teste já removido) e corrigido
  regenerando as fichas antes da entrega.

---

## Adendo 15 — Carrinho de compras com checkout via WhatsApp (adiantamento parcial da Etapa 15)

A Etapa 15 (Prontidão para E-commerce) previa carrinho/checkout tradicional
como algo distante. A marca pediu um meio-termo antes disso: manter o
fechamento 100% humano pelo WhatsApp, mas deixar de exigir uma mensagem por
peça — o cliente monta o pedido inteiro no site e envia de uma vez.

### O que foi construído
- **`src/scripts/utils/carrinho.js`** — núcleo do carrinho, estado em
  `localStorage` (sobrevive à navegação entre páginas, já que o site
  continua sem SPA/framework). Cálculo de total, formatação em BRL e
  montagem da mensagem de WhatsApp ficam aqui, sem tocar em DOM.
- **`src/scripts/componentes/carrinho-ui.js`** — injeta o ícone do carrinho
  no header e a gaveta lateral (drawer) em **qualquer página** que carregue
  o script, sem precisar duplicar esse HTML em cada arquivo. Escuta cliques
  em `[data-adicionar-carrinho]` por delegação, então funciona tanto nos
  cards renderizados estaticamente quanto nos gerados via JS
  (`catalogo-dinamico.js`, `destaques-dinamico.js`).
- **`src/styles/componentes/carrinho.css`** — ícone/badge no header, botão
  "Adicionar" nos cards, gaveta lateral.
- **Preço cadastrado nas 11 peças publicadas** (campo `preco.valor`, que já
  existia no schema e no painel — só faltava preenchido), pra mensagem do
  WhatsApp sair com o total real, não "sob consulta".
- **Botão "Adicionar ao carrinho" em 3 pontos**: card do catálogo, card de
  destaque da Home e ficha de produto (ao lado do CTA "Perguntar no
  WhatsApp", que continua existindo pra quem quer tirar dúvida antes de
  decidir). Na ficha de produto, quando a peça tem seletor de tamanho, o
  botão exige a escolha antes de adicionar.
- **Estrutura dos cards mudou**: de `<a class="card-produto">` pra
  `<div class="card-produto"><a class="card-produto__link-completo">…</a>
  <button data-adicionar-carrinho>…</button></div>` — necessário pra não
  aninhar um `<button>` dentro de um `<a>` (HTML inválido). Refletido em
  `catalogo-dinamico.js`, `destaques-dinamico.js`,
  `gerar-ficha-produto.py` (cards de relacionados) e nos cards estáticos de
  fallback de `catalogo.html`/`index.html`.
- **`gerar-ficha-produto.py` e `gerar-artigo-blog.py` atualizados** — o
  script continua sendo a fonte da verdade pras páginas de produto/blog,
  então o link do `carrinho.css` e os scripts `carrinho.js`/`carrinho-ui.js`
  entraram no template, não só nos HTMLs já gerados.
- **Todas as 29 páginas HTML do site** (institucionais, produto, blog)
  recebem o ícone do carrinho no header — rodada uma edição em lote pra
  incluir o CSS/JS novos em cada uma.

### O que continua igual
- Não existe checkout tradicional, pagamento online ou rotas
  `/carrinho/`/`/checkout/` — o `robots.txt` da Etapa 0 que já bloqueava
  essas rotas continua correto, elas nunca chegaram a existir como página.
- "Finalizar Compra" abre o WhatsApp com a mensagem pronta; o fechamento
  (forma de pagamento, prazo, confirmação de estoque) continua manual, como
  já era.

### Pendente / decisão da marca
- Preços cadastrados a partir do valor informado pela Danielle — se algum
  mudar, é só atualizar pelo painel (`preco` já é validado pelo schema).
- Nenhuma peça tem mais de um tamanho/cor cadastrado com fotos próprias
  ainda (mesma limitação já registrada no Adendo 9), então o carrinho grava
  tamanho/cor como texto simples — não há SKU por variação.

---

*Documento gerado como atualização viva do Plano Mestre de Implementação original — este arquivo, e não o PDF estático, deve ser consultado para saber o que já foi construído.*
