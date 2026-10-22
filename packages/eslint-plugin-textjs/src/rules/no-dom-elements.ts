import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createRule, ensureImport, textjsImports } from "../utils.ts";

interface Replacement {
  component: string;
  /** Boolean props that carry the tag's meaning (`<strong>` → `<Text bold>`). */
  props?: string[];
}

const TEXT: Replacement = { component: "Text" };

/** DOM tag → closest Text.js component. Tags without an entry get no suggestion. */
export const DOM_REPLACEMENTS: Readonly<Record<string, Replacement>> = {
  div: { component: "Box" },
  section: { component: "Box" },
  main: { component: "Box" },
  header: { component: "Box" },
  footer: { component: "Box" },
  nav: { component: "Box" },
  article: { component: "Box" },
  aside: { component: "Box" },
  form: { component: "Box" },
  ul: { component: "Box" },
  ol: { component: "Box" },
  li: { component: "Box" },
  span: TEXT,
  p: TEXT,
  label: TEXT,
  small: { component: "Text", props: ["dim"] },
  code: TEXT,
  pre: TEXT,
  strong: { component: "Text", props: ["bold"] },
  b: { component: "Text", props: ["bold"] },
  em: { component: "Text", props: ["italic"] },
  i: { component: "Text", props: ["italic"] },
  u: { component: "Text", props: ["underline"] },
  s: { component: "Text", props: ["strikethrough"] },
  del: { component: "Text", props: ["strikethrough"] },
  h1: { component: "Text", props: ["bold"] },
  h2: { component: "Text", props: ["bold"] },
  h3: { component: "Text", props: ["bold"] },
  h4: { component: "Text", props: ["bold"] },
  h5: { component: "Text", props: ["bold"] },
  h6: { component: "Text", props: ["bold"] },
  a: { component: "Link" },
  button: { component: "Button" },
  input: { component: "Input" },
  textarea: { component: "Textarea" },
  select: { component: "Select" },
  hr: { component: "Divider" },
  img: { component: "Image" },
};

/** Lowercase host intrinsics the Text.js reconciler understands. */
const HOST_INTRINSICS = new Set(["tx-box", "tx-text"]);

export default createRule({
  name: "no-dom-elements",
  meta: {
    type: "problem",
    hasSuggestions: true,
    docs: {
      description: "Disallow DOM elements (`<div>`, `<span>`, …) in console components.",
      recommended: true,
    },
    messages: {
      domElement: "<{{tag}}> is a DOM element; the console renderer only draws Text.js components (TX003). Use <{{component}}> instead.",
      domElementNoReplacement: "<{{tag}}> is a DOM element; the console renderer only draws Text.js components like <Box> and <Text> (TX003).",
      replace: "Replace <{{tag}}> with <{{component}}>.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const imports = textjsImports(context);
    if (!imports.isConsole) return {};
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        const tag = node.name.name;
        if (!/^[a-z]/.test(tag) || HOST_INTRINSICS.has(tag)) return;
        const replacement = DOM_REPLACEMENTS[tag];
        if (!replacement) {
          context.report({ node: node.name, messageId: "domElementNoReplacement", data: { tag } });
          return;
        }
        const ensured = ensureImport(context, imports, replacement.component);
        const element = node.parent as TSESTree.JSXElement;
        const data = { tag, component: replacement.component };
        context.report({
          node: node.name,
          messageId: "domElement",
          data,
          suggest: ensured
            ? [
                {
                  messageId: "replace",
                  data,
                  fix(fixer) {
                    const fixes: TSESLint.RuleFix[] = [];
                    const existing = new Set(
                      node.attributes.flatMap((a) => (a.type === AST_NODE_TYPES.JSXAttribute && a.name.type === AST_NODE_TYPES.JSXIdentifier ? [a.name.name] : [])),
                    );
                    const extra = (replacement.props ?? []).filter((p) => !existing.has(p));
                    fixes.push(fixer.replaceText(node.name, ensured.local + extra.map((p) => ` ${p}`).join("")));
                    if (element.closingElement) fixes.push(fixer.replaceText(element.closingElement.name, ensured.local));
                    const imp = ensured.fix(fixer);
                    if (imp) fixes.push(imp);
                    return fixes;
                  },
                },
              ]
            : [],
        });
      },
    };
  },
});
