import { defineConfig } from "@textjs/next";
import { terminalDevMiddleware } from "./server/terminal-proxy";

export default defineConfig({
  title: "terminal",
  // The SSH shop's "large" layout: an 80 × 30 container.
  viewport: { width: 80, height: 30, responsive: false, theme: "geistDark" },
  devIndicators: false,
  action: "press ↑ ↓ to browse",
  hints: [
    { keys: "↑ ↓", label: "products" },
    { keys: "+ −", label: "qty" },
    { keys: "c", label: "cart" },
  ],
  // `/__terminal/*` → api(.dev).terminal.shop. Bearer tokens are attached here, server-side.
  configureServer(server) {
    server.middlewares.use(terminalDevMiddleware());
  },
});
