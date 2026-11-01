export interface ShowcaseFile {
  name: string;
  language: string;
  code: string;
  highlight?: number[];
}

export const HERO_FILES: ShowcaseFile[] = [
  {
    name: "app/page.tsx",
    language: "tsx",
    highlight: [6, 7, 8, 9],
    code: `import { useState } from "react";
import { AsciiFont, Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);
  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col gap-1 p-2">
      <AsciiFont text="▼ TEXT.JS" />
      <Text color="muted">React 19 in console.log</Text>
      <Text bold color="accent">count = {count}</Text>
    </Box>
  );
}
`,
  },
  {
    name: "app/layout.tsx",
    language: "tsx",
    highlight: [10, 11],
    code: `import type { ReactNode } from "react";
import { Box, Text } from "@textjs/app";
import Link from "@textjs/app/link";

export default function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-2">
        <Text bold>▼ Acme</Text>
        <Link href="/" shortcut="1">Home</Link>
        <Link href="/settings" shortcut="2">Settings</Link>
      </Box>
      <Box className="grow">{children}</Box>
    </Box>
  );
}
`,
  },
  {
    name: "text.config.ts",
    language: "ts",
    highlight: [4, 5],
    code: `import { defineConfig } from "@textjs/app";

export default defineConfig({
  title: "Acme",
  viewport: { width: 100, height: 26, theme: "geistDark" },
});
`,
  },
  { name: "app/globals.css", language: "css", code: "" },
];
