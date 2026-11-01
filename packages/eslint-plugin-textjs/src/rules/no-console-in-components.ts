import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { createRule, isGlobal, propertyName, textjsImports } from "../utils.ts";

const METHODS = new Set([
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
  "table",
  "dir",
  "dirxml",
  "group",
  "groupCollapsed",
  "groupEnd",
  "time",
  "timeEnd",
  "timeLog",
  "count",
  "countReset",
  "assert",
  "clear",
]);

type Options = [{ allow?: string[]; logger?: string }];

export default createRule<Options, "console" | "clear" | "useLogger">({
  name: "no-console-in-components",
  meta: {
    type: "problem",
    hasSuggestions: true,
    docs: {
      description: "Disallow `console.*` calls in files that render into the console.",
      recommended: true,
    },
    messages: {
      console:
        "console.{{method}}() interleaves with rendered frames (and can't be read under them). Show it in the UI (useToast, a log <ScrollBox>), use the [▼] Dev Overlay, or route it through a logger.",
      clear: "console.clear() wipes the rendered frames. The Text.js renderer owns the console; call `window.text.pause()` to stop output instead.",
      useLogger: "Use {{logger}}.{{method}}() instead.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" }, uniqueItems: true, description: "console methods to allow, such as `error`." },
          logger: { type: "string", description: "An in-scope logger object with console-like methods, offered as a suggestion." },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: [] }],
  create(context, [{ allow = [], logger }]) {
    const imports = textjsImports(context);
    if (!imports.isConsole || imports.isTest) return {};
    const allowed = new Set(allow);
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.object.type !== AST_NODE_TYPES.Identifier || callee.object.name !== "console") return;
        const method = propertyName(callee);
        if (!method || !METHODS.has(method) || allowed.has(method)) return;
        if (!isGlobal(context, callee.object)) return;
        const obj = callee.object;
        context.report({
          node: callee,
          messageId: method === "clear" ? "clear" : "console",
          data: { method },
          suggest:
            logger && method !== "clear"
              ? [{ messageId: "useLogger", data: { logger, method }, fix: (fixer) => fixer.replaceText(obj, logger) }]
              : [],
        });
      },
    };
  },
});
