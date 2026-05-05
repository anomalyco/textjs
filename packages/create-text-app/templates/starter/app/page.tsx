import { useState, type ReactNode } from "react";
import { Box, Code, Text, useInput, useTheme } from "textjs";
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

      <Box className="flex-row gap-1 shrink-0">
        <Text color={theme.subtle}>count</Text>
        <Text bold color={count > 0 ? theme.success : count < 0 ? theme.danger : theme.fg}>
          {String(count)}
        </Text>
      </Box>

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
