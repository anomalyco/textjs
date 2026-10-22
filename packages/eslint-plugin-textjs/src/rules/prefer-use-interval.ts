import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createRule, enclosingComponent, ensureImport, isGlobal, textjsImports } from "../utils.ts";

function isTimerCall(node: TSESTree.CallExpression, name: string): TSESTree.Identifier | undefined {
  const c = node.callee;
  if (c.type === AST_NODE_TYPES.Identifier && c.name === name) return c;
  if (
    c.type === AST_NODE_TYPES.MemberExpression &&
    !c.computed &&
    c.object.type === AST_NODE_TYPES.Identifier &&
    (c.object.name === "window" || c.object.name === "globalThis") &&
    c.property.type === AST_NODE_TYPES.Identifier &&
    c.property.name === name
  ) {
    return c.object;
  }
  return undefined;
}

function isUseEffect(node: TSESTree.Node | undefined): node is TSESTree.CallExpression {
  if (node?.type !== AST_NODE_TYPES.CallExpression) return false;
  const c = node.callee;
  if (c.type === AST_NODE_TYPES.Identifier) return c.name === "useEffect" || c.name === "useLayoutEffect";
  return c.type === AST_NODE_TYPES.MemberExpression && c.property.type === AST_NODE_TYPES.Identifier && (c.property.name === "useEffect" || c.property.name === "useLayoutEffect");
}

interface Rewrite {
  statement: TSESTree.ExpressionStatement;
  callback: TSESTree.Node;
  delay: TSESTree.Node;
  /** `if (TEST) return;` guard before the timer: the interval pauses while `TEST` is truthy. */
  guard?: TSESTree.Expression;
}

/**
 * Match the canonical effect so it can become `useInterval(cb, delay)`:
 *
 *   useEffect(() => {
 *     if (paused) return;                         // optional
 *     const id = setInterval(cb, delay);
 *     return () => clearInterval(id);
 *   }, [deps]);
 */
function matchEffect(call: TSESTree.CallExpression): Rewrite | undefined {
  const decl = call.parent;
  if (decl?.type !== AST_NODE_TYPES.VariableDeclarator || decl.id.type !== AST_NODE_TYPES.Identifier) return undefined;
  const id = decl.id.name;
  const varDecl = decl.parent;
  if (varDecl?.type !== AST_NODE_TYPES.VariableDeclaration || varDecl.declarations.length !== 1) return undefined;
  const body = varDecl.parent;
  if (body?.type !== AST_NODE_TYPES.BlockStatement) return undefined;
  const fn = body.parent;
  if (fn?.type !== AST_NODE_TYPES.ArrowFunctionExpression && fn?.type !== AST_NODE_TYPES.FunctionExpression) return undefined;
  const effect = fn.parent;
  if (!isUseEffect(effect) || effect.arguments[0] !== fn) return undefined;
  if (effect.parent?.type !== AST_NODE_TYPES.ExpressionStatement) return undefined;
  const [cb, delay, ...rest] = call.arguments;
  if (!cb || !delay || rest.length > 0 || cb.type === AST_NODE_TYPES.SpreadElement || delay.type === AST_NODE_TYPES.SpreadElement) return undefined;

  const stmts = body.body;
  let guard: TSESTree.Expression | undefined;
  let i = 0;
  const first = stmts[0];
  if (first?.type === AST_NODE_TYPES.IfStatement && !first.alternate) {
    const c = first.consequent;
    const ret = c.type === AST_NODE_TYPES.BlockStatement && c.body.length === 1 ? c.body[0] : c;
    if (ret?.type !== AST_NODE_TYPES.ReturnStatement || ret.argument) return undefined;
    guard = first.test;
    i = 1;
  }
  if (stmts.length !== i + 2 || stmts[i] !== varDecl) return undefined;
  const cleanup = stmts[i + 1];
  if (cleanup?.type !== AST_NODE_TYPES.ReturnStatement || !cleanup.argument) return undefined;
  const arg = cleanup.argument;
  if (arg.type !== AST_NODE_TYPES.ArrowFunctionExpression || arg.params.length > 0) return undefined;
  let clear: TSESTree.Node | undefined = arg.body;
  if (clear.type === AST_NODE_TYPES.BlockStatement) {
    const only = clear.body[0];
    clear = clear.body.length === 1 && only?.type === AST_NODE_TYPES.ExpressionStatement ? only.expression : undefined;
  }
  if (
    clear?.type !== AST_NODE_TYPES.CallExpression ||
    !isTimerCall(clear, "clearInterval") ||
    clear.arguments.length !== 1 ||
    clear.arguments[0]?.type !== AST_NODE_TYPES.Identifier ||
    clear.arguments[0].name !== id
  ) {
    return undefined;
  }
  return { statement: effect.parent, callback: cb, delay, guard };
}

const LOOSE = new Set<string>([
  AST_NODE_TYPES.ConditionalExpression,
  AST_NODE_TYPES.AssignmentExpression,
  AST_NODE_TYPES.SequenceExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.YieldExpression,
]);

function operand(source: TSESLint.SourceCode, node: TSESTree.Node): string {
  const text = source.getText(node);
  return LOOSE.has(node.type) ? `(${text})` : text;
}

export default createRule({
  name: "prefer-use-interval",
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer `useInterval` / `useAnimationFrame` over `setInterval` in console components.",
      recommended: true,
    },
    messages: {
      preferUseInterval:
        "Use useInterval(callback, delay) instead of setInterval in a component: it clears itself, always calls the latest callback and stops on `null`. For animation, useAnimationFrame runs on the renderer's frame pacing and stops while output is paused.",
      rewrite: "Rewrite this effect as useInterval().",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const imports = textjsImports(context);
    if (!imports.isConsole) return {};
    const source = context.sourceCode;
    return {
      CallExpression(node) {
        const id = isTimerCall(node, "setInterval");
        if (!id || !isGlobal(context, id)) return;
        if (!enclosingComponent(node)) return;
        const rewrite = matchEffect(node);
        const ensured = rewrite ? ensureImport(context, imports, "useInterval") : null;
        context.report({
          node: node.callee,
          messageId: "preferUseInterval",
          suggest:
            rewrite && ensured
              ? [
                  {
                    messageId: "rewrite",
                    fix(fixer) {
                      const delayText = rewrite.guard
                        ? `${operand(source, rewrite.guard)} ? null : ${operand(source, rewrite.delay)}`
                        : source.getText(rewrite.delay);
                      const fixes: TSESLint.RuleFix[] = [
                        fixer.replaceText(rewrite.statement, `${ensured.local}(${source.getText(rewrite.callback)}, ${delayText});`),
                      ];
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
