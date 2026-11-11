import { useEffect, useState } from "react";
import { marked } from "marked";

const MD = "contenido/referentes.md";
const INTERVALO = 100; // ms que se muestra cada imagen en el modo GIF

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

// Columnas y filas que llenan la pantalla con celdas de proporción cercana a 4:3,
// sin dejar demasiadas celdas vacías.
function grilla(n, w, h) {
  let mejor = { cols: 1, filas: n, puntaje: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const filas = Math.ceil(n / cols);
    const proporcion = w / cols / (h / filas);
    const puntaje =
      Math.abs(Math.log(proporcion / 1.33)) + ((cols * filas - n) / n) * 0.4;
    if (puntaje < mejor.puntaje) mejor = { cols, filas, puntaje };
  }
  return mejor;
}

function useTamanoVentana() {
  const [tam, setTam] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const onResize = () => setTam({ w: innerWidth, h: innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return tam;
}

function Tarjeta({ item, onCerrar }) {
  return (
    <div className="overlay" onClick={onCerrar}>
      <article
        className="overlay-panel overlay-referente"
        role="dialog"
        aria-modal="true"
        aria-label={item.titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="overlay-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          ×
        </button>
        <img src={item.src} alt={item.alt} />
        <div dangerouslySetInnerHTML={{ __html: marked.parse(item.texto) }} />
      </article>
    </div>
  );
}

// Modo GIF: una imagen a pantalla completa que cambia cada INTERVALO ms.
function Gif({ items, onAbrir, pausado }) {
  const [actual, setActual] = useState(0);
  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => setActual((i) => (i + 1) % items.length), INTERVALO);
    return () => clearInterval(id);
  }, [items, pausado]);
  const it = items[actual];
  return (
    <button
      type="button"
      className="referentes-gif"
      onClick={() => onAbrir(it)}
      aria-label={"Ver referente: " + it.titulo}
    >
      <img src={it.src} alt={it.alt} />
    </button>
  );
}

// Modo mosaico: todas las imágenes a la vez, llenando la pantalla sin scroll.
function Mosaico({ items, onAbrir }) {
  const { w, h } = useTamanoVentana();
  const { cols, filas } = grilla(items.length, w, h);
  return (
    <div
      className="referentes-mosaico"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))`,
      }}
    >
      {items.map((it) => (
        <button
          key={it.src}
          type="button"
          onClick={() => onAbrir(it)}
          aria-label={"Ver referente: " + it.titulo}
        >
          <img src={it.src} alt={it.alt} loading="eager" />
        </button>
      ))}
    </div>
  );
}

export default function Referentes({ modo = "gif" }) {
  const [items, setItems] = useState(null);
  const [progreso, setProgreso] = useState(null); // { listas, total } mientras carga
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    fetch(MD)
      .then((r) => r.text())
      .then((t) => {
        const lista = parsear(t);
        // El mosaico muestra las imágenes a medida que llegan.
        if (modo === "mosaico") return lista;
        // El GIF arranca solo cuando todas las imágenes están listas,
        // para que no aparezcan cuadros vacíos o a medio cargar.
        let listas = 0;
        setProgreso({ listas, total: lista.length });
        return Promise.all(
          lista.map((it) =>
            precargar(it).finally(() => setProgreso({ listas: ++listas, total: lista.length }))
          )
        ).then((cargados) => cargados.filter(Boolean));
      })
      .then(setItems)
      .catch(() => setItems([]));
  }, [modo]);

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

  return (
    <>
      {modo === "mosaico" ? (
        <Mosaico items={items} onAbrir={setAbierto} />
      ) : (
        <Gif items={items} onAbrir={setAbierto} pausado={!!abierto} />
      )}
      {abierto && <Tarjeta item={abierto} onCerrar={() => setAbierto(null)} />}
    </>
  );
}
