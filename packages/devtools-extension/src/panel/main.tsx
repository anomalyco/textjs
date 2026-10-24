import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PanelStore } from "./store";
import { ExtensionTransport } from "./transport";

function inspectedTabId(): number {
  const fromDevtools = typeof chrome !== "undefined" ? chrome.devtools?.inspectedWindow?.tabId : undefined;
  if (typeof fromDevtools === "number") return fromDevtools;
  // Opened outside DevTools (end-to-end tests): `panel.html?tabId=N`.
  return Number(new URLSearchParams(location.search).get("tabId"));
}

const store = new PanelStore(new ExtensionTransport(inspectedTabId()));
(globalThis as Record<string, unknown>).__textjsPanel = store;
createRoot(document.getElementById("root")!).render(<App store={store} />);
