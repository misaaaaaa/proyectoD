#!/usr/bin/env python3
"""Sincroniza contenido/referentes.md con el Google Doc de referentes.

Descarga el Doc exportado como Markdown (las imágenes vienen embebidas en
base64), busca las secciones que tienen un nombre de archivo de imagen
(p. ej. "torrent35.jpg") y agrega al final de referentes.md las que todavía no
están, guardando su imagen en imagenes/referentes/.

Las entradas que ya existen en el .md NO se modifican, para no pisar las
correcciones hechas a mano. Para rehacer una entrada, bórrala del .md (y su
imagen) y vuelve a correr el script.

Uso:  python3 scripts/sync_referentes.py [--dry-run]
"""

import base64
import os
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

DOC_ID = os.environ.get("DOC_ID", "1IanvUpH2ZdVfKeIRI0DPBFfOE0LND5OIgGLkUMoFvns")
EXPORT_URL = f"https://docs.google.com/document/d/{DOC_ID}/export?format=md"

RAIZ = Path(__file__).resolve().parent.parent
MD = RAIZ / "contenido" / "referentes.md"
IMGS = RAIZ / "imagenes" / "referentes"

RE_DEF_IMG = re.compile(r"^\[(image\d+)\]:\s*<data:image/([\w.+-]+);base64,([^>]+)>\s*$")
EXT = {"jpeg": ".jpg", "png": ".png", "gif": ".gif", "webp": ".webp"}
RE_REF_IMG = re.compile(r"!\[[^\]]*\]\[(image\d+)\]")
RE_ARCHIVO = re.compile(r"^\s*([\w-]+\.(?:jpe?g|png|gif|webp))\s*$", re.I)
RE_ESCAPE = re.compile(r"\\([\\`*_{}\[\]()#+\-.!:~<>|&\"'=])")
RE_LINK = re.compile(r"\[([^\]]*)\]\(([^)\s]+)\)")


def descargar() -> str:
    req = urllib.request.Request(EXPORT_URL, headers={"User-Agent": "sync-referentes"})
    with urllib.request.urlopen(req, timeout=120) as r:
        if "markdown" not in r.headers.get("Content-Type", ""):
            sys.exit(
                "El Doc no se pudo exportar como Markdown. "
                "¿Sigue compartido como 'cualquier persona con el enlace'?"
            )
        return r.read().decode("utf-8")


def limpiar(texto: str) -> str:
    """Quita escapes y negritas del export y acorta los enlaces a su dominio."""
    texto = RE_ESCAPE.sub(r"\1", texto).replace("**", "").strip()

    def link(m):
        etiqueta, url = m.group(1).strip(), m.group(2)
        if etiqueta.startswith("http") or not etiqueta:
            etiqueta = urlparse(url).netloc.removeprefix("www.") or url
        return f"[{etiqueta}]({url})"

    texto = RE_LINK.sub(link, texto)
    # "[[dominio](url)]" -> "[dominio](url)"
    texto = re.sub(r"\[(\[[^\]]*\]\([^)]*\))\]", r"\1", texto)
    return re.sub(r"\s+", " ", texto).strip()


def secciones(md: str):
    """Devuelve (título, [líneas]) por cada '## ' con texto propio.

    Los '## ' vacíos o que solo contienen una imagen se juntan con la sección
    anterior (el Doc a veces tiene encabezados vacíos entre medio).
    """
    actual = None
    for linea in md.splitlines():
        if linea.startswith("## "):
            titulo = limpiar(RE_REF_IMG.sub("", linea[3:]))
            if titulo:
                if actual:
                    yield actual
                actual = (titulo, [])
                continue
            linea = linea[3:]
        if actual:
            actual[1].append(linea)
    if actual:
        yield actual


def main():
    dry = "--dry-run" in sys.argv
    doc = descargar()

    imagenes, lineas = {}, []
    for linea in doc.splitlines():
        m = RE_DEF_IMG.match(linea)
        if m:
            imagenes[m.group(1)] = (m.group(2), m.group(3))
        else:
            lineas.append(linea)

    actual = MD.read_text(encoding="utf-8")
    existentes = {
        Path(p).stem.lower()
        for p in re.findall(r"imagenes/referentes/([\w.-]+)", actual)
    }

    nuevas = []
    for titulo, cuerpo in secciones("\n".join(lineas)):
        texto = "\n".join(cuerpo)
        archivo = next((m.group(1) for l in cuerpo if (m := RE_ARCHIVO.match(l))), None)
        ref = RE_REF_IMG.search(texto)
        if not archivo or Path(archivo).stem.lower() in existentes:
            continue
        if not ref or ref.group(1) not in imagenes:
            print(f"! '{titulo}' ({archivo}) no tiene imagen en el Doc; se omite.")
            continue

        parrafos = []
        for bloque in re.split(r"\n\s*\n|  \n", RE_REF_IMG.sub("", texto)):
            bloque = "\n".join(l for l in bloque.splitlines() if not RE_ARCHIVO.match(l))
            if (p := limpiar(bloque)):
                parrafos.append(p)

        # La extensión sale del tipo real de la imagen, no del nombre escrito en el Doc.
        tipo, b64 = imagenes[ref.group(1)]
        archivo = Path(archivo).stem + EXT.get(tipo.lower(), Path(archivo).suffix)
        nuevas.append((titulo, archivo, b64, parrafos))
        existentes.add(Path(archivo).stem.lower())

    if not nuevas:
        print("No hay referentes nuevos.")
        return

    bloques = []
    for titulo, archivo, b64, parrafos in nuevas:
        print(f"+ {titulo} ({archivo})")
        bloques.append(
            "\n\n".join(
                [f"## {titulo}", f"![{titulo}](../imagenes/referentes/{archivo})", *parrafos]
            )
        )
        if not dry:
            (IMGS / archivo).write_bytes(base64.b64decode(b64))

    if not dry:
        MD.write_text(actual.rstrip("\n") + "\n\n" + "\n\n".join(bloques) + "\n", encoding="utf-8")
    print(f"{len(nuevas)} referente(s) nuevo(s){' (dry run)' if dry else ''}.")


if __name__ == "__main__":
    main()
