import rule from "../src/rules/no-console-in-components.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

tester().run("no-console-in-components", rule, {
  valid: [
    // Plain modules and DOM files may log.
    { filename: FILE, code: `export function load() { console.warn("demo mode"); }` },
    { filename: FILE, code: `import { tokenize } from "@textjs/react";\nimport { createRoot } from "react-dom/client";\nconsole.log(tokenize("x"));` },
    // Offscreen tests never touch the real console.
    { filename: FILE, code: `import { render } from "@textjs/app/testing";\nimport { Text } from "@textjs/app";\nconsole.log(render(<Text />));` },
    // Shadowed `console`.
    { filename: FILE, code: `${CONSOLE}function A(console: { log(x: string): void }) { console.log("x"); }` },
    { filename: FILE, code: `${CONSOLE}console.error("boom");`, options: [{ allow: ["error"] }] },
    { filename: FILE, code: `${CONSOLE}console.custom("x"); console["log" + 1]("x");` },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${CONSOLE}export function A() { console.log("render"); return <Text />; }`,
      errors: [{ messageId: "console", data: { method: "log" }, suggestions: [] }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}export function A() { useInput(() => console.clear()); return null; }`,
      errors: [{ messageId: "clear" }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}import { logger } from "./logger";\nconsole.warn("x"); console["debug"]("y");`,
      options: [{ logger: "logger" }],
      errors: [
        { messageId: "console", data: { method: "warn" }, suggestions: [{ messageId: "useLogger", data: { logger: "logger", method: "warn" }, output: `${CONSOLE}import { logger } from "./logger";\nlogger.warn("x"); console["debug"]("y");` }] },
        { messageId: "console", data: { method: "debug" }, suggestions: [{ messageId: "useLogger", output: `${CONSOLE}import { logger } from "./logger";\nconsole.warn("x"); logger["debug"]("y");` }] },
      ],
    },
  ],
});
