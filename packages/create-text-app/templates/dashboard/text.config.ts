import { defineConfig } from "@textjs/app";

export default defineConfig({
  title: "{{name}}",
  viewport: { width: 100, height: 30, theme: "geistDark" },
  hints: [
    { keys: "1 2", label: "pages" },
    { keys: "Tab", label: "focus" },
  ],
});
