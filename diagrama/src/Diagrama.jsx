import { ReactFlow, Handle, Position, useNodesState } from "@xyflow/react";
import Arista from "./Arista.jsx";

const oculto = { opacity: 0, top: "50%", left: "50%", pointerEvents: "none" };

function Burbuja({ data }) {
  const clases = `burbuja${data.centro ? " burbuja-centro" : ""}${data.ovalo ? " burbuja-ovalo" : ""}`;
  const estilo = { width: ancho(data), height: alto(data) };
  const contenido = (
    <>
      <Handle type="target" position={Position.Top} style={oculto} />
      <Handle type="source" position={Position.Top} style={oculto} />
      <span>{data.label}</span>
    </>
  );
  if (data.href)
    return (
      <a className={clases} style={estilo} href={data.href}>
        {contenido}
      </a>
    );
  if (data.onClick)
    return (
      <button type="button" className={clases} style={estilo} onClick={data.onClick}>
        {contenido}
      </button>
    );
  return (
    <div className={clases} style={estilo}>
      {contenido}
    </div>
  );
}

// Una burbuja puede ser círculo (`size`) u óvalo (`width` y `height`).
const ancho = (d) => d.width ?? d.size;
const alto = (d) => d.height ?? d.size;

const nodeTypes = { burbuja: Burbuja };
const edgeTypes = { flotante: Arista };

// Las posiciones se dan por el centro de cada burbuja.
export default function Diagrama({ nodes: iniciales, edges }) {
  const [nodes, , onNodesChange] = useNodesState(
    iniciales.map((n) => ({
      ...n,
      position: {
        x: n.position.x - ancho(n.data) / 2,
        y: n.position.y - alto(n.data) / 2,
      },
    }))
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      // Zoom con dos dedos (celular), rueda o trackpad (desktop). El mínimo bajo
      // permite alejarse lo suficiente para ver todo en pantallas angostas.
      minZoom={0.15}
      maxZoom={2.5}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    />
  );
}
