import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule, moduleExports, propertyName, routeFileKind, staticString, unwrapTs } from "../utils.ts";

type Options = [{ appDir?: string }];
type MessageIds =
  | "ignored"
  | "both"
  | "notObject"
  | "asyncGenerate"
  | "generateNotFunction"
  | "titleType"
  | "titleObjectKey"
  | "titleNoDefault"
  | "templateNoPlaceholder"
  | "templateInPage"
  | "descriptionType";

const TITLE_KEYS = new Set(["default", "template", "absolute"]);

function isFunction(node: TSESTree.Node | undefined): node is TSESTree.FunctionLike {
  return (
    node?.type === AST_NODE_TYPES.FunctionDeclaration || node?.type === AST_NODE_TYPES.FunctionExpression || node?.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Literal-ish nodes whose runtime type is known (`"x"`, `1`, `[]`, `{}` …). */
function literalType(node: TSESTree.Node | undefined): string | undefined {
  if (!node) return undefined;
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return node.value === null ? "null" : "regex" in node ? "RegExp" : typeof node.value;
    case AST_NODE_TYPES.TemplateLiteral:
      return "string";
    case AST_NODE_TYPES.ArrayExpression:
      return "array";
    case AST_NODE_TYPES.ObjectExpression:
      return "object";
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      return "function";
    default:
      return undefined;
  }
}

export default createRule<Options, MessageIds>({
  name: "valid-metadata",
  meta: {
    type: "problem",
    docs: {
      description: "Validate `metadata` and `generateMetadata` exports in App Router files.",
      recommended: true,
    },
    messages: {
      ignored: "`{{name}}` is only read from layout, page and not-found files; it has no effect in {{file}}.",
      both: "Export either `metadata` or `generateMetadata`, not both (`generateMetadata` wins and `metadata` is only a fallback if it throws).",
      notObject: "`metadata` must be an object (`{ title, description }`).",
      asyncGenerate: "generateMetadata() is called synchronously; a returned Promise is ignored and the title never updates. Return the metadata object directly.",
      generateNotFunction: "`generateMetadata` must be a function.",
      titleType: "`title` must be a string or `{ default, template?, absolute? }`.",
      titleObjectKey: "Unknown `title` key `{{key}}`; use `default`, `template` or `absolute`.",
      titleNoDefault: "A `title` object needs `default` (or `absolute`) for this segment's own title.",
      templateNoPlaceholder: 'title.template has no "%s": every child title would be replaced by "{{template}}".',
      templateInPage: "title.template only applies to child segments; in {{file}} it has no effect. Move it to a layout.",
      descriptionType: "`description` must be a string.",
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
    if (!kind || kind === "route") return {};
    const file = context.filename.replace(/\\/g, "/").split("/").pop() ?? kind;
    const reads = kind === "layout" || kind === "page" || kind === "not-found";

    function checkMetadata(obj: TSESTree.ObjectExpression): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const key = propertyName(prop);
        const value = unwrapTs(prop.value);
        if (key === "description") {
          const t = literalType(value);
          if (t !== undefined && t !== "string") context.report({ node: prop.value, messageId: "descriptionType" });
        } else if (key === "title") {
          if (!value) continue;
          if (value.type === AST_NODE_TYPES.ObjectExpression) checkTitle(value);
          else {
            const t = literalType(value);
            if (t !== undefined && t !== "string") context.report({ node: prop.value, messageId: "titleType" });
          }
        }
      }
    }

    function checkTitle(title: TSESTree.ObjectExpression): void {
      let hasDefault = false;
      let spread = false;
      for (const prop of title.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) {
          spread = true;
          continue;
        }
        const key = propertyName(prop);
        if (key === undefined) {
          spread = true;
          continue;
        }
        if (!TITLE_KEYS.has(key)) {
          context.report({ node: prop.key, messageId: "titleObjectKey", data: { key } });
          continue;
        }
        if (key === "default" || key === "absolute") hasDefault = true;
        const t = literalType(unwrapTs(prop.value));
        if (t !== undefined && t !== "string") context.report({ node: prop.value, messageId: "titleType" });
        if (key === "template") {
          if (kind !== "layout") context.report({ node: prop, messageId: "templateInPage", data: { file } });
          const template = staticString(unwrapTs(prop.value));
          if (template !== undefined && !template.includes("%s")) context.report({ node: prop.value, messageId: "templateNoPlaceholder", data: { template } });
        }
      }
      if (!hasDefault && !spread) context.report({ node: title, messageId: "titleNoDefault" });
    }

    function returnedObjects(fn: TSESTree.FunctionLike): TSESTree.ObjectExpression[] {
      const out: TSESTree.ObjectExpression[] = [];
      const body = fn.body;
      if (!body) return out;
      if (body.type !== AST_NODE_TYPES.BlockStatement) {
        const v = unwrapTs(body);
        if (v?.type === AST_NODE_TYPES.ObjectExpression) out.push(v);
        return out;
      }
      const walk = (n: TSESTree.Node): void => {
        if (n.type === AST_NODE_TYPES.ReturnStatement) {
          const v = unwrapTs(n.argument ?? undefined);
          if (v?.type === AST_NODE_TYPES.ObjectExpression) out.push(v);
          return;
        }
        if (isFunction(n)) return;
        for (const key of Object.keys(n) as Array<keyof typeof n>) {
          if (key === "parent") continue;
          const v = n[key] as unknown;
          if (Array.isArray(v)) {
            for (const c of v) if (c && typeof c === "object" && "type" in c) walk(c as TSESTree.Node);
          } else if (v && typeof v === "object" && "type" in v) walk(v as TSESTree.Node);
        }
      };
      walk(body);
      return out;
    }

    return {
      "Program:exit"(program: TSESTree.Program) {
        const exports = moduleExports(program).filter((e) => !e.typeOnly);
        const metadata = exports.find((e) => e.name === "metadata");
        const generate = exports.find((e) => e.name === "generateMetadata");
        if (!reads) {
          for (const e of [metadata, generate]) if (e) context.report({ node: e.node, messageId: "ignored", data: { name: e.name, file } });
          return;
        }
        if (metadata && generate) context.report({ node: generate.node, messageId: "both" });
        if (metadata) {
          const value = unwrapTs(metadata.value);
          if (value?.type === AST_NODE_TYPES.ObjectExpression) checkMetadata(value);
          else if (literalType(value) !== undefined) context.report({ node: metadata.node, messageId: "notObject" });
        }
        if (generate) {
          const value = unwrapTs(generate.value);
          if (isFunction(value)) {
            if (value.async) context.report({ node: generate.node, messageId: "asyncGenerate" });
            for (const obj of returnedObjects(value)) checkMetadata(obj);
          } else if (literalType(value) !== undefined) {
            context.report({ node: generate.node, messageId: "generateNotFunction" });
          }
        }
      },
    };
  },
});
