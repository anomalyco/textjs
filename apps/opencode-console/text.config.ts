import { defineConfig } from "@textjs/app";
import { opencodeDevMiddleware } from "./server/opencode-proxy";

export default defineConfig({
  title: "▼ OpenCode Lite",
  // Fills the docked DevTools console; 120×36 when it can't be measured.
  viewport: { width: 120, height: 36, theme: "opencodeDark" },
  devIndicators: true,
  action: "type a prompt",
  hints: [
    { keys: "Enter", label: "send" },
    { keys: "Shift Tab", label: "agents" },
    { keys: "Ctrl P", label: "commands" },
  ],
  // `/__opencode/*` → the local OpenCode daemon found via `opencode service status`.
  // The service credential is read and injected here, server-side only.
  configureServer(server) {
    server.middlewares.use(opencodeDevMiddleware());
  },
});
