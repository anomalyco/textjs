import { defineConfig } from "textjs";

export default defineConfig({
  title: "{{name}}",
  viewport: { width: 100, height: 32, theme: "geistDark" },
  hints: [
    { keys: "↑ ↓", label: "count" },
    { keys: "1 2", label: "pages" },
  ],
});
