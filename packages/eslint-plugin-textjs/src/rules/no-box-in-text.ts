import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule, resolveJsxName, textjsImports } from "../utils.ts";

/** Components that render inline text spans (safe children of `<Text>`). */
const INLINE_PARENTS = new Set(["Text", "Link"]);

/** Text.js components whose root is a box (`tx-box`): nesting them in `<Text>` throws TX004. */
export const BOX_COMPONENTS: ReadonlySet<string> = new Set([
  "AsciiFont",
  "BarChart",
  "Box",
  "Button",
  "Center",
  "Code",
  "Diff",
  "Divider",
  "Gradient",
  "Grid",
  "Image",
  "Input",
  "KeyHints",
  "LineChart",
  "List",
  "Markdown",
  "ProgressBar",
  "RadioGroup",
  "ScrollBox",
  "Select",
  "Spacer",
  "Sparkline",
  "SplitPane",
  "Stack",
  "StatusBar",
  "Table",
  "Tabs",
  "Textarea",
  "Tree",
]);

type Child = TSESTree.JSXChild | TSESTree.Expression | TSESTree.Node;

export default createRule({
  name: "no-box-in-text",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow box components (`<Box>`, `<ScrollBox>`, `<Input>`, …) inside `<Text>`.",
      recommended: true,
    },
    messages: {
      boxInText:
        "<{{child}}> renders a box and can't be nested inside <{{parent}}> (TX004). Move it next to the text, or use an inline component (<Text>, <Link>, <Badge>, <Kbd>, <Spinner>).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const imports = textjsImports(context);
    if (imports.names.size === 0) return {};

    function visit(node: Child | null | undefined, parent: string): void {
      if (!node) return;
      switch (node.type) {
        case AST_NODE_TYPES.JSXElement: {
          const name = resolveJsxName(node.openingElement.name, imports);
          if (name && BOX_COMPONENTS.has(name)) {
            context.report({ node: node.openingElement.name, messageId: "boxInText", data: { child: name, parent } });
          }
          return; // nested <Text> elements are checked on their own
        }
        case AST_NODE_TYPES.JSXFragment:
          for (const c of node.children) visit(c, parent);
          return;
        case AST_NODE_TYPES.JSXExpressionContainer:
          if (node.expression.type !== AST_NODE_TYPES.JSXEmptyExpression) visit(node.expression, parent);
          return;
        case AST_NODE_TYPES.LogicalExpression:
          visit(node.right, parent);
          return;
        case AST_NODE_TYPES.ConditionalExpression:
          visit(node.consequent, parent);
          visit(node.alternate, parent);
          return;
        case AST_NODE_TYPES.CallExpression: {
          // items.map((item) => <Box …/>)
          const cb = node.arguments[0];
          if (
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            node.callee.property.name === "map" &&
            cb &&
            (cb.type === AST_NODE_TYPES.ArrowFunctionExpression || cb.type === AST_NODE_TYPES.FunctionExpression)
          ) {
            if (cb.body.type !== AST_NODE_TYPES.BlockStatement) visit(cb.body, parent);
            else for (const s of cb.body.body) if (s.type === AST_NODE_TYPES.ReturnStatement) visit(s.argument, parent);
          }
          return;
        }
        default:
          return;
      }
    }

    return {
      JSXElement(node) {
        const parent = resolveJsxName(node.openingElement.name, imports);
        if (!parent || !INLINE_PARENTS.has(parent)) return;
        for (const c of node.children) visit(c, parent);
        for (const attr of node.openingElement.attributes) {
          if (attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.type === AST_NODE_TYPES.JSXIdentifier && attr.name.name === "children" && attr.value) visit(attr.value, parent);
        }
      },
    };
  },
});
