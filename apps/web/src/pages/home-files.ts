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
import { AsciiFont, Box, Text, useInput } from "textjs";

export default function Page() {
  const [count, setCount] = useState(0);
  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col gap-1 p-2">
      <AsciiFont text="▼ TEXT.JS" />
      <Text color="muted">The Console Framework for the Web.</Text>
      <Text bold color="accent">count = {count}</Text>
    </Box>
  );
}
`,
  },
  {
    name: "app/sessions/[id]/page.tsx",
    language: "tsx",
    highlight: [8, 9, 10],
    code: `import { Markdown, ScrollBox, Textarea, Box } from "textjs";
import { useParams } from "textjs/navigation";
import { useSession } from "@/lib/opencode";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, send } = useSession(id);
  return (
    <Box className="flex-col grow">
      <ScrollBox stickyScroll className="grow">
        {messages.map((m) => <Markdown key={m.id}>{m.text}</Markdown>)}
      </ScrollBox>
      <Box className="border rounded px-1" title=" build ">
        <Textarea placeholder="Ask anything…" onSubmit={send} autoFocus />
      </Box>
    </Box>
  );
}
`,
  },
  {
    name: "app/layout.tsx",
    language: "tsx",
    highlight: [5, 6, 7, 8],
    code: `import type { ReactNode } from "react";
import { Box, KeyHint, Text, type Metadata } from "textjs";
import Link from "textjs/link";

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s · Acme" },
};

export default function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-2 bg-surface">
        <Text bold>▼ Acme</Text>
        <Link href="/" shortcut="1">Home</Link>
        <Link href="/sessions" shortcut="2">Sessions</Link>
      </Box>
      <Box className="grow">{children}</Box>
      <KeyHint keys="⌘⌥J" label="you are here" />
    </Box>
  );
}
`,
  },
  {
    name: "text.config.ts",
    language: "ts",
    highlight: [4, 5, 6],
    code: `import { defineConfig } from "textjs";

export default defineConfig({
  title: "Acme Console",
  viewport: { width: 104, height: 32, theme: "geistDark" },
  devIndicators: true,
  rewrites: [
    { source: "/api/opencode/:path*", destination: "http://127.0.0.1:4096/:path*" },
  ],
});
`,
  },
];
