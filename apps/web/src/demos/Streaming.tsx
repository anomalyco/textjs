import { useEffect, useState, type ReactNode } from "react";
import { Box, Diff, Markdown, ScrollBox, useInput } from "@textjs/react";

export const STREAMING_MARKDOWN = `## Streaming \`<Markdown>\`

Text.js parses Markdown **incrementally**, so half-finished tokens like \`**bo\` or an unclosed code fence never break the frame.

- Every token re-renders through React 19
- Only *dirty rows* are re-encoded by **Turbolog**
- Exactly **one** \`console.log\` per frame

\`\`\`tsx
export default function Page() {
  return <Text bold>Hello from console.log</Text>;
}
\`\`\`

| Metric | Value |
| :-- | --: |
| Frame interval | 66ms |
| Full repaint | 0.163ms |
`;

const BEFORE = `export default function Page() {
  return <div className="hero">Hello</div>;
}
`;

const AFTER = `export default function Page() {
  return <Text bold color="accent">Hello</Text>;
}
`;

/** Reveal `text` a few characters at a time, like a model streaming tokens. */
export function useTokenStream(text: string, cps = 140, restartKey = 0): { shown: string; done: boolean } {
  // Start with the heading already in, so the frame is never blank.
  const head = Math.max(0, text.indexOf(" ", text.indexOf("\n") + 2));
  const [n, setN] = useState(head);
  useEffect(() => {
    setN(head);
    const step = Math.max(1, Math.round(cps / 30));
    const id = setInterval(() => {
      setN((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return Math.min(text.length, c + step + Math.floor(Math.random() * step));
      });
    }, 33);
    return () => clearInterval(id);
  }, [text, cps, restartKey]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export interface StreamingDemoProps {
  markdown?: string;
}

export function StreamingDemo({ markdown = STREAMING_MARKDOWN }: StreamingDemoProps): ReactNode {
  const [run, setRun] = useState(0);
  const { shown, done } = useTokenStream(markdown, 160, run);
  useInput((e) => {
    if (e.input === "r") {
      e.stopPropagation();
      setRun((r) => r + 1);
    }
  });
  return (
    <ScrollBox stickyScroll showScrollbar={false} className="grow" paddingX={2}>
      <Markdown>{shown}</Markdown>
      {done ? (
        <Box className="flex-col shrink-0" marginTop={1}>
          <Diff patch={{ before: BEFORE, after: AFTER, filename: "app/page.tsx" }} />
        </Box>
      ) : null}
    </ScrollBox>
  );
}
