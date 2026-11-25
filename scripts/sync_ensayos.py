#!/usr/bin/env python3
"""Sincroniza las imágenes de ensayos con la carpeta de Google Drive.

La carpeta de Drive es la fuente de verdad: se bajan las imágenes nuevas
(también las de subcarpetas) y se borran las que ya no están en Drive.

Los originales pueden ser enormes, así que no se guardan. De cada imagen se
generan dos versiones WebP (conservan la transparencia):
  imagenes/ensayos/mini/    lado mayor 700 px   -> mosaico
  imagenes/ensayos/grande/  lado mayor 2000 px  -> imagen ampliada

Al final se escribe contenido/ensayos-imagenes.json, que es lo que lee
ensayos.html para armar el mosaico.

Una imagen ya descargada (mismo id de Drive) no se vuelve a bajar. Si
reemplazas una imagen en Drive manteniendo el archivo, bórrala de
ensayos-imagenes.json para forzar que se baje de nuevo.

La carpeta debe estar compartida como "cualquier persona con el enlace".
Requiere Pillow:  pip install Pillow

Uso:  CARPETA_ID=<id de la carpeta> python3 scripts/sync_ensayos.py [--dry-run]
"""

import html
import io
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None  # hay escaneos de más de 100 megapíxeles

# El ID de la carpeta no se guarda en el repo: viene del secret CARPETA_ID
# en GitHub Actions, o de la variable de entorno al correrlo a mano.
CARPETA_ID = os.environ.get("CARPETA_ID", "").strip()

RAIZ = Path(__file__).resolve().parent.parent
IMGS = RAIZ / "imagenes" / "ensayos"
MANIFIESTO = RAIZ / "contenido" / "ensayos-imagenes.json"
TAMANOS = {"mini": 700, "grande": 2000}

EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ".heic"}
RE_ENTRADA = re.compile(
    r'<a href="https://drive\.google\.com/(file/d|drive/folders)/([\w-]+)[^"]*".*?'
    r'class="flip-entry-title">([^<]*)<',
    re.S,
)


def pedir(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "sync-ensayos"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def listar(carpeta_id: str, prefijo: str = ""):
    """Devuelve [(ruta_relativa, file_id)] recorriendo subcarpetas."""
    pagina = pedir(f"https://drive.google.com/embeddedfolderview?id={carpeta_id}").decode("utf-8")
    if "flip-entries" not in pagina:
        sys.exit("No se pudo leer la carpeta de Drive. ¿Sigue compartida con 'cualquier persona con el enlace'?")
    archivos = []
    for tipo, id_, nombre in RE_ENTRADA.findall(pagina):
        nombre = html.unescape(nombre).strip().replace("/", "_")
        if tipo == "drive/folders":
            archivos += listar(id_, f"{prefijo}{nombre}/")
        elif Path(nombre).suffix.lower() in EXTENSIONES:
            archivos.append((prefijo + nombre, id_))
    return archivos


def descargar(file_id: str) -> Image.Image:
    datos = pedir(f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t")
    img = Image.open(io.BytesIO(datos))
    img = ImageOps.exif_transpose(img)  # respeta la rotación de las fotos
    transparente = img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info
    return img.convert("RGBA" if transparente else "RGB")


def main():
    dry = "--dry-run" in sys.argv
    if not CARPETA_ID:
        sys.exit("Falta CARPETA_ID (el ID de la carpeta de Drive). En GitHub va como secret del repo.")
    remotos = listar(CARPETA_ID)
    print(f"{len(remotos)} imagen(es) en Drive.")

    anterior = {}
    if MANIFIESTO.exists():
        anterior = {i["id"]: i for i in json.loads(MANIFIESTO.read_text(encoding="utf-8"))}

    manifiesto, cambios = [], 0
    for ruta, file_id in sorted(remotos, key=lambda x: x[0].lower()):
        base = str(Path(ruta).with_suffix(".webp"))
        rutas = {k: f"imagenes/ensayos/{k}/{base}" for k in TAMANOS}
        previo = anterior.get(file_id)
        if previo and all(previo.get(k) == v and (RAIZ / v).exists() for k, v in rutas.items()):
            manifiesto.append(previo)
            continue
        try:
            img = descargar(file_id)
        except Exception as e:  # noqa: BLE001
            print(f"! {ruta}: {e}; se omite.")
            continue
        print(f"+ {ruta} ({img.width}×{img.height})")
        cambios += 1
        entrada = {"id": file_id, "nombre": ruta}
        for k, lado in TAMANOS.items():
            copia = img.copy()
            copia.thumbnail((lado, lado), Image.LANCZOS)
            if not dry:
                destino = RAIZ / rutas[k]
                destino.parent.mkdir(parents=True, exist_ok=True)
                copia.save(destino, "WEBP", quality=82, method=6)
            entrada[k] = rutas[k]
            if k == "mini":
                entrada["w"], entrada["h"] = copia.size
        manifiesto.append(entrada)

    # Borrar lo que ya no está en Drive.
    vigentes = {RAIZ / i[k] for i in manifiesto for k in TAMANOS}
    if IMGS.exists():
        for f in sorted(IMGS.rglob("*")):
            if f.is_file() and f not in vigentes:
                print(f"- {f.relative_to(IMGS)}")
                cambios += 1
                if not dry:
                    f.unlink()
        if not dry:
            for d in sorted(IMGS.rglob("*"), reverse=True):
                if d.is_dir() and not any(d.iterdir()):
                    d.rmdir()

    if not dry:
        MANIFIESTO.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{cambios} cambio(s){' (dry run)' if dry else ''}.")


if __name__ == "__main__":
    main()
