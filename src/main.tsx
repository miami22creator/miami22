import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function showFatalError(message: string) {
  try {
    const banner = document.createElement("div");
    banner.className = "app-error-banner";
    banner.textContent = "Error al cargar la aplicación:\n\n" + message + "\n\nAbre la consola (F12) para más detalles.";
    document.body.insertBefore(banner, document.body.firstChild);
  } catch {
    // no-op
  }
}

function mountApp() {
  try {
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      const msg = "Elemento #root no encontrado en el DOM.";
      console.error(msg);
      showFatalError(msg);
      return;
    }
    createRoot(rootEl).render(<App />);
  } catch (err: any) {
    console.error("Excepción al montar la aplicación:", err);
    showFatalError(String(err?.stack ?? err));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountApp);
} else {
  mountApp();
}
