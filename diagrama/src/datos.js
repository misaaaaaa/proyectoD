// Edita aquí los nodos del diagrama. Posiciones relativas al centro (0, 0).
const RADIO = 380;

const secciones = [
  { id: "referentes", label: "Referentes", href: "referentes.html" },
  { id: "marcoteorico", label: "Marco teórico", href: "marcoteorico.html" },
  { id: "ensayos", label: "Ensayos", href: "ensayos.html" },
  { id: "metodologia", label: "Metodología", href: "metodologia.html" },
  { id: "biblio", label: "Biblio", href: "biblio.html" },
];

export const nodes = [
  {
    id: "centro",
    type: "burbuja",
    position: { x: 0, y: 0 },
    data: { label: "Proyecto Diagramas", width: 330, height: 190, centro: true, ovalo: true },
  },
  ...secciones.map((s, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / secciones.length;
    return {
      id: s.id,
      type: "burbuja",
      position: { x: Math.cos(a) * RADIO, y: Math.sin(a) * RADIO },
      data: { label: s.label, href: s.href, width: 290, height: 150, ovalo: true },
    };
  }),
];

export const edges = secciones.map((s) => ({
  id: `centro-${s.id}`,
  source: "centro",
  target: s.id,
  type: "straight",
}));
