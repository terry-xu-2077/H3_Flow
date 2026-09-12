import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { OverlayProvider } from "./ui/overlay";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/composer.css";
import "./styles/overlays.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayProvider>
      <App />
    </OverlayProvider>
  </StrictMode>,
);
