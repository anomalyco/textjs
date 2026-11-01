import rule from "../src/rules/no-sub-frame-timers.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

tester().run("no-sub-frame-timers", rule, {
  valid: [
    { filename: FILE, code: `${CONSOLE}useInterval(tick, 66); setInterval(tick, 1000); useInterval(tick, null); useInterval(tick, delay);` },
    { filename: FILE, code: `${CONSOLE}useAnimationFrame(step); useAnimationFrame(step, { fps: 15 }); useAnimationFrame(step, { isActive: true });` },
    // Not a console file / shadowed / user hooks.
    { filename: FILE, code: `setInterval(tick, 16);` },
    { filename: FILE, code: `${CONSOLE}function f(setInterval: any) { setInterval(tick, 16); }` },
    { filename: FILE, code: `import { Text } from "@textjs/app";\nimport { useInterval } from "./hooks";\nuseInterval(tick, 16);` },
    { filename: FILE, code: `${CONSOLE}useInterval(tick, 40);`, options: [{ minInterval: 33 }] },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${CONSOLE}useInterval(tick, 16);`,
      errors: [{ messageId: "interval", data: { delay: "16", min: "66" }, column: 19 }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}const id = setInterval(tick, 0);`,
      errors: [{ messageId: "interval", data: { delay: "0", min: "66" } }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}useAnimationFrame(step, { fps: 60 });`,
      errors: [{ messageId: "fps", data: { fps: "60", maxFps: "15" } }],
    },
    {
      filename: FILE,
      code: `import { useInterval as every } from "@textjs/react";\nevery(tick, 50);`,
      errors: [{ messageId: "interval" }],
    },
  ],
});
