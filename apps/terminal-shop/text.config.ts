import { defineConfig } from "@textjs/app";
import { terminalDevMiddleware } from "./server/terminal-proxy";

export default defineConfig({
  title: "terminal",
  // Follows the console like the SSH shop follows the terminal: 80 × 30 ("large") when the
  // console can't be measured, the smaller layouts below 80 columns.
  viewport: { width: 80, height: 30, responsive: true, theme: "geistDark" },
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
