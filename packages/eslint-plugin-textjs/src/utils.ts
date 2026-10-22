import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

export const DOCS_URL = "https://textjs.org/docs/eslint";

export interface TextjsDocs {
  description: string;
  /** Enabled in `configs.recommended`. */
  recommended?: boolean;
}

export const createRule = ESLintUtils.RuleCreator<TextjsDocs>((name) => `${DOCS_URL}#${name}`);

export type Context = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;

/** Packages whose components and hooks render into the console. */
const DEFAULT_PACKAGES = ["@textjs/react", "@textjs/next"];

/** Subpaths that render to the page, not the console. */
const DOM_SOURCES = [/^react-dom(\/|$)/, /^@textjs\/react\/dom$/];

export interface TextjsSettings {
  /** Extra packages that re-export Text.js components (for example a design-system wrapper). */
  packages?: string[];
  /**
   * `"imports"` (default): only files that import a value from Text.js (and not `react-dom`)
   * are treated as console components. `"all"`: every linted file is.
   */
  consoleFiles?: "imports" | "all";
}

function settingsOf(context: Context): TextjsSettings {
  const s = (context.settings as Record<string, unknown> | undefined)?.textjs;
  return s && typeof s === "object" ? (s as TextjsSettings) : {};
}

export interface TextjsImports {
  /** File renders console components (see `TextjsSettings.consoleFiles`). */
  isConsole: boolean;
  /** A test file (by name, or importing a `…/testing` entry): renders offscreen, never into the real console. */
  isTest: boolean;
  /** Local name → imported name, for value imports from Text.js packages. */
  names: Map<string, string>;
  /** Value import declarations from a Text.js main entry (`@textjs/next`, `@textjs/react`). */
  mainImports: TSESTree.ImportDeclaration[];
}

const cache = new WeakMap<TSESTree.Program, TextjsImports>();

/** PascalCase exports that are classes or contexts, not components. */
const NON_COMPONENTS = new Set(["DotCanvas", "BrailleCanvas", "FocusManager", "InputManager", "KeymapRegistry", "ToastStore", "ScopeContext"]);

/**
 * True for imports that mean "this file renders console UI": components
 * (`Box`, `Text`, …) and hooks (`useInput`, …). Utilities such as `tokenize`,
 * `parseMarkdown` or `createConsoleRoot` are also used by DOM code.
 */
function isRenderingImport(name: string): boolean {
  if (/^use[A-Z]/.test(name)) return true;
  return /^[A-Z][a-z]/.test(name) && !NON_COMPONENTS.has(name);
}

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(\/(test|tests|__tests__)\/)/;

function isTextjsSource(source: string, packages: readonly string[]): boolean {
  return packages.some((p) => source === p || source.startsWith(`${p}/`));
}

/** What a file imports from Text.js, and whether it renders console components. */
export function textjsImports(context: Context): TextjsImports {
  const program = context.sourceCode.ast;
  const hit = cache.get(program);
  if (hit) return hit;
  const settings = settingsOf(context);
  const packages = [...DEFAULT_PACKAGES, ...(settings.packages ?? [])];
  const names = new Map<string, string>();
  const mainImports: TSESTree.ImportDeclaration[] = [];
  let renders = false;
  let hasDom = false;
  let isTest = false;
  for (const stmt of program.body) {
    if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) continue;
    const source = stmt.source.value;
    if (DOM_SOURCES.some((re) => re.test(source))) {
      hasDom = true;
      continue;
    }
    if (!isTextjsSource(source, packages)) continue;
    if (/\/testing$/.test(source)) isTest = true;
    if (stmt.importKind === "type") continue;
    const main = packages.includes(source);
    let values = 0;
    for (const spec of stmt.specifiers) {
      if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
        if (spec.importKind === "type") continue;
        const imported = spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : spec.imported.value;
        names.set(spec.local.name, imported);
        values++;
        if (isRenderingImport(imported)) renders = true;
      } else if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
        // `import Link from "@textjs/next/link"`
        if (/\/link$/.test(source)) {
          names.set(spec.local.name, "Link");
          renders = true;
        }
        values++;
      } else {
        values++;
        renders = true;
      }
    }
    if (main && values > 0 && stmt.specifiers.every((s) => s.type === AST_NODE_TYPES.ImportSpecifier)) mainImports.push(stmt);
  }
  const isConsole = settings.consoleFiles === "all" ? true : renders && !hasDom;
  if (TEST_FILE.test(context.filename.replace(/\\/g, "/"))) isTest = true;
  const result: TextjsImports = { isConsole, isTest, names, mainImports };
  cache.set(program, result);
  return result;
}

/** The Text.js export a JSX element name refers to (`undefined` for user components and DOM tags). */
export function resolveJsxName(name: TSESTree.JSXTagNameExpression, imports: TextjsImports): string | undefined {
  if (name.type === AST_NODE_TYPES.JSXIdentifier) return imports.names.get(name.name);
  return undefined;
}

/** The Text.js export a callee refers to (`useInput(…)`, or `useInterval` aliased on import). */
export function resolveCallee(callee: TSESTree.Expression, imports: TextjsImports): string | undefined {
  if (callee.type === AST_NODE_TYPES.Identifier) return imports.names.get(callee.name);
  return undefined;
}

/**
 * A fixer that makes `exportName` available, returning the local name to use.
 * Adds a specifier to the first `@textjs/next` / `@textjs/react` named import.
 */
export function ensureImport(
  context: Context,
  imports: TextjsImports,
  exportName: string,
): { local: string; fix: (fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null } | null {
  for (const [local, imported] of imports.names) if (imported === exportName) return { local, fix: () => null };
  const decl = imports.mainImports[0];
  if (!decl) return null;
  // A local binding with the same name would be shadowed or redeclared.
  const scope = context.sourceCode.getScope(context.sourceCode.ast);
  if (scope.set.has(exportName) || scope.childScopes.some((s) => s.type === "module" && s.set.has(exportName))) return null;
  const last = decl.specifiers[decl.specifiers.length - 1];
  if (!last) return null;
  return { local: exportName, fix: (fixer) => fixer.insertTextAfter(last, `, ${exportName}`) };
}

/** True when `name` resolves to a global (not shadowed by a local binding or import). */
export function isGlobal(context: Context, node: TSESTree.Identifier): boolean {
  let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const v = scope.set.get(node.name);
    if (v && v.defs.length > 0) return false;
    scope = scope.upper;
  }
  return true;
}

const COMPONENT_NAME = /^[A-Z]/;
const HOOK_NAME = /^use[A-Z0-9]/;

function functionName(fn: TSESTree.FunctionLike): string | undefined {
  if ((fn.type === AST_NODE_TYPES.FunctionDeclaration || fn.type === AST_NODE_TYPES.FunctionExpression) && fn.id) return fn.id.name;
  const parent = fn.parent;
  if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) return parent.id.name;
  return undefined;
}

function isComponentWrapper(call: TSESTree.CallExpression): boolean {
  const c = call.callee;
  const name =
    c.type === AST_NODE_TYPES.Identifier
      ? c.name
      : c.type === AST_NODE_TYPES.MemberExpression && c.property.type === AST_NODE_TYPES.Identifier
        ? c.property.name
        : "";
  return name === "memo" || name === "forwardRef";
}

/** The nearest enclosing React component or hook function, if any. */
export function enclosingComponent(node: TSESTree.Node): TSESTree.FunctionLike | undefined {
  for (let n: TSESTree.Node | undefined = node.parent; n; n = n.parent) {
    if (
      n.type === AST_NODE_TYPES.FunctionDeclaration ||
      n.type === AST_NODE_TYPES.FunctionExpression ||
      n.type === AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      const name = functionName(n);
      if (name && (COMPONENT_NAME.test(name) || HOOK_NAME.test(name))) return n;
      if (n.parent?.type === AST_NODE_TYPES.CallExpression && isComponentWrapper(n.parent)) return n;
    }
  }
  return undefined;
}

/** A numeric literal value (`66`, `1_000`, `-1`), or `undefined`. */
export function numericValue(node: TSESTree.Node | undefined): number | undefined {
  if (!node) return undefined;
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "number") return node.value;
  if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === "-") {
    const v = numericValue(node.argument);
    return v === undefined ? undefined : -v;
  }
  return undefined;
}

/** A static string (`"x"` or a template literal without expressions), or `undefined`. */
export function staticString(node: TSESTree.Node | undefined | null): string | undefined {
  if (!node) return undefined;
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") return node.value;
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

export function propertyName(prop: TSESTree.Property | TSESTree.MemberExpression): string | undefined {
  const key = prop.type === AST_NODE_TYPES.Property ? prop.key : prop.property;
  const computed = prop.computed;
  if (!computed && key.type === AST_NODE_TYPES.Identifier) return key.name;
  return staticString(key);
}

// ---------------------------------------------------------------------------
// App Router files
// ---------------------------------------------------------------------------

export type RouteFileKind = "layout" | "page" | "loading" | "error" | "not-found" | "route";

const ROUTE_FILE = /^(layout|page|loading|error|not-found|route)\.(tsx|ts|jsx|js|mts|mjs)$/;

/** The App Router file kind of `filename` (`app/**\/page.tsx` → `"page"`), or `undefined`. */
export function routeFileKind(filename: string, appDir = "app"): RouteFileKind | undefined {
  const parts = filename.replace(/\\/g, "/").split("/");
  const base = parts[parts.length - 1] ?? "";
  const m = ROUTE_FILE.exec(base);
  if (!m) return undefined;
  if (!parts.slice(0, -1).includes(appDir)) return undefined;
  return m[1] as RouteFileKind;
}

export interface ModuleExport {
  name: string;
  /** The exported identifier or declaration (for reporting). */
  node: TSESTree.Node;
  /** Initializer / declaration, when statically known. */
  value?: TSESTree.Node;
  /** `export type` / interfaces never exist at runtime. */
  typeOnly: boolean;
  /** Local binding name when it differs from the exported name or is re-used. */
  local?: TSESTree.Identifier;
}

/** Every named and default export of the module, with initializers where statically known. */
export function moduleExports(program: TSESTree.Program): ModuleExport[] {
  const out: ModuleExport[] = [];
  const locals = new Map<string, TSESTree.Node>();
  for (const stmt of program.body) {
    const decl = stmt.type === AST_NODE_TYPES.ExportNamedDeclaration ? stmt.declaration : stmt;
    if (decl?.type === AST_NODE_TYPES.FunctionDeclaration && decl.id) locals.set(decl.id.name, decl);
    if (decl?.type === AST_NODE_TYPES.ClassDeclaration && decl.id) locals.set(decl.id.name, decl);
    if (decl?.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const d of decl.declarations) if (d.id.type === AST_NODE_TYPES.Identifier && d.init) locals.set(d.id.name, d.init);
    }
  }
  for (const stmt of program.body) {
    if (stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      const d = stmt.declaration;
      const value = d.type === AST_NODE_TYPES.Identifier ? (locals.get(d.name) ?? d) : d;
      out.push({ name: "default", node: stmt, value, typeOnly: d.type === AST_NODE_TYPES.TSInterfaceDeclaration });
      continue;
    }
    if (stmt.type !== AST_NODE_TYPES.ExportNamedDeclaration) continue;
    const typeOnly = stmt.exportKind === "type";
    const d = stmt.declaration;
    if (d) {
      if (d.type === AST_NODE_TYPES.FunctionDeclaration || d.type === AST_NODE_TYPES.TSDeclareFunction) {
        if (d.id) out.push({ name: d.id.name, node: d.id, value: d, typeOnly, local: d.id });
      } else if (d.type === AST_NODE_TYPES.ClassDeclaration) {
        if (d.id) out.push({ name: d.id.name, node: d.id, value: d, typeOnly, local: d.id });
      } else if (d.type === AST_NODE_TYPES.VariableDeclaration) {
        for (const v of d.declarations) {
          if (v.id.type === AST_NODE_TYPES.Identifier) out.push({ name: v.id.name, node: v.id, value: v.init ?? undefined, typeOnly, local: v.id });
        }
      } else {
        // interfaces, type aliases, enums (types) and declare namespaces
        const id = "id" in d && d.id && d.id.type === AST_NODE_TYPES.Identifier ? d.id : undefined;
        const isType = d.type === AST_NODE_TYPES.TSInterfaceDeclaration || d.type === AST_NODE_TYPES.TSTypeAliasDeclaration;
        if (id) out.push({ name: id.name, node: id, value: d, typeOnly: typeOnly || isType });
      }
      continue;
    }
    for (const spec of stmt.specifiers) {
      const exported = spec.exported.type === AST_NODE_TYPES.Identifier ? spec.exported.name : spec.exported.value;
      const localName = spec.local.type === AST_NODE_TYPES.Identifier ? spec.local.name : spec.local.value;
      out.push({
        name: exported,
        node: spec,
        value: stmt.source ? undefined : locals.get(localName),
        typeOnly: typeOnly || spec.exportKind === "type",
      });
    }
  }
  return out;
}

/** Unwrap `x as T`, `x satisfies T`, `x!` and parentheses. */
export function unwrapTs(node: TSESTree.Node | undefined): TSESTree.Node | undefined {
  let n = node;
  while (
    n &&
    (n.type === AST_NODE_TYPES.TSAsExpression || n.type === AST_NODE_TYPES.TSSatisfiesExpression || n.type === AST_NODE_TYPES.TSNonNullExpression || n.type === AST_NODE_TYPES.TSTypeAssertion)
  ) {
    n = n.expression;
  }
  return n;
}
