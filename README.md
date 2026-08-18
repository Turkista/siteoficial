# Turkista — Showroom

Site institucional/showroom da Turkista (Praia · Surf · Turk Fit). HTML/CSS/JS estático,
sem framework — decisão deliberada da Etapa 0, ver `docs/status-implementacao.md`.

## Como ver o projeto localmente

**Jeito mais fácil:** dê duplo clique em `abrir-site.bat` (Windows) ou `abrir-site.command`
(Mac). Abre o navegador sozinho já em `catalogo.html`.

**Por que não abrir os `.html` direto do disco:** `catalogo.html` e `blog.html` buscam a
lista de produtos/artigos reais com `fetch()`, e os navegadores bloqueiam esse tipo de busca
quando a página é aberta como `file://...` — o site continua abrindo, mas mostra só os
exemplos antigos fixos no HTML em vez do catálogo/blog reais. Servindo por `http://` (com o
`abrir-site.bat`/`.command`, ou os métodos abaixo) esse problema não acontece.

Alternativas equivalentes, se preferir o terminal:

```bash
node preview-site.js
# depois abrir http://localhost:5500/catalogo.html
```
```bash
python3 -m http.server 8000
# depois abrir http://localhost:8000/catalogo.html
```

## Estrutura de pastas

Segue a Arquitetura Técnica do Plano Mestre:

```
public/            favicon e outros arquivos estáticos servidos na raiz
assets/            fotos por seção (hero, linhas, produtos, sobre, blog) — cada pasta
                   tem um README.md com o nome exato de arquivo esperado
src/
  layouts/         CSS compartilhado entre páginas institucionais
  pages/           CSS específico de cada página/seção (home, blog)
  styles/
    tokens/        design tokens (cor, tipografia, espaçamento) — fonte única da verdade
    base/          reset e estilos base
    componentes/   botões, header, footer, cards, whatsapp flutuante
  scripts/
    componentes/   JS de componentes interativos (menu mobile, filtro do blog, etc.)
    utils/         funções utilitárias (ex.: montar link de WhatsApp)
  schema/          JSON Schema de dados (produto)
  content/         conteúdo estruturado em JSON (produtos) — ainda não consumido pelas
                   páginas, ver README da subpasta
docs/              cópia viva do status de implementação + capturas de referência
blog/              páginas individuais de artigo (uma por conteúdo)
produto/           fichas de produto (uma por peça), geradas a partir de
                   src/content/produtos/*.json — ver scripts/gerar-ficha-produto.py
scripts/           scripts Python geradores de páginas estáticas (blog, produto) —
                   rodar de novo sempre que o conteúdo-fonte mudar
*.html             páginas do site na raiz (index, sobre-a-marca, contato, etc.)
robots.txt         diretivas para motores de busca
sitemap.xml        mapa do site para buscadores (domínio-alvo já preenchido,
                   ativado em robots.txt quando o site for ao ar)
```

## Documentação

- **`docs/status-implementacao.md`** — a fonte da verdade sobre o que já foi construído,
  o que está pendente e por quê. Consultar este arquivo antes de qualquer PDF estático do
  Plano Mestre original, que pode estar desatualizado.
- Cada pasta em `assets/` tem um `README.md` com o nome exato de arquivo esperado para as
  fotos, para que a marca só precise soltar a imagem com o nome certo — sem mexer em código.
- `src/content/produtos/README.md` explica o schema de produto e o que ainda depende de
  confirmação da marca (tecido, preço).

## Stack

HTML5 + CSS3 (custom properties / design tokens) + JavaScript puro (sem dependências).
Google Fonts (Fraunces + Manrope) via CDN. Sem build step — pensado para migrar a
Astro/Next mais tarde sem reestruturar `pages/`, `content/` ou `styles/`.
