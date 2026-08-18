# assets/produtos/

Fotos still-life dos 4 produtos em destaque na Home. Nomes de arquivo devem bater exatamente com os abaixo (são os mesmos usados no `src` do `index.html`):

| Arquivo esperado           | Produto              |
|------------------------------|-----------------------|
| `biquini-aurora.webp`        | Biquíni Aurora        |
| `maio-surf-bloom.webp`       | Maiô Surf Bloom       |
| `top-turk-fit-essence.webp`  | Top Turk Fit Essence  |
| `short-turk-fit-flow.webp`   | Short Turk Fit Flow   |

Proporção 3:4 (retrato), fundo neutro (padrão still-life do Manual da Marca). A extensão importa: o `<img>` no código busca esse nome exato.

**Sobre o formato WebP:** as duas fotos que já existiam nesta pasta (`biquini-aurora` e `maio-surf-bloom`) foram convertidas de `.jpg`/`.png` para `.webp` nesta atualização — qualidade 85, visualmente idêntica ao original, com redução de ~92-94% no tamanho do arquivo (a `biquini-aurora` caiu de 2,5 MB para ~195 KB; a `maio-surf-bloom`, de 2,1 MB para ~135 KB). Isso ajuda diretamente o Core Web Vitals (LCP), já que são fotos carregadas na Home. Todo o projeto passou a usar `.webp` como padrão — pode enviar a foto original em qualquer formato (JPG, PNG, HEIC do celular) que a conversão para `.webp` com o nome exato é feita antes de a foto entrar nesta pasta.

⚠️ Estes 4 produtos são **placeholders de nome e preço**, criados apenas para preencher o layout — ainda não correspondem ao catálogo real (Etapa 2, não iniciada). Quando o schema de produto for validado, o ideal é que esta seção passe a puxar os dados do catálogo em vez de nomes fixos no HTML.

✅ O arquivo avulso que existia nesta pasta (antigo `01.jpg`/`01.webp`, sem corresponder a nenhum dos 4 nomes esperados e sem uso em nenhuma página) foi removido a pedido da marca.
