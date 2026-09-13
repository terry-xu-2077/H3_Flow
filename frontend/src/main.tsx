import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { OverlayProvider } from "./ui/overlay";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/storyboard.css";
import "./styles/composer.css";
import "./styles/overlays.css";
import "./styles/director.css";
import "./styles/director-dialogs.css";
import "./styles/simple-editor.css";
import "./styles/project-workspace.css";
import "./styles/task-editor-polish.css";
import "./styles/v0.6-project-prompt.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayProvider>
      <App />
    </OverlayProvider>
  </StrictMode>,
);