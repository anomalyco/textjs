import rule from "../src/rules/no-box-in-text.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

const IMPORTS = `import { Box, Text, Link, ScrollBox, Input, Badge, Kbd, Spinner, Code } from "@textjs/react";\n`;

tester().run("no-box-in-text", rule, {
  valid: [
    { filename: FILE, code: `${IMPORTS}export const A = () => <Box><Text>a <Text bold>b</Text> <Badge>new</Badge> <Kbd>⌘K</Kbd> <Spinner /></Text></Box>;` },
    { filename: FILE, code: `${IMPORTS}export const A = () => <Text>{cond ? <Text>a</Text> : "b"}{items.map((i) => <Link key={i} href={i}>{i}</Link>)}</Text>;` },
    // Box next to text, not inside it.
    { filename: FILE, code: `${IMPORTS}export const A = () => <Box><Text>a</Text><Box /></Box>;` },
    // User components with the same names aren't Text.js components.
    { filename: FILE, code: `const Text = (p: any) => p.children;\nconst Box = () => null;\nexport const A = () => <Text><Box /></Text>;` },
    // Unknown user components inside Text are not flagged.
    { filename: FILE, code: `${IMPORTS}import { Panel } from "./panel";\nexport const A = () => <Text><Panel /></Text>;` },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${IMPORTS}export const A = () => <Text>hello <Box /></Text>;`,
      errors: [{ messageId: "boxInText", data: { child: "Box", parent: "Text" }, line: 2 }],
    },
    {
      filename: FILE,
      code: `${IMPORTS}export const A = () => <Text>{open && <ScrollBox />}{x ? <Input /> : null}<>{list.map((l) => { return <Code code={l} />; })}</></Text>;`,
      errors: [
        { messageId: "boxInText", data: { child: "ScrollBox", parent: "Text" } },
        { messageId: "boxInText", data: { child: "Input", parent: "Text" } },
        { messageId: "boxInText", data: { child: "Code", parent: "Text" } },
      ],
    },
    {
      // Nested <Text> and <Link> are checked too; aliases resolve.
      filename: FILE,
      code: `import { Text as T, Box as B, Link } from "@textjs/app";\nexport const A = () => <T><T bold><B /></T><Link href="/">go <B /></Link></T>;`,
      errors: [
        { messageId: "boxInText", data: { child: "Box", parent: "Text" } },
        { messageId: "boxInText", data: { child: "Box", parent: "Link" } },
      ],
    },
    {
      filename: FILE,
      code: `${CONSOLE}export const A = () => <Text children={<Box />} />;`,
      errors: [{ messageId: "boxInText" }],
    },
  ],
});
