import { describe, expect, test } from "bun:test";
import { parseRouteInput, parseSegment, scaffold, scaffoldConflict, SCAFFOLD_KINDS, urlPattern, type ParsedRoute } from "../src/scaffold";

const route = (input: string): ParsedRoute => {
  const r = parseRouteInput(input);
  if ("error" in r) throw new Error(r.error);
  return r;
};

describe("parseRouteInput", () => {
  test("normalizes prefixes, slashes and the app/ directory", () => {
    expect(route("/settings/").path).toBe("settings");
    expect(route("app/blog/[slug]").path).toBe("blog/[slug]");
    expect(route("./app").path).toBe("");
    expect(route("  ").path).toBe("");
    expect(route("api\\users").path).toBe("api/users");
  });

  test("classifies segments", () => {
    expect(route("(shop)/items/[id]/[...rest]").segments).toEqual([
      { kind: "group", name: "shop" },
      { kind: "static", name: "items" },
      { kind: "dynamic", name: "id" },
      { kind: "catchAll", name: "rest" },
    ]);
    expect(parseSegment("[[...slug]]")).toEqual({ kind: "optionalCatchAll", name: "slug" });
  });

  test("rejects invalid input with a helpful message", () => {
    const err = (s: string): string => (parseRouteInput(s) as { error: string }).error;
    expect(err("a//b")).toContain("empty segment");
    expect(err("../etc")).toContain("not a valid segment");
    expect(err("a/[bad-name]")).toContain("not a valid segment");
    expect(err("[id]/[id]")).toContain("used twice");
    expect(err("[...a]/b")).toContain("Catch-all");
    expect(err("a b")).toContain("not a valid segment");
  });

  test("urlPattern drops groups", () => {
    expect(urlPattern(route("(marketing)/blog/[slug]").segments)).toBe("/blog/[slug]");
    expect(urlPattern([])).toBe("/");
  });
});

describe("scaffold", () => {
  test("page: path, metadata title, component name and cursor", () => {
    const r = scaffold("page", route("settings/billing-plans"));
    expect(r.file).toBe("app/settings/billing-plans/page.tsx");
    expect(r.content).toContain('import { Box, Text, useTheme, type Metadata } from "@textjs/next";');
    expect(r.content).toContain('export const metadata: Metadata = { title: "Billing Plans" };');
    expect(r.content).toContain("export default function BillingPlansPage(): ReactNode {");
    expect(r.content).not.toContain("$CURSOR$");
    const line = r.content.split("\n")[r.cursor.line] as string;
    expect(line.slice(r.cursor.character)).toBe("Billing Plans");
  });

  test("page with params gets typed PageProps", () => {
    const r = scaffold("page", route("blog/[slug]/[...rest]"));
    expect(r.content).toContain("type PageProps");
    expect(r.content).toContain("export default function BlogPage({ params }: PageProps<{ slug: string; rest: string[] }>): ReactNode {");
    expect(r.content).toContain("JSON.stringify(params)");
  });

  test("root page and layout", () => {
    expect(scaffold("page", route("")).content).toContain("export default function HomePage()");
    const layout = scaffold("layout", route(""));
    expect(layout.file).toBe("app/layout.tsx");
    expect(layout.content).toContain("export default function RootLayout({ children }: LayoutProps): ReactNode {");
    expect(layout.content).toContain("{children}");
    expect(layout.content).toContain("▼ App");
  });

  test("route handler: .ts, typed params, GET + POST", () => {
    const r = scaffold("route", route("api/users/[id]"));
    expect(r.file).toBe("app/api/users/[id]/route.ts");
    expect(r.content).toContain("// /api/users/[id]");
    expect(r.content).toContain("export async function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {");
    expect(r.content).toContain("export async function POST(");
    expect(r.content).not.toContain("ReactNode");
  });

  test("loading, error and not-found follow App Router conventions", () => {
    expect(scaffold("loading", route("logs")).content).toContain("<Spinner");
    const error = scaffold("error", route("logs"));
    expect(error.content).toContain("{ error, reset }: ErrorComponentProps");
    expect(error.content).toContain("reset()");
    const nf = scaffold("not-found", route(""));
    expect(nf.file).toBe("app/not-found.tsx");
    expect(nf.content).toContain('import Link from "@textjs/next/link";');
  });

  test("JavaScript projects get .jsx/.js without type annotations", () => {
    for (const kind of SCAFFOLD_KINDS) {
      const r = scaffold(kind, route("shop/[id]"), { typescript: false });
      expect(r.file).toMatch(kind === "route" ? /\.js$/ : /\.jsx$/);
      expect(r.content).not.toMatch(/: ReactNode|PageProps|LayoutProps|ErrorComponentProps|: Request|: Metadata|Promise<Response>/);
    }
  });

  test("every template is syntactically valid TSX", () => {
    const transpiler = new Bun.Transpiler({ loader: "tsx" });
    for (const kind of SCAFFOLD_KINDS) {
      for (const input of ["", "settings", "blog/[slug]", "(group)/docs/[[...path]]"]) {
        const r = scaffold(kind, route(input));
        expect(() => transpiler.transformSync(r.content)).not.toThrow();
        const js = scaffold(kind, route(input), { typescript: false });
        expect(() => new Bun.Transpiler({ loader: "jsx" }).transformSync(js.content)).not.toThrow();
      }
    }
  });
});

describe("scaffoldConflict", () => {
  test("detects duplicates and page/route clashes", () => {
    expect(scaffoldConflict("page", ["page.tsx"])).toContain("already has a page");
    expect(scaffoldConflict("route", ["page.tsx"])).toContain("can't live next to a page");
    expect(scaffoldConflict("page", ["route.ts"])).toContain("can't live next to a route.ts");
    expect(scaffoldConflict("layout", ["page.tsx", "loading.tsx"])).toBeNull();
    expect(scaffoldConflict("page", ["page.test.tsx"])).toBeNull();
  });
});
