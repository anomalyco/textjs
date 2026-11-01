import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule, moduleExports, routeFileKind, staticString, unwrapTs } from "../utils.ts";

export const DYNAMIC_VALUES = ["auto", "force-static", "force-dynamic"] as const;

const NOT_COMPONENT = new Set<string>([
  AST_NODE_TYPES.Literal,
  AST_NODE_TYPES.TemplateLiteral,
  AST_NODE_TYPES.ObjectExpression,
  AST_NODE_TYPES.ArrayExpression,
  AST_NODE_TYPES.JSXElement,
  AST_NODE_TYPES.JSXFragment,
]);

type Options = [{ appDir?: string }];

export default createRule<Options, "missingDefault" | "notComponent" | "dynamicNotLiteral" | "dynamicValue" | "dynamicIgnored">({
  name: "valid-route-module",
  meta: {
    type: "problem",
    docs: {
      description: "Require a component default export in `page`, `layout`, `loading`, `error` and `not-found` files, and a valid `dynamic` export in pages, layouts and route handlers.",
      recommended: true,
    },
    messages: {
      missingDefault: "{{file}} must default-export a React component (TX015).",
      notComponent: "The default export of {{file}} must be a React component, not a {{kind}} (TX015).",
      dynamicNotLiteral:
        'Export `dynamic` as a string literal (`export const dynamic = "force-dynamic"`): `text build` reads it from the source without running the module.',
      dynamicValue: '`dynamic` must be "auto", "force-static" or "force-dynamic" (TX031).',
      dynamicIgnored: "`dynamic` is only read from page, layout and route files; it has no effect in {{file}}.",
    },
    schema: [
      {
        type: "object",
        properties: { appDir: { type: "string", description: 'Name of the App Router directory (default "app").' } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ appDir: "app" }],
  create(context, [{ appDir = "app" }]) {
    const kind = routeFileKind(context.filename, appDir);
    if (!kind) return {};
    const file = context.filename.replace(/\\/g, "/").split("/").pop() ?? kind;
    if (kind === "route") {
      // Route handlers are imported at runtime, so any expression works; only a known string is checked.
      return {
        "Program:exit"(program: TSESTree.Program) {
          const dyn = moduleExports(program).find((e) => e.name === "dynamic" && !e.typeOnly);
          const str = dyn ? staticString(unwrapTs(dyn.value)) : undefined;
          if (dyn && str !== undefined && !(DYNAMIC_VALUES as readonly string[]).includes(str)) context.report({ node: dyn.node, messageId: "dynamicValue" });
        },
      };
    }
    return {
      "Program:exit"(program: TSESTree.Program) {
        const exports = moduleExports(program);
        const def = exports.find((e) => e.name === "default" && !e.typeOnly);
        if (!def) {
          context.report({ loc: { line: 1, column: 0 }, messageId: "missingDefault", data: { file } });
        } else {
          const value = unwrapTs(def.value);
          if (value && NOT_COMPONENT.has(value.type)) {
            const k =
              value.type === AST_NODE_TYPES.JSXElement || value.type === AST_NODE_TYPES.JSXFragment
                ? "JSX element (wrap it in a function)"
                : value.type === AST_NODE_TYPES.ObjectExpression
                  ? "object"
                  : value.type === AST_NODE_TYPES.ArrayExpression
                    ? "array"
                    : "literal";
            context.report({ node: def.node, messageId: "notComponent", data: { file, kind: k } });
          }
        }
        const dyn = exports.find((e) => e.name === "dynamic" && !e.typeOnly);
        if (!dyn) return;
        if (kind !== "page" && kind !== "layout") {
          context.report({ node: dyn.node, messageId: "dynamicIgnored", data: { file } });
          return;
        }
        const value = unwrapTs(dyn.value);
        const declarator = dyn.local?.parent;
        const plainConst =
          dyn.local !== undefined &&
          !dyn.local.typeAnnotation &&
          declarator?.type === AST_NODE_TYPES.VariableDeclarator &&
          declarator.parent.type === AST_NODE_TYPES.VariableDeclaration &&
          declarator.parent.kind === "const";
        if (!plainConst || !value || !(value.type === AST_NODE_TYPES.Literal && typeof value.value === "string")) {
          const str = staticString(value);
          if (str !== undefined && !(DYNAMIC_VALUES as readonly string[]).includes(str)) context.report({ node: dyn.node, messageId: "dynamicValue" });
          else context.report({ node: dyn.node, messageId: "dynamicNotLiteral" });
          return;
        }
        if (!(DYNAMIC_VALUES as readonly string[]).includes(value.value)) context.report({ node: value, messageId: "dynamicValue" });
      },
    };
  },
});
