import rule from "../src/rules/no-dom-elements.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

tester().run("no-dom-elements", rule, {
  valid: [
    { filename: FILE, code: `${CONSOLE}export const A = () => <Box><Text>hi</Text></Box>;` },
    // Host intrinsics the reconciler understands.
    { filename: FILE, code: `${CONSOLE}export const A = () => <tx-box><tx-text>hi</tx-text></tx-box>;` },
    // DOM files: no Text.js import, react-dom, or the @textjs/react/dom pads.
    { filename: FILE, code: `export const A = () => <div className="hero">Hello</div>;` },
    { filename: FILE, code: `import { tokenize } from "@textjs/react";\nimport { createRoot } from "react-dom/client";\nexport const A = () => <span>{tokenize("x").length}</span>;` },
    { filename: FILE, code: `import type { ConsoleRoot } from "@textjs/react";\nimport { FocusPad } from "@textjs/react/dom";\nexport const A = () => <div><FocusPad /></div>;` },
    // Type-only imports don't make a console file.
    { filename: FILE, code: `import type { BoxProps } from "@textjs/react";\nexport const A = (p: BoxProps) => <div />;` },
    // Strings that contain JSX are fine.
    { filename: FILE, code: `${CONSOLE}const BEFORE = \`<div className="hero">Hello</div>\`;` },
    // Member expressions and user components.
    { filename: FILE, code: `${CONSOLE}const ui = { div: Box };\nexport const A = () => <ui.div />;` },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${CONSOLE}export const A = () => <div className="flex-col">hi</div>;`,
      errors: [
        {
          messageId: "domElement",
          data: { tag: "div", component: "Box" },
          suggestions: [{ messageId: "replace", data: { tag: "div", component: "Box" }, output: `${CONSOLE}export const A = () => <Box className="flex-col">hi</Box>;` }],
        },
      ],
    },
    {
      filename: FILE,
      code: `import { Box } from "@textjs/react";\nexport const A = () => <Box><strong>hi</strong></Box>;`,
      errors: [
        {
          messageId: "domElement",
          suggestions: [{ messageId: "replace", output: `import { Box, Text } from "@textjs/react";\nexport const A = () => <Box><Text bold>hi</Text></Box>;` }],
        },
      ],
    },
    {
      // Aliased imports are reused.
      filename: FILE,
      code: `import { Text as T, Box } from "@textjs/app";\nexport const A = () => <Box><span>x</span><br /></Box>;`,
      errors: [
        { messageId: "domElement", suggestions: [{ messageId: "replace", output: `import { Text as T, Box } from "@textjs/app";\nexport const A = () => <Box><T>x</T><br /></Box>;` }] },
        { messageId: "domElementNoReplacement", data: { tag: "br" } },
      ],
    },
    {
      // Self-closing, existing boolean prop kept once.
      filename: FILE,
      code: `${CONSOLE}export const A = () => <h1 bold />;`,
      errors: [{ messageId: "domElement", suggestions: [{ messageId: "replace", output: `${CONSOLE}export const A = () => <Text bold />;` }] }],
    },
    {
      // A local binding with the replacement's name: no suggestion.
      filename: FILE,
      code: `import { Box } from "@textjs/app";\nconst Button = () => null;\nexport const A = () => <Box><button /></Box>;`,
      errors: [{ messageId: "domElement", data: { tag: "button", component: "Button" }, suggestions: [] }],
    },
    {
      filename: FILE,
      code: `import Link from "@textjs/app/link";\nimport { Box } from "@textjs/app";\nexport const A = () => <Box><a href="/x">x</a></Box>;`,
      errors: [{ messageId: "domElement", suggestions: [{ messageId: "replace", output: `import Link from "@textjs/app/link";\nimport { Box } from "@textjs/app";\nexport const A = () => <Box><Link href="/x">x</Link></Box>;` }] }],
    },
    {
      // Custom elements throw TX003 too.
      filename: FILE,
      code: `${CONSOLE}export const A = () => <Box><my-widget /><tx-raw-text /></Box>;`,
      errors: [
        { messageId: "domElementNoReplacement", data: { tag: "my-widget" } },
        { messageId: "domElementNoReplacement", data: { tag: "tx-raw-text" } },
      ],
    },
    {
      settings: { textjs: { consoleFiles: "all" } },
      filename: FILE,
      code: `export const A = () => <p>x</p>;`,
      errors: [{ messageId: "domElement", suggestions: [] }],
    },
  ],
});
