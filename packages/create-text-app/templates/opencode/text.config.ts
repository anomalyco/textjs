import { defineConfig } from "textjs";

const OPENCODE_URL = process.env.OPENCODE_URL ?? "http://localhost:4096";

export default defineConfig({
  title: "{{name}}",
  viewport: { width: 100, height: 32, theme: "opencodeDark" },
  action: "type a prompt",
  hints: [
    { keys: "Enter", label: "send" },
    { keys: "Esc", label: "back" },
  ],
  // The browser talks to `/opencode/*`; the dev and start servers forward it to your local OpenCode server.
  proxy: {
    "/opencode": {
      target: OPENCODE_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/opencode/, ""),
    },
  },
});
