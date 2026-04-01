import { defineConfig } from "textjs";
import { opencodeDevMiddleware } from "./server/opencode-proxy";

export default defineConfig({
  title: "▼ OpenCode Lite",
  viewport: { width: 112, height: 34, responsive: false, theme: "opencodeDark" },
  devIndicators: true,
  action: "type a prompt",
  hints: [
    { keys: "Enter", label: "send" },
    { keys: "Tab", label: "build / plan" },
    { keys: "Ctrl P", label: "commands" },
  ],
  // `/__opencode/*` → the local OpenCode daemon found via `opencode service status`.
  // The service credential is read and injected here, server-side only.
  configureServer(server) {
    server.middlewares.use(opencodeDevMiddleware());
  },
});
