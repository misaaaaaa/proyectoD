import { useEffect, useState } from "react";
import { MarkerType } from "@xyflow/react";
import { marked } from "marked";
import Diagrama from "./Diagrama.jsx";

const RADIO = 300;
const COLOR = "#462727";

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
  return { items, edges: con ? parsearConexiones(con.cuerpo, items) : [] };
}

export default function Marco() {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    fetch("marcoteorico.md")
      .then((r) => r.text())
      .then((t) => setDatos(parsear(t)))
      .catch(() => setDatos({ items: [], edges: [] }));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setAbierto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!datos) return null;
  const { items, edges } = datos;

  const nodes = items.map((it, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / items.length;
    return {
      id: String(i),
      type: "burbuja",
      position: { x: Math.cos(a) * RADIO, y: Math.sin(a) * RADIO },
      data: { label: it.titulo, size: 170, onClick: () => setAbierto(it) },
    };
  });

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
