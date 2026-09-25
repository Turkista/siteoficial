# SEO — o que foi implementado (home e fichas de produto)

Data: 24/09/2026. Escopo: `index.html`, as 66 fichas em `produto/`, `sitemap.xml`, `robots.txt`, `llms*.txt`.

## Como manter

- **Fichas de produto:** nunca edite `produto/*.html` à mão. Edite o JSON em `src/content/produtos/` e rode `python3 scripts/gerar-ficha-produto.py` (o painel já faz isso ao salvar).
- **Sitemap:** o mesmo comando regenera `sitemap.xml`. Entram só produtos com `status: "publicado"`. As URLs que não são de produto (institucionais e blog) são preservadas.
- **Ajuste manual de uma peça:** preencha `seoTitulo` (até 60 caracteres) e/ou `seoDescricao` (120–158 caracteres) no JSON do produto. Sem esses campos, título e descrição são montados dos dados cadastrados. O painel não tem campo para eles: edite o JSON direto, e confirme que o painel não apaga campos que ele desconhece antes de salvar de novo.
- **`dataAtualizacao`** (opcional, `AAAA-MM-DD`): vai para o `<lastmod>` do sitemap. Sem ela, usa `dataCriacao`. Atualize ao mudar preço, estoque ou fotos.

## Fichas de produto (66 páginas)

| Antes | Depois |
|---|---|
| Título `Maiô Blue — Turkista` | `Maiô Blue – Moda Praia \| Turkista` (linha Praia = Moda Praia, Surf = Moda Surf, Turk Fit = Moda Fitness) |
| Meta description cortada com "..." | Nome + descrição + preço/parcelamento + "Fabricação própria em Araruama, RJ", até 158 caracteres, cortada em vírgula ou palavra |
| JSON-LD com nome, preço, cor | Acrescenta `sku`, `category`, `size`, `material` (quando cadastrado), `itemCondition`, `seller`, disponibilidade real (`LimitedAvailability` para "Últimas unidades", `Discontinued` para descontinuada) e política de troca de 7 dias |
| Breadcrumb `Home` → `index.html` | `Home` → `/` (URL canônica), evitando duplicar a home |
| Alt `Maiô Blue - foto 1`; miniaturas com alt vazio | Alt com nome, tipo, cor e marca; miniaturas com alt (o script da galeria copia o alt da miniatura para a foto principal, então antes o alt sumia ao trocar de foto) |
| Fotos sem `width`/`height` | Dimensões reais em todas (reduz salto de layout, métrica CLS) |
| 8 fichas sem descrição e vários grupos com texto idêntico | Parágrafo exclusivo por peça (linha, categoria, cor, tamanhos, preço) antes do texto repetido |
| Sem informação de entrega/troca na ficha | Bloco "Entrega, troca e cuidados" com os fatos das páginas de política, e links para elas |
| Mesmas 3 peças "relacionadas" em toda a linha | 4 peças, mesmo tipo primeiro, rotativas: os links internos se distribuem pelo catálogo, e há link "Ver todas as peças da linha" |
| Descontinuada (`short-turk-fit-flow`) indexável, com conteúdo idêntico ao de `conjunto-short-top-flow` | `noindex, follow` e fora do sitemap |
| OG básico | Acrescenta `og:image:alt`, dimensões, `product:price:*`, `product:brand`, `product:availability`, `theme-color`, `robots` com `max-image-preview:large` |

**Política de troca no schema:** só foi marcada para peças que não são íntimas. Em biquíni, maiô e sunquíni a troca é apenas por defeito de fabricação, e o schema `MerchantReturnPolicy` não tem como expressar isso sem prometer mais do que a política oferece. O texto visível na ficha diz o que a política diz.

## Home

- Title: `Moda Praia, Surf e Fitness em Araruama, RJ | Turkista` (53 caracteres). "Showroom Digital" saiu: ninguém pesquisa esse termo.
- Meta description de 157 caracteres, sem adjetivo subjetivo ("lycra de alto padrão" saiu).
- H1: `Moda praia, surf e fitness feita para o seu movimento.` A fonte do título do hero foi reduzida (`clamp(2rem, 7vw, 3.25rem)`) para o texto mais longo não cobrir a modelo. Para reverter, restaure o H1 antigo e apague a última linha de `home.css`.
- Foto do hero com alt descritivo (antes `alt=""` e `aria-hidden`).
- Nova seção de texto por linha, com links de âncora descritiva para Praia, Surf e Turk Fit.
- Novo FAQ com 6 perguntas. As respostas vêm das páginas de política, do FAQ e do letreiro do site. O JSON-LD `FAQPage` usa o mesmo texto do FAQ visível.
- JSON-LD: `OnlineStore` (com telefone, área atendida, redes) + `WebSite` + `FAQPage`. O FAQ do site diz que não há loja física, por isso não foi usado `LocalBusiness`.
- Dimensões e alt descritivo nas imagens das linhas e dos destaques.

## Arquivos de indexação

- `sitemap.xml`: 84 URLs (16 fixas + 3 páginas de linha + 65 fichas). Antes, 8 produtos estavam fora, 7 deles publicados. Inclui `<image:loc>` e `<lastmod>`.
- `robots.txt`: `politica-de-privacidade.html` deixou de ser bloqueada. Ela tem `noindex`, e com o bloqueio o Google não consegue ler essa instrução. Passaram a ser bloqueados `/painel-produtos/`, `/scripts/` e `/docs/`, que iam publicados junto com o site. `/src/` continua liberado porque o catálogo carrega os JSON de lá.
- `llms.txt` e `llms-full.txt`: 6 links davam 404 (`praia.html`, `surf.html`, `turk-fit.html`, `envio.html`, `guia-de-cuidados.html`, `sobre.html`) e foram apontados para páginas que existem.
- Instagram da Turk Fit unificado em `@turkfitness.com.br` (confirmado pela marca em 24/09/2026). O gerador de fichas, o gerador do blog e a home usavam `@turkfit.com.br`.

## Segunda rodada (24/09/2026)

**Páginas de categoria** — `praia.html`, `surf.html`, `turk-fit.html`, geradas por `scripts/gerar-pagina-linha.py`. O gerador de fichas chama esse script no fim, então salvar um produto no painel já atualiza a página da linha.
- Todos os produtos publicados da linha estão escritos no HTML (o `catalogo.html` monta a lista por JavaScript), agrupados por tipo: Biquínis, Tops de biquíni, Maiôs, Sunquínis; Maiôs de surf, Croppeds de surf; Conjuntos, Tops, Leggings, Calças e Xuxinhas.
- Título e H1 com o termo de busca da linha, introdução com números calculados dos dados (quantidade de peças e faixa de preço), links de âncora por tipo, FAQ de 3 perguntas, links para artigos do blog e JSON-LD (`CollectionPage`, `ItemList`, `BreadcrumbList`, `FAQPage`).
- Todos os links "Praia / Surf / Turk Fit" do site (menus, rodapés, home, fichas, blog, `llms.txt`) apontam para essas páginas em vez de `catalogo.html#linha`. O breadcrumb das fichas e o schema também.
- Entraram no sitemap (agora 84 URLs).

**Favicon** — monograma "T" em Rosa Turkista sobre Preto Grafite, criado como ícone provisório porque a marca não tem um definido. Arquivos: `favicon.ico` (raiz, 16/32/48 px), `public/favicon/favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`. As 3 tags `<link rel="icon">` estão nas 90 páginas e nos dois geradores. Para trocar pelo logo oficial, substitua esses arquivos mantendo os nomes.

**Tecido** — 52 peças de roupa sem composição receberam `Poliamida (84% a 85%) e elastano (15% a 16%)`, a faixa informada pela marca (JSON dos produtos e `index.json`). A ficha mostra em "Ficha técnica" e o schema envia como `material`. As 5 xuxinhas ficaram de fora. As 9 peças que já tinham "Lycra" cadastrado não foram alteradas. Nenhum texto de produto cita poliamida, elastano ou porcentagem, então não dá para saber a composição exata de cada peça pelos textos: quando a marca tiver o valor exato de uma peça, edite o campo.

## Terceira rodada (24/09/2026)

**Nomes corrigidos** (só o campo `nome`; slug/URL preservados, sem redirecionamento necessário):
- Conjunto Lila Perfomance → **Conjunto Lila Performance**
- Conjunto de treino Azul Ocen → **Conjunto de treino Azul Oceano**
- Maiô Hight → **Maiô High**

**Tecido nas xuxinhas.** As 5 xuxinhas (`xuxinha-segredo-estamp`, `-mix`, `-rosa`, `xuxinhas-coloridas`, `-diversas`) receberam a mesma composição das roupas — poliamida (84% a 85%) com elastano (15% a 16%) — porque, segundo a marca, são feitas com retalhos das peças de roupa. Com isso, as 66 fichas de produto têm tecido cadastrado.

**Textos novos ou reescritos (18 fichas).** Escrito a partir das fotos de cada peça (corte, cor, detalhes visíveis), sem inventar características não confirmadas:
- 8 fichas que não tinham descrição completa: `biquini-andrea-dupla-face-parte-superior`, `biquini-aurora`, `biquini-constela-dupla-face-parte-superior`, `biquini-fany`, `biquini-monsa`, `biquini-vivence-parte-superior`, `sunquini-mandala`, `top-turk-fit-essence`.
- 4 conjuntos top + calça que tinham o mesmo texto: `conjunto-maro`, `conjunto-fitness-top-calca`, `conjunto-fitness-top-calca-verdan`, `conjunto-de-treino-azul-ocen`. Cada um agora descreve o corte e a cor reais da peça (ex.: top nadador roxo vs. top de alças cruzadas rosa fúcsia vs. top cropped verde com bolsos na calça).
- 2 conjuntos short + top que tinham o mesmo texto: `conjunto-azul-dark`, `conjunto-de-treino-short-e-top-cintila`.
- As 5 xuxinhas, que tinham só 2 textos repetidos entre as 5: cada uma agora cita a estampa que aparece na própria foto.

Restou 1 grupo "duplicado": `conjunto-short-top-flow` e `short-turk-fit-flow` têm o mesmo texto, mas o segundo é a peça descontinuada (`noindex`, fora do sitemap desde a primeira rodada) — não concorre com o outro na busca, então não foi alterado.

## Pendências (dependem de decisão ou de dado da marca)

1. **Logo oficial** para substituir o favicon provisório. Com o logo, dá para adicionar `logo` ao schema da organização.
2. **Composição exata por peça** (o valor real, não a faixa) e proteção UV, se houver. As 9 peças com "Lycra" cadastrado não foram alteradas — decidir se ficam assim ou trocam pela composição de poliamida/elastano.
3. **Frete no schema.** `shippingDetails` não foi incluído: exige valor de frete por região, que o site não publica.
6. **`catalogo.html`** continua com título genérico ("Catálogo — Turkista") e lista montada por JavaScript. Agora as páginas de linha cobrem o que importa para busca; o catálogo serve como visão geral.
7. **URLs com `.html`.** Não dá para remover no GitHub Pages sem migrar de hospedagem.

## Depois de publicar

1. Search Console: enviar `https://www.turkista.com.br/sitemap.xml`.
2. Testar uma ficha e a home em search.google.com/test/rich-results.
3. Inspecionar a URL da home e pedir indexação.
4. Conferir em 2–4 semanas o relatório "Páginas" (indexadas × excluídas) e "Experiência de produto".

A validação feita aqui cobre sintaxe do JSON-LD, links internos, tamanhos de título/descrição e renderização local. Elegibilidade a rich results e indexação só o Google confirma.
