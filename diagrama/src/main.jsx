import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./diagrama.css";
import Diagrama from "./Diagrama.jsx";
import Marco from "./marco.jsx";
import Referentes from "./referentes.jsx";
import Biblio from "./biblio.jsx";
import { nodes, edges } from "./datos.js";

const inicio = document.getElementById("diagrama");
if (inicio) createRoot(inicio).render(<Diagrama nodes={nodes} edges={edges} />);

const marco = document.getElementById("diagrama-marco");
if (marco) createRoot(marco).render(<Marco />);

const referentes = document.getElementById("referentes");
if (referentes) createRoot(referentes).render(<Referentes modo={referentes.dataset.modo} />);

const biblio = document.getElementById("biblio");
if (biblio) createRoot(biblio).render(<Biblio />);
