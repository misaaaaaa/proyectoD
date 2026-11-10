import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
} from "@xyflow/react";
import { useState } from "react";

// Entre 2 y 5 puntos intermedios, desplazados al azar (como fracción del largo
// de la línea, para que la forma se mantenga si se mueven las burbujas).
function formaAleatoria() {
  const n = 1 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, (_, i) => ({
    t: (i + 1) / (n + 1),
    off: (Math.random() * 0.5 - 0.25) * (i % 2 ? -1 : 1),
  }));
}

// Curva suave (Catmull-Rom convertida a bézier cúbico) por todos los puntos.
function curva(p1, p2, forma) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  const pts = [
    p1,
    ...forma.map(({ t, off }) => ({
      x: p1.x + dx * t + nx * off * d,
      y: p1.y + dy * t + ny * off * d,
    })),
    p2,
  ];
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[i];
    const c = pts[i + 1];
    const e = pts[Math.min(i + 2, pts.length - 1)];
    segs.push([
      b,
      { x: b.x + (c.x - a.x) / 6, y: b.y + (c.y - a.y) / 6 },
      { x: c.x - (e.x - b.x) / 6, y: c.y - (e.y - b.y) / 6 },
      c,
    ]);
  }
  const path =
    "M" + p1.x + "," + p1.y +
    segs.map(([, c1, c2, c]) => " C" + c1.x + "," + c1.y + " " + c2.x + "," + c2.y + " " + c.x + "," + c.y).join("");
  // Punto medio de la curva: mitad del segmento central.
  const [b, c1, c2, c] = segs[Math.floor(segs.length / 2)];
  const u = segs.length % 2 ? 0.5 : 0;
  const mt = 1 - u;
  const mid = (k) =>
    mt ** 3 * b[k] + 3 * mt ** 2 * u * c1[k] + 3 * mt * u ** 2 * c2[k] + u ** 3 * c[k];
  return [path, mid("x"), mid("y")];
}

// Punto del borde de la burbuja `nodo` (círculo u óvalo) en dirección a `otro`.
function borde(nodo, otro) {
  const centro = (n) => ({
    x: n.internals.positionAbsolute.x + n.measured.width / 2,
    y: n.internals.positionAbsolute.y + n.measured.height / 2,
  });
  const a = centro(nodo);
  const b = centro(otro);
  const rx = nodo.measured.width / 2;
  const ry = nodo.measured.height / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const k = 1 / (Math.hypot(dx / rx, dy / ry) || 1);
  return { x: a.x + dx * k, y: a.y + dy * k };
}

export default function Arista({ id, source, target, markerStart, markerEnd, label }) {
  const [forma] = useState(formaAleatoria);
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s?.measured?.width || !t?.measured?.width) return null;
  const p1 = borde(s, t);
  const p2 = borde(t, s);
  const [path, lx, ly] = curva(p1, p2, forma);
  return (
    <>
      <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="arista-texto"
            style={{ transform: "translate(-50%, -50%) translate(" + lx + "px, " + ly + "px)" }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
