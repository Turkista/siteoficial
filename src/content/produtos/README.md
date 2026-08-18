# src/content/produtos/

## O que é isto

O schema de dados de produto da Etapa 2 (`src/schema/produto.schema.json`), validado com 4
arquivos de exemplo — um para cada produto que já existe hardcoded em `index.html` hoje
(Biquíni Aurora, Maiô Surf Bloom, Top Turk Fit Essence, Short Turk Fit Flow).

Isso adianta a Etapa 2 sem esperar a produção fotográfica: o Plano Mestre bloqueia o
cadastro do catálogo **real** até haver fotos still-life (cadastrar com dado fake esconde
lacunas do schema), mas o *desenho* do schema não depende disso — e só descobrimos se um
schema está certo tentando encaixar dado real nele. Por isso estes 4 exemplos usam nomes,
linha e categoria reais (já aprovados, pois já estão na Home), não `lorem ipsum`.

## O que está com placeholder de propósito, aguardando a marca

Cada um dos 4 arquivos tem os seguintes campos que **precisam ser confirmados por
Danielle/Yansix antes de irem para produção** — não são erros do schema, são decisões que só
a marca pode tomar:

- `composicao.tecido` — está como `"PREENCHER — confirmar com a marca"`. A página
  `como-cuidar-da-peca.html` já usa a expressão "lycra de alto padrão", mas a composição
  percentual exata (ex.: 88% Poliamida / 12% Elastano) varia por peça e não deve ser
  inventada.
- `composicao.protecaoUV` — deliberadamente `null` em todos. Mesmo critério já usado na
  Etapa 6 (Adendo 4): nenhuma alegação de FPS é feita sem laudo técnico do tecido.
- `preco` — `null` em todos. Hoje a venda é 100% via WhatsApp, sem preço público fixo no
  site (ver `contato.html`). Preencher só quando essa decisão comercial mudar (ver "Etapa
  15 — Prontidão para E-commerce" no Plano Mestre).
- `status: "rascunho"` em todos — nenhum deles deve aparecer em catálogo publicado
  (Etapa 4) até a marca revisar os dados acima.

## Como isto se conecta ao resto do projeto

**Atualização (Adendo 9 do status de implementação):** estes arquivos agora **são lidos**
— por `scripts/gerar-ficha-produto.py`, que gera uma página estática em `produto/<slug>.html`
para cada JSON aqui dentro (Etapa 5, Ficha de Produto). Rodar de novo o script sempre que
um destes arquivos for editado, ou quando um novo produto for adicionado:

```bash
python3 scripts/gerar-ficha-produto.py
```

Os 4 cards de "Produtos em Destaque" em `index.html` continuam com nome/imagem escritos
diretamente no HTML (isso não mudou), mas agora **linkam** para a ficha de produto gerada
a partir do JSON correspondente — ou seja, o card na Home e a ficha completa já usam a
mesma fonte de nome/categoria/linha, mesmo a Home ainda não consumindo o JSON diretamente.
Essa consumação completa pelo lado da Home é o passo natural da Etapa 4 (Catálogo por Linha
e Filtros), quando o catálogo real substituir os 4 cards hardcoded por uma grade gerada a
partir de todos os produtos com `status: "publicado"`.

## Próximo passo (Etapa 2, pendência restante)

Validar este schema com pelo menos 3 peças **de cada** linha (Praia, Surf, Turk Fit) assim
que a marca confirmar tecido/composição — hoje há apenas 1 exemplo por peça já existente na
Home, cobrindo as 3 linhas mas ainda não a profundidade de 3 peças por linha pedida no
"Próximos passos recomendados" do status.
