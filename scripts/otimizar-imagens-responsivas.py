#!/usr/bin/env python3
"""Gera variantes WebP responsivas e adiciona srcset somente no artefato publicado."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys
from PIL import Image

LARGURAS = (320, 480, 640, 768, 960, 1200, 1440)
QUALIDADE = 74
ECONOMIA_MINIMA = 0.02
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
SRC_ATTR = re.compile(r"""(?<![-\w:])src\s*=\s*(["'])(.*?)\1""", re.IGNORECASE)
SRCSET_ATTR = re.compile(r"""(?<![-\w:])srcset\s*=""", re.IGNORECASE)


def dimensoes(caminho: Path) -> tuple[int, int]:
    with Image.open(caminho) as imagem:
        return imagem.size


def tamanhos_para(url: str, tag: str, contexto: str) -> str:
    classes = " ".join(re.findall(r"""class=["']([^"']+)["']""", tag, re.IGNORECASE))
    trecho = contexto[-700:]
    classes_contexto = " ".join(re.findall(r"""class=["']([^"']+)["']""", trecho, re.IGNORECASE))
    classes = f"{classes} {classes_contexto}"
    if "hero__foto" in classes:
        return "100vw"
    # A prévia 'Sobre' usa colunas lado a lado; 100vw superestimava a largura.
    if "secao-sobre-preview__imagens" in classes or "secao-sobre-preview__imagens" in trecho:
        return "(max-width: 640px) 60vw, (max-width: 1024px) 35vw, 420px"
    if "card-produto__imagem" in classes or "card-produto__imagem" in trecho:
        return "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 338px"
    if "/linhas/" in url or "linha" in classes:
        return "(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 680px"
    if "/produtos/" in url:
        return "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 560px"
    return "(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 900px"


def url_para_arquivo(url: str, html_path: Path, raiz: Path) -> Path | None:
    partes = urlsplit(url)
    if partes.scheme or partes.netloc or not partes.path.lower().endswith(".webp"):
        return None
    caminho_url = unquote(partes.path)
    caminho = raiz / caminho_url.lstrip("/") if caminho_url.startswith("/") else html_path.parent / caminho_url
    try:
        caminho.resolve().relative_to(raiz.resolve())
    except ValueError:
        return None
    return caminho.resolve()


def gerar_variantes(arquivo: Path) -> list[tuple[int, str]]:
    resultado = []
    tamanho_original = arquivo.stat().st_size
    with Image.open(arquivo) as original:
        if getattr(original, "is_animated", False) or getattr(original, "n_frames", 1) > 1:
            return resultado
        original.load()
        largura_original, altura_original = original.size
        if largura_original < 360:
            return resultado
        perfil = original.info.get("icc_profile")
        for largura in LARGURAS:
            if largura >= largura_original:
                continue
            destino = arquivo.with_name(f"{arquivo.stem}-{largura}w.webp")
            if destino.exists() and destino.stat().st_mtime >= arquivo.stat().st_mtime:
                if destino.stat().st_size < tamanho_original:
                    resultado.append((largura, destino.name))
                continue
            imagem = original.copy()
            imagem.thumbnail((largura, max(1, round(altura_original * largura / largura_original))), Image.Resampling.LANCZOS)
            opcoes = {"format": "WEBP", "quality": QUALIDADE, "method": 6}
            if perfil:
                opcoes["icc_profile"] = perfil
            imagem.save(destino, **opcoes)
            if destino.stat().st_size <= tamanho_original * (1 - ECONOMIA_MINIMA):
                resultado.append((largura, destino.name))
            else:
                destino.unlink(missing_ok=True)
    return resultado


def otimizar_html(conteudo: str, html_path: Path, raiz: Path) -> tuple[str, int]:
    alterados = 0
    preloads = {}

    def substituir(match: re.Match) -> str:
        nonlocal alterados
        tag = match.group(0)
        if SRCSET_ATTR.search(tag):
            return tag
        src_match = SRC_ATTR.search(tag)
        if not src_match:
            return tag
        url = src_match.group(2)
        arquivo = url_para_arquivo(url, html_path, raiz)
        if not arquivo or not arquivo.is_file():
            return tag
        try:
            largura_original, _ = dimensoes(arquivo)
            variantes = gerar_variantes(arquivo)
        except (OSError, ValueError):
            return tag
        if not variantes:
            return tag
        prefixo = url.rsplit("/", 1)[0] + "/" if "/" in url else ""
        candidatos = [f"{prefixo}{nome} {largura}w" for largura, nome in variantes]
        candidatos.append(f"{url} {largura_original}w")
        srcset = ", ".join(candidatos)
        contexto = conteudo[max(0, match.start() - 700):match.start()]
        sizes = tamanhos_para(url, tag, contexto)
        preloads[url] = (srcset, sizes)
        insercao = f' srcset="{srcset}" sizes="{sizes}"'
        pos = tag.rfind(">")
        if pos < 0:
            return tag
        alterados += 1
        return tag[:pos] + insercao + tag[pos:]

    html_com_srcset = IMG_TAG.sub(substituir, conteudo)
    link_tag = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
    href_attr = re.compile(r"""(?<![-\w:])href\s*=\s*(["'])(.*?)\1""", re.IGNORECASE)
    rel_preload = re.compile(r"""(?<![-\w:])rel\s*=\s*(["'])preload\1""", re.IGNORECASE)
    as_image = re.compile(r"""(?<![-\w:])as\s*=\s*(["'])image\1""", re.IGNORECASE)
    imagesrcset_attr = re.compile(r"""(?<![-\w:])imagesrcset\s*=""", re.IGNORECASE)

    def alinhar_preload(match: re.Match) -> str:
        tag = match.group(0)
        if not rel_preload.search(tag) or not as_image.search(tag) or imagesrcset_attr.search(tag):
            return tag
        href = href_attr.search(tag)
        if not href or href.group(2) not in preloads:
            return tag
        srcset, sizes = preloads[href.group(2)]
        pos = tag.rfind(">")
        if pos < 0:
            return tag
        return tag[:pos] + f' imagesrcset="{srcset}" imagesizes="{sizes}"' + tag[pos:]

    return link_tag.sub(alinhar_preload, html_com_srcset), alterados


def main() -> int:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    if not raiz.is_dir():
        print(f"ERRO: diretório não encontrado: {raiz}", file=sys.stderr)
        return 2
    arquivos_html = 0
    imagens = 0
    for html in sorted(raiz.rglob("*.html")):
        try:
            original = html.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        novo, quantidade = otimizar_html(original, html, raiz)
        if quantidade:
            html.write_text(novo, encoding="utf-8", newline="\n")
            arquivos_html += 1
            imagens += quantidade
            print(f"Imagens responsivas: {html.relative_to(raiz)} ({quantidade} tag(s))")
    print(f"Imagens responsivas: {imagens} tag(s) em {arquivos_html} arquivo(s) HTML.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
