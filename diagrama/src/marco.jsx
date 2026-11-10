import { useEffect, useState } from "react";
import { MarkerType } from "@xyflow/react";
import { marked } from "marked";
import Diagrama from "./Diagrama.jsx";

const ANCHO = 300;
const ALTO = 170;
const MARGEN = 140; // espacio libre mínimo entre burbujas
const SEPARACION = ANCHO + MARGEN;

// ¿Están p y q lo bastante lejos para que sus óvalos no se toquen?
const lejos = (p, q) =>
  Math.hypot((p.x - q.x) / (ANCHO + MARGEN), (p.y - q.y) / (ALTO + MARGEN)) >= 1;
const COLOR = "#d04a38";

const norm = (t) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// Líneas de la sección "Conexiones": "A -> B : texto", "A <-> B", "A <- B", "A -- B".
function parsearConexiones(cuerpo, items) {
  const porNombre = new Map(items.map((it, i) => [norm(it.titulo), i]));
  const edges = [];
  for (const linea of cuerpo.split("\n")) {
    const m = linea
      .replace(/^\s*[-*+]\s+/, "")
      .match(/^(.+?)\s*(<->|->|<-|--)\s*(.+?)(?:\s*:\s*(.+))?$/);
    if (!m) continue;
    const [, a, flecha, b, texto] = m;
    const x = porNombre.get(norm(a));
    const y = porNombre.get(norm(b));
    if (x === undefined || y === undefined) {
      console.warn("Conexión con nombre desconocido:", linea);
      continue;
    }
    const marca = { type: MarkerType.ArrowClosed, color: COLOR };
    edges.push({
      id: x + "-" + y + "-" + edges.length,
      source: String(x),
      target: String(y),
      type: "flotante",
      label: texto?.trim(),
      markerStart: flecha.startsWith("<") ? marca : undefined,
      markerEnd: flecha.endsWith(">") ? marca : undefined,
    });
  }
  return edges;
}

// Posiciones aleatorias sin superposición (por el centro de cada burbuja),
// en un área más ancha que alta, como la pantalla.
function posicionesAleatorias(n) {
  const mitad = Math.max(SEPARACION, Math.sqrt(n) * SEPARACION * 0.8);
  for (let intento = 0; intento < 200; intento++) {
    const pts = [];
    let tope = 0;
    while (pts.length < n && tope++ < 500) {
      const p = {
        x: (Math.random() * 2 - 1) * mitad * 1.3,
        y: (Math.random() * 2 - 1) * mitad * 0.6,
      };
      if (pts.every((q) => lejos(p, q)))
        pts.push(p);
    }
    if (pts.length === n) return pts;
  }
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: Math.cos(a) * SEPARACION, y: Math.sin(a) * SEPARACION * 0.6 };
  });
}

function parsear(md) {
  const bloques = md
    .split(/^## /m)
    .slice(1)
    .map((bloque) => {
      const [titulo, ...resto] = bloque.split("\n");
      return { titulo: titulo.trim(), cuerpo: resto.join("\n").trim() };
    });
  const esCon = (b) => norm(b.titulo) === "conexiones";
  const items = bloques.filter((b) => !esCon(b));
  const con = bloques.find(esCon);
  return {
    items,
    edges: con ? parsearConexiones(con.cuerpo, items) : [],
    posiciones: posicionesAleatorias(items.length),
  };
}

export default function Marco() {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    fetch("contenido/marcoteorico.md")
      .then((r) => r.text())
      .then((t) => setDatos(parsear(t)))
      .catch(() => setDatos({ items: [], edges: [], posiciones: [] }));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setAbierto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!datos) return null;
  const { items, edges, posiciones } = datos;

  const nodes = items.map((it, i) => ({
    id: String(i),
    type: "burbuja",
    position: posiciones[i],
    data: { label: it.titulo, width: ANCHO, height: ALTO, onClick: () => setAbierto(it) },
  }));

  return (
    <>
      <Diagrama nodes={nodes} edges={edges} />
      {abierto && (
        <div className="overlay" onClick={() => setAbierto(null)}>
          <article
            className="overlay-panel"
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
            <h2>{abierto.titulo}</h2>
            <div dangerouslySetInnerHTML={{ __html: marked.parse(abierto.cuerpo) }} />
          </article>
        </div>
      )}
    </>
  );
}
