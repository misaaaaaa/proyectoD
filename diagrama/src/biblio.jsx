import { useEffect, useState } from "react";
import { marked } from "marked";

// Muestra contenido/biblio.md tal cual: texto, cursivas y enlaces.
export default function Biblio() {
  const [html, setHtml] = useState(null);

  useEffect(() => {
    fetch("contenido/biblio.md")
      .then((r) => r.text())
      .then((t) => setHtml(marked.parse(t)))
      .catch(() => setHtml("<p>No se pudo cargar la bibliografía.</p>"));
  }, []);

  if (html === null) return null;
  return <div className="biblio" dangerouslySetInnerHTML={{ __html: html }} />;
}
