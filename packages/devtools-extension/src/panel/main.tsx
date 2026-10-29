import { createRoot } from "react-dom/client";
import { isTabId } from "../protocol";
import { App } from "./App";
import { PanelStore } from "./store";
import { ExtensionTransport } from "./transport";

function inspectedTabId(): number | null {
  const fromDevtools = typeof chrome !== "undefined" ? chrome.devtools?.inspectedWindow?.tabId : undefined;
  if (isTabId(fromDevtools)) return fromDevtools;
  // Opened outside DevTools (end-to-end tests): `panel.html?tabId=N`.
  const fromQuery = Number(new URLSearchParams(location.search).get("tabId"));
  return isTabId(fromQuery) ? fromQuery : null;
}

const tabId = inspectedTabId();
const root = createRoot(document.getElementById("root")!);
if (tabId === null) {
  root.render(
    <div className="empty">
      <div className="empty-mark">▼</div>
      <p className="empty-title">No inspected tab</p>
      <p className="empty-body">Open this panel from Chrome DevTools.</p>
    </div>,
  );
} else {
  const store = new PanelStore(new ExtensionTransport(tabId));
  (globalThis as Record<string, unknown>).__textjsPanel = store;
  root.render(<App store={store} />);
}
