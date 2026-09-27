#!/usr/bin/env python3
"""Validador central do conteúdo estruturado da Turkista."""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("ERRO: instale: python -m pip install -r scripts/requirements.txt")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src" / "content"
SCHEMAS = ROOT / "src" / "schema"

CONFIG = {
    "produtos": {
        "dir": CONTENT / "produtos",
        "schema": SCHEMAS / "produto.schema.json",
        "asset_dirs": [ROOT / "assets" / "produtos"],
    },
    "artigos": {
        "dir": CONTENT / "artigos",
        "schema": SCHEMAS / "artigo.schema.json",
        "asset_dirs": [ROOT / "assets" / "blog"],
    },
}

def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"JSON inválido: {path}: {exc}") from exc

def validate_collection(name, cfg):
    schema = load_json(cfg["schema"])
    validator_cls = jsonschema.validators.validator_for(schema)
    validator_cls.check_schema(schema)
    validator = validator_cls(schema)

    files = sorted(p for p in cfg["dir"].glob("*.json") if p.name != "index.json")
    ids, slugs, problems = {}, {}, []
    valid_count = 0

    for path in files:
        try:
            data = load_json(path)
        except ValueError as exc:
            problems.append(str(exc))
            continue

        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        for error in errors:
            location = ".".join(str(x) for x in error.path) or "<raiz>"
            problems.append(f"{path.relative_to(ROOT)} [{location}]: {error.message}")
        if errors:
            continue

        valid_count += 1
        if data.get("id"):
            ids.setdefault(data["id"], []).append(path)
        if data.get("slug"):
            slugs.setdefault(data["slug"], []).append(path)

        refs = list(data.get("imagens", []))
        for cor in data.get("cores", []):
            refs.extend(cor.get("imagens", []))
        if data.get("capa"):
            refs.append(data["capa"])

        for item in refs:
            arquivo = item.get("arquivo")
            if arquivo and not any((folder / arquivo).is_file() for folder in cfg["asset_dirs"]):
                problems.append(f"{path.relative_to(ROOT)}: arquivo não encontrado: {arquivo}")

    for label, values in (("ID", ids), ("slug", slugs)):
        for value, paths in values.items():
            if len(paths) > 1:
                problems.append(
                    f"{name}: {label} duplicado '{value}': " +
                    ", ".join(str(p.relative_to(ROOT)) for p in paths)
                )

    print(f"{name}: {len(files)} arquivo(s), {valid_count} válido(s)")
    return problems

def main():
    problems = []
    for name, cfg in CONFIG.items():
        problems.extend(validate_collection(name, cfg))

    if problems:
        print("\nFALHAS DE VALIDAÇÃO:")
        for problem in problems:
            print(f"- {problem}")
        print(f"\nResultado: FALHOU ({len(problems)} problema(s)).")
        return 1

    print("\nResultado: OK.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
