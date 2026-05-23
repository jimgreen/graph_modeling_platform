import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

if (import.meta.hot) {
  let reloadTimer: number | undefined;
  const reloadToLatest = () => {
    window.clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(() => window.location.reload(), 80);
  };

  import.meta.hot.on("vite:beforeUpdate", reloadToLatest);
  import.meta.hot.on("vite:beforeFullReload", reloadToLatest);
  import.meta.hot.on("vite:error", reloadToLatest);
  window.addEventListener("online", reloadToLatest);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
