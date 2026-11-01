import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule, propertyName, resolveCallee, staticString, textjsImports } from "../utils.ts";

type Options = [{ minKeys?: number }];

const KEY_FIELDS = new Set(["key", "input"]);

interface Scan {
  /** Compared key literal → source offset (reported in source order). */
  keys: Map<string, number>;
  /** The handler reads typed text (`e.input` outside a comparison): a text field, not shortcuts. */
  readsText: boolean;
}

export default createRule<Options, "preferKeymap">({
  name: "prefer-use-keymap",
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer `useKeymap` over comparing keys by hand in `useInput`.",
      recommended: false,
    },
    messages: {
      preferKeymap:
        "This useInput handler matches {{count}} keys by hand ({{keys}}). useKeymap({ \"…\": { label, run } }) lists labeled shortcuts in <KeyHelp>, <KeyHints> (with hint: true) and the command palette, supports sequences like \"g g\", and stops propagation for matched keys.",
    },
    schema: [
      {
        type: "object",
        properties: { minKeys: { type: "integer", minimum: 1, description: "Distinct key comparisons before reporting (default 2)." } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ minKeys: 2 }],
  create(context, [{ minKeys = 2 }]) {
    const imports = textjsImports(context);
    if (!imports.isConsole) return {};

    function scan(fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression): Scan {
      const result: Scan = { keys: new Map(), readsText: false };
      const param = fn.params[0];
      /** `e` in `(e) => …`. */
      const eventName = param?.type === AST_NODE_TYPES.Identifier ? param.name : undefined;
      /** `key` / `input` in `({ key, input }) => …`. */
      const destructured = new Map<string, string>();
      if (param?.type === AST_NODE_TYPES.ObjectPattern) {
        for (const p of param.properties) {
          if (p.type !== AST_NODE_TYPES.Property || p.value.type !== AST_NODE_TYPES.Identifier) continue;
          const field = propertyName(p);
          if (field && KEY_FIELDS.has(field)) destructured.set(p.value.name, field);
        }
      }
      const fieldOf = (n: TSESTree.Node): string | undefined => {
        if (n.type === AST_NODE_TYPES.Identifier) return destructured.get(n.name);
        if (n.type === AST_NODE_TYPES.MemberExpression && n.object.type === AST_NODE_TYPES.Identifier && n.object.name === eventName) {
          const f = propertyName(n);
          return f && KEY_FIELDS.has(f) ? f : undefined;
        }
        return undefined;
      };
      const seen = new WeakSet<TSESTree.Node>();
      const walk = (n: TSESTree.Node): void => {
        if (n.type === AST_NODE_TYPES.BinaryExpression && (n.operator === "===" || n.operator === "==")) {
          for (const [a, b] of [
            [n.left, n.right],
            [n.right, n.left],
          ] as const) {
            const lit = staticString(b);
            if (fieldOf(a) && lit !== undefined) {
              if (!result.keys.has(lit)) result.keys.set(lit, b.range[0]);
              seen.add(a);
            }
          }
        } else if (n.type === AST_NODE_TYPES.SwitchStatement && fieldOf(n.discriminant)) {
          seen.add(n.discriminant);
          for (const c of n.cases) {
            const lit = staticString(c.test);
            if (lit !== undefined && c.test && !result.keys.has(lit)) result.keys.set(lit, c.test.range[0]);
          }
        } else if (fieldOf(n) === "input" && !seen.has(n)) {
          result.readsText = true;
        }
        for (const key of Object.keys(n) as Array<keyof typeof n>) {
          if (key === "parent") continue;
          const v = n[key] as unknown;
          if (Array.isArray(v)) {
            for (const c of v) if (c && typeof c === "object" && "type" in c) walk(c as TSESTree.Node);
          } else if (v && typeof v === "object" && "type" in v) walk(v as TSESTree.Node);
        }
      };
      walk(fn.body);
      return result;
    }

    return {
      CallExpression(node) {
        if (resolveCallee(node.callee, imports) !== "useInput") return;
        const fn = node.arguments[0];
        if (fn?.type !== AST_NODE_TYPES.ArrowFunctionExpression && fn?.type !== AST_NODE_TYPES.FunctionExpression) return;
        const { keys, readsText } = scan(fn);
        if (readsText || keys.size < minKeys) return;
        const list = [...keys].sort((a, b) => a[1] - b[1]).slice(0, 4).map(([k]) => k).map((k) => JSON.stringify(k));
        if (keys.size > 4) list.push("…");
        context.report({ node: node.callee, messageId: "preferKeymap", data: { count: String(keys.size), keys: list.join(", ") } });
      },
    };
  },
});
