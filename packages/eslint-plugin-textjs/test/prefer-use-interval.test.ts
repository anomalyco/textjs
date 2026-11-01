import rule from "../src/rules/prefer-use-interval.ts";
import { FILE, tester } from "./tester.ts";

const IMPORTS = `import { useEffect, useState } from "react";\nimport { Text } from "@textjs/app";\n`;
const WITH = `import { useEffect, useState } from "react";\nimport { Text, useInterval } from "@textjs/app";\n`;

tester().run("prefer-use-interval", rule, {
  valid: [
    // Module-level shared tickers are fine.
    { filename: FILE, code: `${IMPORTS}const id = setInterval(tick, 1000);` },
    // Non-component helpers.
    { filename: FILE, code: `${IMPORTS}function startPolling() { return setInterval(poll, 1000); }` },
    // Not a console file.
    { filename: FILE, code: `import { useEffect } from "react";\nexport function Clock() { useEffect(() => { const id = setInterval(t, 1000); return () => clearInterval(id); }, []); return null; }` },
    // Shadowed setInterval.
    { filename: FILE, code: `${IMPORTS}export function A({ setInterval }: any) { setInterval(1); return null; }` },
    { filename: FILE, code: `${WITH}export function A() { useInterval(() => {}, 1000); return null; }` },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${IMPORTS}export function Clock() {\n  const [now, setNow] = useState(0);\n  useEffect(() => {\n    const id = setInterval(() => setNow(Date.now()), 1000);\n    return () => clearInterval(id);\n  }, []);\n  return <Text>{now}</Text>;\n}`,
      errors: [
        {
          messageId: "preferUseInterval",
          line: 6,
          suggestions: [
            {
              messageId: "rewrite",
              output: `${WITH}export function Clock() {\n  const [now, setNow] = useState(0);\n  useInterval(() => setNow(Date.now()), 1000);\n  return <Text>{now}</Text>;\n}`,
            },
          ],
        },
      ],
    },
    {
      // Guard + block cleanup + hook + existing import.
      filename: FILE,
      code: `${WITH}function useTicker(paused: boolean, ms: number) {\n  useEffect(() => {\n    if (paused || ms <= 0) return;\n    const t = setInterval(tick, ms);\n    return () => { clearInterval(t); };\n  }, [paused, ms]);\n}`,
      errors: [
        {
          messageId: "preferUseInterval",
          suggestions: [{ messageId: "rewrite", output: `${WITH}function useTicker(paused: boolean, ms: number) {\n  useInterval(tick, paused || ms <= 0 ? null : ms);\n}` }],
        },
      ],
    },
    {
      // memo() components, window.setInterval; extra effect logic → no rewrite.
      filename: FILE,
      code: `${IMPORTS}import { memo } from "react";\nexport const A = memo(function A() {\n  useEffect(() => {\n    start();\n    const id = window.setInterval(step, 350);\n    return () => clearInterval(id);\n  }, []);\n  return null;\n});`,
      errors: [{ messageId: "preferUseInterval", suggestions: [] }],
    },
    {
      // Arrow components.
      filename: FILE,
      code: `${IMPORTS}const Blink = () => { useEffect(() => { const id = setInterval(toggle, 500); return () => clearInterval(id); }, []); return null; };`,
      errors: [{ messageId: "preferUseInterval", suggestions: [{ messageId: "rewrite", output: `import { useEffect, useState } from "react";\nimport { Text, useInterval } from "@textjs/app";\nconst Blink = () => { useInterval(toggle, 500); return null; };` }] }],
    },
  ],
});
