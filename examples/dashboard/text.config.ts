import { defineConfig } from "@textjs/next";

export default defineConfig({
  title: "Edge Console",
  viewport: { width: 100, height: 32, theme: "geistDark" },
  devIndicators: true,
  hints: [
    { keys: "1 2 3 4 5", label: "pages" },
    { keys: "Tab", label: "focus" },
  ],
});
