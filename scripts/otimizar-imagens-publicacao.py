#!/usr/bin/env python3
"""Otimiza WebP somente no artefato publicado, preservando os arquivos-fonte."""
from pathlib import Path
import sys
from PIL import Image

QUALIDADE = 80
REDUCAO_MINIMA = 0.03
LIMITES = {
    "hero": (1600, 1000),
    "produtos": (900, 1200),
    "linhas": (850, 1100),
    "categorias": (850, 1100),
    "sobre": (1400, 1400),
    "blog": (1200, 1200),
}


def limite_para(caminho: Path, raiz: Path) -> tuple[int, int]:
    partes = caminho.relative_to(raiz).parts
    for pasta, dimensoes in LIMITES.items():
        if pasta in partes:
            return dimensoes
    return (1600, 1600)


def otimizar(arquivo: Path, raiz: Path) -> tuple[int, int]:
    tamanho_original = arquivo.stat().st_size
    temporario = arquivo.with_name(arquivo.stem + ".otimizado.webp")
    try:
        with Image.open(arquivo) as imagem:
            if getattr(imagem, "is_animated", False) or getattr(imagem, "n_frames", 1) > 1:
                return tamanho_original, tamanho_original

            imagem.load()
            largura_max, altura_max = limite_para(arquivo, raiz)
            imagem.thumbnail((largura_max, altura_max), Image.Resampling.LANCZOS)

            if imagem.mode not in ("RGB", "RGBA"):
                imagem = imagem.convert("RGBA" if "transparency" in imagem.info else "RGB")

            opcoes = {
                "format": "WEBP",
                "quality": QUALIDADE,
                "method": 6,
            }
            perfil = imagem.info.get("icc_profile")
            if perfil:
                opcoes["icc_profile"] = perfil
            imagem.save(temporario, **opcoes)

        tamanho_novo = temporario.stat().st_size
        if tamanho_novo <= tamanho_original * (1 - REDUCAO_MINIMA):
            temporario.replace(arquivo)
            return tamanho_original, tamanho_novo
        temporario.unlink(missing_ok=True)
        return tamanho_original, tamanho_original
    except Exception:
        temporario.unlink(missing_ok=True)
        raise


def main() -> int:
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    pasta_assets = raiz / "assets"
    if not pasta_assets.is_dir():
        print(f"ERRO: diretório de assets não encontrado: {pasta_assets}", file=sys.stderr)
        return 2

    total_antes = 0
    total_depois = 0
    otimizadas = 0
    arquivos = sorted(pasta_assets.rglob("*.webp"))
    for arquivo in arquivos:
        antes, depois = otimizar(arquivo, raiz)
        total_antes += antes
        total_depois += depois
        if depois < antes:
            otimizadas += 1
            print(f"Otimizada: {arquivo.relative_to(raiz)} ({antes - depois:,} bytes economizados)")

    economia = total_antes - total_depois
    percentual = (economia / total_antes * 100) if total_antes else 0
    print(
        f"Imagens WebP verificadas: {len(arquivos)}; "
        f"otimizadas: {otimizadas}; economia: {economia:,} bytes ({percentual:.1f}%)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
