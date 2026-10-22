import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule, isGlobal, numericValue, propertyName, resolveCallee, textjsImports } from "../utils.ts";

/** Frames reach DevTools at most every ~66ms (~15fps); faster updates are coalesced. */
export const FRAME_INTERVAL_MS = 66;

type Options = [{ minInterval?: number }];

export default createRule<Options, "interval" | "fps">({
  name: "no-sub-frame-timers",
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow intervals faster than the console's frame pacing (~66ms, 15fps).",
      recommended: true,
    },
    messages: {
      interval:
        "A {{delay}}ms interval is faster than DevTools paints frames (one every ~{{min}}ms); the extra updates are coalesced and only burn CPU. Use useAnimationFrame (frame-paced) or a delay of at least {{min}}ms.",
      fps: "fps: {{fps}} is faster than DevTools paints frames (~{{maxFps}}fps); omit `fps` to follow the renderer's frame pacing.",
    },
    schema: [
      {
        type: "object",
        properties: { minInterval: { type: "number", minimum: 1, description: `Smallest allowed delay in ms (default ${FRAME_INTERVAL_MS}).` } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ minInterval: FRAME_INTERVAL_MS }],
  create(context, [{ minInterval = FRAME_INTERVAL_MS }]) {
    const imports = textjsImports(context);
    if (!imports.isConsole) return {};
    const maxFps = Math.floor(1000 / minInterval);

    function checkDelay(node: TSESTree.Node | undefined): void {
      const delay = numericValue(node);
      if (node && delay !== undefined && delay < minInterval) {
        context.report({ node, messageId: "interval", data: { delay: String(delay), min: String(minInterval) } });
      }
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === AST_NODE_TYPES.Identifier && callee.name === "setInterval" && isGlobal(context, callee)) {
          checkDelay(node.arguments[1]);
          return;
        }
        const name = resolveCallee(callee, imports);
        if (name === "useInterval") checkDelay(node.arguments[1]);
        else if (name === "useAnimationFrame") {
          const opts = node.arguments[1];
          if (opts?.type !== AST_NODE_TYPES.ObjectExpression) return;
          for (const p of opts.properties) {
            if (p.type !== AST_NODE_TYPES.Property || propertyName(p) !== "fps") continue;
            const fps = numericValue(p.value);
            if (fps !== undefined && fps > maxFps) context.report({ node: p, messageId: "fps", data: { fps: String(fps), maxFps: String(maxFps) } });
          }
        }
      },
    };
  },
});
