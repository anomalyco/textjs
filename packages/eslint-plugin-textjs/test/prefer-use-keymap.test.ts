import rule from "../src/rules/prefer-use-keymap.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

tester().run("prefer-use-keymap", rule, {
  valid: [
    // One key isn't a keymap.
    { filename: FILE, code: `${CONSOLE}useInput((e) => { if (e.key === "escape") close(); });` },
    // Text entry reads e.input.
    { filename: FILE, code: `${CONSOLE}useInput((e) => { if (e.key === "return") submit(); else if (e.key === "backspace") del(); else insert(e.input); });` },
    { filename: FILE, code: `${CONSOLE}useInput(({ key, input }) => { if (key === "return") submit(); else if (key === "tab") next(); else setValue((v) => v + input); });` },
    // Non-literal comparisons and other hooks.
    { filename: FILE, code: `${CONSOLE}useInput((e) => { if (e.key === bindings.up || e.key === bindings.down) move(); });` },
    { filename: FILE, code: `${CONSOLE}useKeymap({ up: inc, down: dec });` },
    { filename: FILE, code: `import { useInput } from "./my-input";\nimport { Text } from "@textjs/next";\nuseInput((e) => { if (e.key === "up") a(); if (e.key === "down") b(); });` },
    { filename: FILE, code: `${CONSOLE}useInput(handler);` },
    { filename: FILE, code: `${CONSOLE}useInput((e) => { if (e.key === "up") a(); if (e.key === "down") b(); });`, options: [{ minKeys: 3 }] },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${CONSOLE}useInput((e) => {\n  if (e.key === "up" || e.input === "+") setCount((c) => c + 1);\n  else if (e.key === "down") setCount((c) => c - 1);\n});`,
      errors: [{ messageId: "preferKeymap", data: { count: "3", keys: '"up", "+", "down"' }, line: 2 }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}useInput(function ({ key }) {\n  switch (key) {\n    case "j": next(); break;\n    case "k": prev(); break;\n    case "g": top(); break;\n    case "G": bottom(); break;\n    case "q": quit(); break;\n  }\n});`,
      errors: [{ messageId: "preferKeymap", data: { count: "5", keys: '"j", "k", "g", "G", …' } }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}useInput((e) => { if ("q" === e.key) quit(); if (e.ctrl && e.key === "c") copy(); }, { priority: 5 });`,
      errors: [{ messageId: "preferKeymap", data: { count: "2", keys: '"q", "c"' } }],
    },
  ],
});
