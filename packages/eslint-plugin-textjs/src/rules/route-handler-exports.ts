import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createRule, moduleExports, routeFileKind, unwrapTs } from "../utils.ts";

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

type Options = [{ appDir?: string; allow?: string[] }];

const NOT_FUNCTION = new Set<string>([
  AST_NODE_TYPES.Literal,
  AST_NODE_TYPES.TemplateLiteral,
  AST_NODE_TYPES.ObjectExpression,
  AST_NODE_TYPES.ArrayExpression,
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.ClassExpression,
]);

export default createRule<Options, "unknownExport" | "methodCase" | "defaultExport" | "notFunction" | "noHandlers" | "rename">({
  name: "route-handler-exports",
  meta: {
    type: "problem",
    hasSuggestions: true,
    docs: {
      description: "Restrict `route.ts` files to HTTP method handlers (`GET`, `POST`, …).",
      recommended: true,
    },
    messages: {
      unknownExport: "`{{name}}` isn't an HTTP method; route handlers only read GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS exports. Move shared code to lib/.",
      methodCase: "`{{name}}` is never called: HTTP method exports are uppercase (`{{method}}`). Requests get 405 Method Not Allowed.",
      defaultExport: "route.ts default exports are ignored; export named handlers (`export function GET(request) { … }`).",
      notFunction: "`{{name}}` must be a function `(request, { params }) => Response`.",
      noHandlers: "route.ts exports no HTTP method handlers, so every request gets 405 Method Not Allowed.",
      rename: "Rename to `{{method}}`.",
    },
    schema: [
      {
        type: "object",
        properties: {
          appDir: { type: "string", description: 'Name of the App Router directory (default "app").' },
          allow: { type: "array", items: { type: "string" }, uniqueItems: true, description: "Extra exports to allow." },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ appDir: "app", allow: [] }],
  create(context, [{ appDir = "app", allow = [] }]) {
    if (routeFileKind(context.filename, appDir) !== "route") return {};
    const allowed = new Set(allow);
    const methods = new Set<string>(HTTP_METHODS);
    return {
      "Program:exit"(program: TSESTree.Program) {
        const exports = moduleExports(program);
        let handlers = 0;
        let miscased = 0;
        let reExportAll = false;
        for (const stmt of program.body) if (stmt.type === AST_NODE_TYPES.ExportAllDeclaration) reExportAll = true;
        for (const e of exports) {
          if (e.typeOnly || allowed.has(e.name)) continue;
          if (e.name === "default") {
            context.report({ node: e.node, messageId: "defaultExport" });
            continue;
          }
          if (methods.has(e.name)) {
            handlers++;
            const value = unwrapTs(e.value);
            if (value && NOT_FUNCTION.has(value.type)) context.report({ node: e.node, messageId: "notFunction", data: { name: e.name } });
            continue;
          }
          const method = e.name.toUpperCase();
          if (methods.has(method)) {
            miscased++;
            const local = e.local;
            const variable = local ? context.sourceCode.getDeclaredVariables(local.parent as TSESTree.Node).find((v) => v.name === local.name) : undefined;
            const scope = context.sourceCode.getScope(program);
            const free = !scope.set.has(method) && !scope.childScopes.some((s) => s.set.has(method));
            context.report({
              node: e.node,
              messageId: "methodCase",
              data: { name: e.name, method },
              suggest:
                local && variable && free
                  ? [
                      {
                        messageId: "rename",
                        data: { method },
                        fix: (fixer) => {
                          const fixes: TSESLint.RuleFix[] = [fixer.replaceText(local, method)];
                          for (const ref of variable.references) if (ref.identifier !== local) fixes.push(fixer.replaceText(ref.identifier, method));
                          return fixes;
                        },
                      },
                    ]
                  : [],
            });
            continue;
          }
          context.report({ node: e.node, messageId: "unknownExport", data: { name: e.name } });
        }
        if (handlers === 0 && miscased === 0 && !reExportAll) context.report({ loc: { line: 1, column: 0 }, messageId: "noHandlers" });
      },
    };
  },
});
