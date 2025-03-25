import { useState, type ReactNode } from "react";
import { Badge, Box, Code, Text, useInput, useTheme } from "textjs";
import Link from "textjs/link";

export default function Home(): ReactNode {
  const theme = useTheme();
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up" || e.input === "+" || e.input === "=") setCount((c) => c + 1);
    else if (e.key === "down" || e.input === "-") setCount((c) => c - 1);
    else if (e.input === "r") setCount(0);
  });

  return (
    <Box className="flex-col gap-1">
      <Text color={theme.muted}>
        Get started by editing <Text color={theme.fg} bold>app/page.tsx</Text>. Save and see your changes instantly.
      </Text>

      <Box className="flex-row items-center gap-2 border rounded px-2 py-1 shrink-0" borderColor={theme.border} width={44}>
        <Text color={theme.subtle} wrap="nowrap">
          Counter
        </Text>
        <Text bold color={theme.fg} wrap="nowrap">
          {String(count).padStart(4)}
        </Text>
        <Box className="grow" />
        <Badge variant={count === 0 ? "default" : count > 0 ? "success" : "danger"}>{count === 0 ? "idle" : count > 0 ? "up" : "down"}</Badge>
      </Box>
      <Text color={theme.subtle}>↑ / + increment · ↓ / - decrement · r reset</Text>

      <Code language="tsx" code={`export default function Page() {\n  return <Text>Hello, console.log</Text>;\n}`} showLineNumbers />

      <Box className="flex-row gap-1 h-1">
        <Text color={theme.muted}>Learn how it works on the</Text>
        <Link href="/about" autoFocus>
          About page →
        </Link>
      </Box>
    </Box>
  );
}
