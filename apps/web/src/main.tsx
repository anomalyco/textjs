import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootCompanion } from "./console-companion/boot";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

// The second React root: a real Text.js app rendering into your DevTools console.
bootCompanion().catch((error: unknown) => console.error("▼ Text.js companion failed to boot", error));
