import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./diagrama.css";
import Diagrama from "./Diagrama.jsx";
import Marco from "./marco.jsx";
import { nodes, edges } from "./datos.js";

const inicio = document.getElementById("diagrama");
if (inicio) createRoot(inicio).render(<Diagrama nodes={nodes} edges={edges} />);

const marco = document.getElementById("diagrama-marco");
if (marco) createRoot(marco).render(<Marco />);
