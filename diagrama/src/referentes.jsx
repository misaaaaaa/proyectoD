import { useEffect, useState } from "react";
import { marked } from "marked";

const MD = "contenido/referentes.md";
const INTERVALO = 100; // ms que se muestra cada imagen

// Cada "## Título" es un referente: su primera imagen y el texto que la sigue.
// Las rutas de las imágenes se resuelven relativas al .md (por eso "../").
function parsear(md) {
  const base = new URL(MD, location.href);
  return md
    .split(/^## /m)
    .slice(1)
    .map((bloque) => {
      const [titulo, ...resto] = bloque.split("\n");
      const cuerpo = resto.join("\n");
      const img = cuerpo.match(/!\[([^\]]*)\]\(([^)\s]+)\)/);
      if (!img) return null;
      return {
        titulo: titulo.trim(),
        alt: img[1],
        src: new URL(img[2], base).href,
        texto: cuerpo.replace(img[0], "").trim(),
      };
    })
    .filter(Boolean);
}

// Carga y decodifica una imagen. Resuelve con el item, o con null si falla.
function precargar(it) {
  const img = new Image();
  img.src = it.src;
  return img
    .decode()
    .then(() => it)
    .catch(() => null);
}

export default function Referentes() {
  const [items, setItems] = useState(null);
  const [progreso, setProgreso] = useState(null); // { listas, total } mientras carga
  const [actual, setActual] = useState(0);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    fetch(MD)
      .then((r) => r.text())
      .then((t) => {
        // La animación arranca solo cuando todas las imágenes están listas,
        // para que no aparezcan cuadros vacíos o a medio cargar.
        const lista = parsear(t);
        let listas = 0;
        setProgreso({ listas, total: lista.length });
        return Promise.all(
          lista.map((it) =>
            precargar(it).finally(() => setProgreso({ listas: ++listas, total: lista.length }))
          )
        );
      })
      .then((cargados) => setItems(cargados.filter(Boolean)))
      .catch(() => setItems([]));
  }, []);

  // Avanza la imagen mientras no haya overlay abierto.
  useEffect(() => {
    if (!items?.length || abierto) return;
    const id = setInterval(() => setActual((i) => (i + 1) % items.length), INTERVALO);
    return () => clearInterval(id);
  }, [items, abierto]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setAbierto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!items)
    return (
      <p className="referentes-cargando" role="status">
        {progreso ? `cargando ${progreso.listas}/${progreso.total}` : "cargando"}
      </p>
    );
  if (!items.length) return <p>No se pudieron cargar los referentes.</p>;
  const it = items[actual];

  return (
    <>
      <button
        type="button"
        className="referentes-gif"
        onClick={() => setAbierto(it)}
        aria-label={"Ver referente: " + it.titulo}
      >
        <img src={it.src} alt={it.alt} />
      </button>
      {abierto && (
        <div className="overlay" onClick={() => setAbierto(null)}>
          <article
            className="overlay-panel overlay-referente"
            role="dialog"
            aria-modal="true"
            aria-label={abierto.titulo}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="overlay-cerrar"
              aria-label="Cerrar"
              onClick={() => setAbierto(null)}
            >
              ×
            </button>
            <img src={abierto.src} alt={abierto.alt} />
            <div dangerouslySetInnerHTML={{ __html: marked.parse(abierto.texto) }} />
          </article>
        </div>
      )}
    </>
  );
}
