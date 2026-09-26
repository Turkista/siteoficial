# Fundação do CMS Git-Native — Turkista

## Objetivo

Transformar o painel local existente em um CMS administrativo local, mantendo o site público estático, GitHub como fonte de verdade, conteúdo em JSON, imagens versionadas e geração de HTML estático.

## Fonte de verdade

Editável pelo CMS:
- src/content/produtos/*.json
- src/content/artigos/*.json
- assets/produtos/*
- assets/blog/*
- assets/hero/*
- assets/linhas/*
- assets/sobre/*

Gerado:
- produto/*.html
- blog/*.html
- src/content/*/index.json
- sitemap.xml

Os arquivos gerados continuam versionados por enquanto porque o site é estático. A próxima etapa consolidará os geradores para que cada artefato tenha um único dono.

## Fluxo planejado

1. Editar no painel local.
2. Validar schema e referências.
3. Gerar prévia.
4. Mostrar resumo e diff.
5. Criar branch.
6. Fazer commit.
7. Enviar branch ao GitHub.
8. CI valida e gera.
9. Abrir Pull Request.
10. Merge para main somente após validação.

Credenciais do GitHub ficarão no servidor local; o navegador nunca receberá token ou segredo.
