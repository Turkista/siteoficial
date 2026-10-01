#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Migra os artigos antigos da Revista Turkista, existentes em origin/main,
para o novo formato do CMS em src/content/artigos/*.json.

IMPORTANTE:
- Não altera os HTMLs existentes em blog/.
- Não altera o artigo fitness já existente.
- Não executa o gerador de artigos.
- Não sobrescreve JSONs existentes.
- Reconstrói index.json somente depois de validar a migração.
"""

import json
import re
import subprocess
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent
CONTEUDO_DIR = RAIZ / "src" / "content" / "artigos"
LEGADO_CONFIG = RAIZ / "config" / "blog-legado.json"

BRANCH_ORIGEM = "origin/main"

SLUGS_LEGADO = [
    "cuidados-biquini",
    "tecido-certo",
    "moda-praia-ano-inteiro",
    "biquini-ou-top",
    "atelie-peca-pronta",
    "lavagem-secagem",
    "fabricacao-propria",
    "pecas-movimento",
    "cores-tom-de-pele",
]

CATEGORIAS = {
    "guia-de-cuidados": "Guia de Cuidados",
    "tecido-tecnologia": "Tecido & Tecnologia",
    "estilo": "Estilo",
    "treino-performance": "Treino & Performance",
    "bastidores": "Bastidores",
}


def git_bytes(*args):
    """Executa Git e devolve bytes sem passar pelo encoding do PowerShell."""
    comando = ["git", *args]

    resultado = subprocess.run(
        comando,
        cwd=RAIZ,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if resultado.returncode != 0:
        erro = resultado.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Git falhou:\n{' '.join(comando)}\n\n{erro}"
        )

    return resultado.stdout


def git_text(*args):
    """Executa Git e decodifica blobs/textos UTF-8."""
    dados = git_bytes(*args)

    try:
        texto = dados.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise RuntimeError(
            f"O conteúdo retornado pelo Git não está em UTF-8 válido: {exc}"
        )

    return texto


def corrigir_mojibake(texto):
    """
    Corrige somente casos claros de mojibake.

    Exemplo:
      VocÃª -> Você
      peÃ§a -> peça

    Não altera texto que já esteja corretamente codificado.
    """
    marcadores = (
        "Ã",
        "Â",
        "â",
        "ð",
        " ",
    )

    if not any(m in texto for m in marcadores):
        return texto

    try:
        candidato = texto.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return texto

    def pontuacao_mojibake(valor):
        return sum(valor.count(m) for m in marcadores)

    if pontuacao_mojibake(candidato) < pontuacao_mojibake(texto):
        return candidato

    return texto


class ArtigoParser(HTMLParser):
    """
    Extrai apenas a parte editorial do artigo.

    Ignora:
    - header;
    - footer;
    - navegação;
    - breadcrumbs;
    - cards de relacionados;
    - CTA final;
    - scripts.

    Preserva:
    - título;
    - resumo;
    - capa;
    - tempo de leitura;
    - h2;
    - h3;
    - parágrafos;
    - listas;
    - destaques.
    """

    CONTEUDO_TAGS = {
        "h2",
        "h3",
        "p",
        "ul",
        "ol",
        "li",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)

        self.titulo = ""
        self.resumo = ""
        self.capa_arquivo = ""
        self.capa_alt = ""
        self.tempo_leitura = ""

        self.no_artigo_corpo = False
        self.no_cta = False
        self.no_relacionados = False

        self.current_tag = None
        self.current_attrs = {}

        self.buffer = []
        self.corpo = []

        self.skip_depth = 0

    def _attrs(self):
        return dict(self.current_attrs)

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == "main" and attrs_dict.get("id") == "conteudo-principal":
            pass

        if tag == "div":
            classes = attrs_dict.get("class", "").split()

            if "artigo-corpo" in classes:
                self.no_artigo_corpo = True
                self.skip_depth = 0
                return

            if "artigo-cta" in classes:
                self.no_cta = True
                self.skip_depth = 1
                return

            if "artigo-relacionados" in classes:
                self.no_relacionados = True
                self.skip_depth = 1
                return

        if self.no_cta or self.no_relacionados:
            self.skip_depth += 1
            return

        if tag == "img" and not self.capa_arquivo:
            src = attrs_dict.get("src", "")

            if "/assets/blog/" in src:
                self.capa_arquivo = Path(src).name
                self.capa_alt = attrs_dict.get("alt", "")

        classes = attrs_dict.get("class", "").split()

        if "artigo-hero__tempo" in classes:
            self.current_tag = "tempo"

        if "artigo-hero__resumo" in classes:
            self.current_tag = "resumo"

        if tag in self.CONTEUDO_TAGS and self.no_artigo_corpo:
            self.buffer = []
            self.current_tag = tag

    def handle_endtag(self, tag):
        if self.no_cta:
            self.skip_depth -= 1

            if self.skip_depth <= 0:
                self.no_cta = False
                self.skip_depth = 0

            return

        if self.no_relacionados:
            self.skip_depth -= 1

            if self.skip_depth <= 0:
                self.no_relacionados = False
                self.skip_depth = 0

            return

        if tag == "div" and self.no_artigo_corpo:
            self.no_artigo_corpo = False
            return

        if self.current_tag == tag:
            texto = " ".join(" ".join(self.buffer).split()).strip()

            if texto:
                if tag == "h2":
                    self.corpo.append(f"## {texto}")

                elif tag == "h3":
                    self.corpo.append(f"## {texto}")

                elif tag == "p":
                    self.corpo.append(texto)

                elif tag == "li":
                    self.corpo.append(f"- {texto}")

                elif tag in {"ul", "ol"}:
                    pass

            self.buffer = []
            self.current_tag = None

        elif self.current_tag == "tempo" and tag == "span":
            texto = " ".join(" ".join(self.buffer).split()).strip()

            if texto:
                self.tempo_leitura = texto

            self.buffer = []
            self.current_tag = None

        elif self.current_tag == "resumo" and tag == "p":
            texto = " ".join(" ".join(self.buffer).split()).strip()

            if texto:
                self.resumo = texto

            self.buffer = []
            self.current_tag = None

    def handle_data(self, data):
        if self.no_cta or self.no_relacionados:
            return

        texto = data.strip()

        if not texto:
            return

        if self.current_tag:
            self.buffer.append(texto)

        if not self.titulo:
            # O título será obtido posteriormente pelo parser auxiliar.
            pass


class TituloParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titulo = ""
        self.pegando = False
        self.buffer = []

    def handle_starttag(self, tag, attrs):
        if tag == "h1":
            self.pegando = True
            self.buffer = []

    def handle_endtag(self, tag):
        if tag == "h1" and self.pegando:
            self.titulo = " ".join(" ".join(self.buffer).split()).strip()
            self.pegando = False

    def handle_data(self, data):
        if self.pegando:
            self.buffer.append(data)


def extrair_meta_tempo(html):
    """
    Extrai o tempo de leitura diretamente do HTML.
    """
    padroes = [
        r'class=["\'][^"\']*artigo-hero__tempo[^"\']*["\'][^>]*>\s*(.*?)\s*</span>',
        r'(\d+\s*min(?:uto|utos)?\s+de\s+leitura)',
    ]

    for padrao in padroes:
        match = re.search(padrao, html, flags=re.I | re.S)

        if match:
            texto = re.sub(r"<[^>]+>", "", match.group(1))
            texto = " ".join(texto.split()).strip()

            if texto:
                return texto

    return ""


def extrair_resumo(html):
    padrao = (
        r'class=["\'][^"\']*artigo-hero__resumo[^"\']*["\'][^>]*>'
        r'\s*(.*?)\s*</p>'
    )

    match = re.search(padrao, html, flags=re.I | re.S)

    if not match:
        return ""

    texto = re.sub(r"<[^>]+>", "", match.group(1))
    return " ".join(texto.split()).strip()


def extrair_capa(html):
    padrao = (
        r'<img[^>]+src=["\'][^"\']*/assets/blog/([^"\']+)["\']'
    )

    match = re.search(padrao, html, flags=re.I)

    if not match:
        return "", ""

    arquivo = match.group(1)

    alt_match = re.search(
        r'<img[^>]+src=["\'][^"\']*/assets/blog/'
        + re.escape(arquivo)
        + r'["\'][^>]*alt=["\']([^"\']*)["\']',
        html,
        flags=re.I,
    )

    alt = alt_match.group(1) if alt_match else ""

    return arquivo, alt


def extrair_corpo(html):
    """
    Extrai o conteúdo dentro de .artigo-corpo.

    O conteúdo é convertido para o formato textual esperado
    pelo gerador atual.
    """

    match = re.search(
        r'<div\s+class=["\']artigo-corpo["\'][^>]*>'
        r'(.*?)'
        r'</div>\s*'
        r'<div\s+class=["\']artigo-cta',
        html,
        flags=re.I | re.S,
    )

    if not match:
        raise RuntimeError(
            "Não foi possível localizar .artigo-corpo no HTML."
        )

    corpo_html = match.group(1)

    parser = HTMLParserTexto(corpo_html)

    blocos = []

    for tipo, texto in parser.blocos:
        texto = " ".join(texto.split()).strip()

        if not texto:
            continue

        if tipo == "h2":
            blocos.append(f"## {texto}")

        elif tipo == "h3":
            # O gerador atual não possui sintaxe própria para h3.
            # Mantemos como h2 para não perder o conteúdo.
            blocos.append(f"## {texto}")

        elif tipo == "destaque":
            blocos.append(f"> {texto}")

        elif tipo == "p":
            blocos.append(texto)

        elif tipo == "li":
            if blocos and not blocos[-1].startswith("- "):
                pass
            blocos.append(f"- {texto}")

    return "\n\n".join(blocos).strip()


class HTMLParserTexto(HTMLParser):
    """
    Parser simples para o conteúdo editorial.
    """

    TAGS_BLOCOS = {"h2", "h3", "p", "li"}

    def __init__(self, html):
        super().__init__(convert_charrefs=True)

        self.blocos = []

        self.tag_atual = None
        self.buffer = []

        self.no_destaque = False
        self.destaque_buffer = []

        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get("class", "").split()

        if tag == "div" and "artigo-destaque" in classes:
            self.no_destaque = True
            self.destaque_buffer = []
            return

        if tag in self.TAGS_BLOCOS:
            self.tag_atual = tag
            self.buffer = []

    def handle_endtag(self, tag):
        if tag == "div" and self.no_destaque:
            texto = " ".join(self.destaque_buffer).strip()

            if texto:
                self.blocos.append(("destaque", texto))

            self.no_destaque = False
            self.destaque_buffer = []
            return

        if self.no_destaque:
            return

        if self.tag_atual == tag:
            texto = " ".join(self.buffer).strip()

            if texto:
                self.blocos.append((tag, texto))

            self.tag_atual = None
            self.buffer = []

    def handle_data(self, data):
        texto = data.strip()

        if not texto:
            return

        if self.no_destaque:
            self.destaque_buffer.append(texto)
            return

        if self.tag_atual:
            self.buffer.append(texto)


def extrair_titulo(html):
    parser = TituloParser()
    parser.feed(html)
    parser.close()

    return parser.titulo.strip()


def obter_data_git(slug):
    """
    Usa a data do último commit que alterou o HTML original.

    Isso é uma referência histórica do arquivo, não uma afirmação
    de que seja necessariamente a data original de publicação.
    """
    try:
        resultado = git_text(
            "log",
            "-1",
            "--format=%cs",
            BRANCH_ORIGEM,
            "--",
            f"blog/{slug}.html",
        ).strip()

        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", resultado):
            return resultado
    except RuntimeError:
        pass

    return date.today().isoformat()


def carregar_legado():
    if not LEGADO_CONFIG.exists():
        raise RuntimeError(
            f"Arquivo não encontrado: {LEGADO_CONFIG}"
        )

    dados = json.loads(
        LEGADO_CONFIG.read_text(encoding="utf-8")
    )

    return {
        item["slug"]: item
        for item in dados
    }


def validar_slug(slug):
    return bool(
        re.fullmatch(
            r"^[a-z0-9]+(-[a-z0-9]+)*$",
            slug,
        )
    )


def criar_artigo(slug, html, legado):
    titulo = corrigir_mojibake(extrair_titulo(html))
    resumo = corrigir_mojibake(extrair_resumo(html))
    capa_arquivo, capa_alt = extrair_capa(html)
    capa_alt = corrigir_mojibake(capa_alt)
    tempo = corrigir_mojibake(extrair_meta_tempo(html))
    corpo = corrigir_mojibake(extrair_corpo(html))

    if not titulo:
        raise RuntimeError(f"{slug}: título não encontrado.")

    if not resumo:
        raise RuntimeError(f"{slug}: resumo não encontrado.")

    if not capa_arquivo:
        raise RuntimeError(f"{slug}: capa não encontrada.")

    if not corpo:
        raise RuntimeError(f"{slug}: corpo não encontrado.")

    categoria = legado.get("categoria")

    if categoria not in CATEGORIAS:
        raise RuntimeError(
            f"{slug}: categoria inválida ou ausente: {categoria!r}"
        )

    if not validar_slug(slug):
        raise RuntimeError(f"{slug}: slug inválido.")

    artigo = {
        "id": f"art_{slug.replace('-', '')}",
        "slug": slug,
        "titulo": titulo,
        "categoria": categoria,
        "resumo": resumo,
        "corpo": corpo,
        "capa": {
            "arquivo": capa_arquivo,
            "alt": capa_alt or titulo,
        },
        "tempoLeitura": tempo,
        "status": "publicado",
        "dataCriacao": obter_data_git(slug),
    }

    return artigo


def validar_artigo(artigo):
    obrigatorios = [
        "id",
        "slug",
        "titulo",
        "categoria",
        "resumo",
        "corpo",
        "capa",
        "status",
        "dataCriacao",
    ]

    faltantes = [
        campo
        for campo in obrigatorios
        if campo not in artigo
    ]

    if faltantes:
        raise RuntimeError(
            f"{artigo.get('slug', '?')}: campos ausentes: {faltantes}"
        )

    if artigo["status"] != "publicado":
        raise RuntimeError(
            f"{artigo['slug']}: status inesperado."
        )

    if artigo["categoria"] not in CATEGORIAS:
        raise RuntimeError(
            f"{artigo['slug']}: categoria inválida."
        )

    if not artigo["capa"].get("arquivo"):
        raise RuntimeError(
            f"{artigo['slug']}: capa sem arquivo."
        )


def carregar_artigos_existentes():
    artigos = []

    for arquivo in sorted(CONTEUDO_DIR.glob("*.json")):
        if arquivo.name == "index.json":
            continue

        dados = json.loads(
            arquivo.read_text(encoding="utf-8")
        )

        validar_artigo(dados)
        artigos.append(dados)

    return artigos


def reconstruir_index(artigos):
    artigos_ordenados = sorted(
        artigos,
        key=lambda a: (
            a.get("dataCriacao", ""),
            a.get("titulo", ""),
        ),
        reverse=True,
    )

    index_path = CONTEUDO_DIR / "index.json"

    index_path.write_text(
        json.dumps(
            artigos_ordenados,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


def main():
    print()
    print("==============================================")
    print(" MIGRAÇÃO DOS ARTIGOS LEGADOS — TURKISTA")
    print("==============================================")
    print()

    if not (RAIZ / ".git").exists():
        raise RuntimeError(
            f"Diretório Git não encontrado em: {RAIZ}"
        )

    CONTEUDO_DIR.mkdir(parents=True, exist_ok=True)

    print("1. Verificando origem...")
    git_text("rev-parse", "--verify", BRANCH_ORIGEM)
    print(f"   OK: {BRANCH_ORIGEM}")
    print()

    legado = carregar_legado()

    print("2. Verificando arquivos existentes...")
    existentes = carregar_artigos_existentes()

    slugs_existentes = {
        artigo["slug"]
        for artigo in existentes
    }

    print(
        f"   Artigos JSON existentes: {len(existentes)}"
    )

    if slugs_existentes:
        for slug in sorted(slugs_existentes):
            print(f"   - {slug}")

    print()

    print("3. Validando os 9 artigos legados...")

    for slug in SLUGS_LEGADO:
        if slug in slugs_existentes:
            raise RuntimeError(
                f"O arquivo do artigo '{slug}' já existe. "
                "A migração foi interrompida para evitar sobrescrita."
            )

        html = git_text(
            "show",
            f"{BRANCH_ORIGEM}:blog/{slug}.html",
        )

        if not html.strip():
            raise RuntimeError(
                f"{slug}: HTML vazio."
            )

        if slug not in legado:
            raise RuntimeError(
                f"{slug}: não encontrado em blog-legado.json."
            )

        print(f"   OK: {slug}")

    print()
    print("4. Criando JSONs dos artigos legados...")
    print()

    criados = []

    for slug in SLUGS_LEGADO:
        html = git_text(
            "show",
            f"{BRANCH_ORIGEM}:blog/{slug}.html",
        )

        artigo = criar_artigo(
            slug,
            html,
            legado[slug],
        )

        validar_artigo(artigo)

        destino = (
            CONTEUDO_DIR
            / f"{slug}.json"
        )

        if destino.exists():
            raise RuntimeError(
                f"Arquivo já existe: {destino}"
            )

        destino.write_text(
            json.dumps(
                artigo,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
            newline="\n",
        )

        criados.append(artigo)

        print(
            f"   criado: {destino.name}"
        )

    print()
    print("5. Validando o conjunto final...")

    todos = carregar_artigos_existentes()

    slugs_finais = {
        artigo["slug"]
        for artigo in todos
    }

    esperado = set(SLUGS_LEGADO)

    # O artigo fitness já existente deve continuar presente.
    esperado.add(
        "roupa-fitness-conforto-ou-estilo-voce-nao-precisa-escolher"
    )

    faltantes = esperado - slugs_finais

    if faltantes:
        raise RuntimeError(
            "Artigos esperados ausentes: "
            + ", ".join(sorted(faltantes))
        )

    print(f"   Total de artigos: {len(todos)}")

    if len(todos) != 10:
        raise RuntimeError(
            f"Esperados exatamente 10 artigos; encontrados {len(todos)}."
        )

    print()
    print("6. Reconstruindo index.json...")

    reconstruir_index(todos)

    print(
        f"   OK: {CONTEUDO_DIR / 'index.json'}"
    )

    print()
    print("==============================================")
    print(" MIGRAÇÃO CONCLUÍDA")
    print("==============================================")
    print()
    print(f"Artigos criados nesta migração: {len(criados)}")
    print(f"Artigos totais no CMS: {len(todos)}")
    print()
    print("Nenhum blog/*.html foi alterado pelo script.")
    print("O gerador de artigos NÃO foi executado.")
    print()
    print("Próximo passo:")
    print("  git status --short")
    print()
    print("Depois vamos conferir os 10 JSONs antes de")
    print("fazer qualquer commit ou regeneração de HTML.")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print()
        print("ERRO — migração interrompida.")
        print()
        print(str(exc))
        print()
        sys.exit(1)