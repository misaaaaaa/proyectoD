import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
} from "@xyflow/react";

// Punto del borde del círculo `nodo` en dirección a `otro`.
function borde(nodo, otro) {
  const centro = (n) => ({
    x: n.internals.positionAbsolute.x + n.measured.width / 2,
    y: n.internals.positionAbsolute.y + n.measured.height / 2,
  });
  const a = centro(nodo);
  const b = centro(otro);
  const r = nodo.measured.width / 2;
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: a.x + ((b.x - a.x) / d) * r, y: a.y + ((b.y - a.y) / d) * r };
}

export default function Arista({ id, source, target, markerStart, markerEnd, label }) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s?.measured?.width || !t?.measured?.width) return null;
  const p1 = borde(s, t);
  const p2 = borde(t, s);
  const [path, lx, ly] = getStraightPath({
    sourceX: p1.x,
    sourceY: p1.y,
    targetX: p2.x,
    targetY: p2.y,
  });
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
