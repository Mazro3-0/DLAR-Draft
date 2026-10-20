import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { StatPanelOverlay } from "./StatPanels.jsx";

const statsOverlay =
  new URLSearchParams(window.location.search).get("view") === "stats";

createRoot(document.getElementById("root")).render(
  <StrictMode>{statsOverlay ? <StatPanelOverlay /> : <App />}</StrictMode>,
);
