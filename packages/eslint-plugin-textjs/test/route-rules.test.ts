import { describe, expect, test } from "bun:test";
import routeHandlerExports from "../src/rules/route-handler-exports.ts";
import validMetadata from "../src/rules/valid-metadata.ts";
import validRouteModule from "../src/rules/valid-route-module.ts";
import { routeFileKind } from "../src/utils.ts";
import { tester } from "./tester.ts";

describe("routeFileKind", () => {
  test("recognizes App Router files under app/", () => {
    expect(routeFileKind("/x/app/page.tsx")).toBe("page");
    expect(routeFileKind("/x/src/app/(group)/[id]/layout.jsx")).toBe("layout");
    expect(routeFileKind("C:\\x\\app\\not-found.tsx")).toBe("not-found");
    expect(routeFileKind("/x/app/api/health/route.ts")).toBe("route");
    expect(routeFileKind("/x/components/page.tsx")).toBeUndefined();
    expect(routeFileKind("/x/app/page.test.tsx")).toBeUndefined();
    expect(routeFileKind("/x/routes/page.tsx", "routes")).toBe("page");
  });
});

const PAGE = "/repo/app/page.tsx";
const LAYOUT = "/repo/app/layout.tsx";
const LOADING = "/repo/app/logs/loading.tsx";
const NOT_FOUND = "/repo/app/not-found.tsx";
const ROUTE = "/repo/app/api/health/route.ts";

tester().run("valid-route-module", validRouteModule, {
  valid: [
    { filename: PAGE, code: `export default function Page() { return null; }` },
    { filename: LAYOUT, code: `function RootLayout({ children }: any) { return children; }\nexport default RootLayout;` },
    { filename: PAGE, code: `import Link from "@textjs/next/link";\nexport default Link;` },
    { filename: PAGE, code: `export default memo(function Page() { return null; });` },
    { filename: PAGE, code: `export const dynamic = "force-dynamic";\nexport default () => null;` },
    { filename: PAGE, code: `export const dynamic = "force-static" as const;\nexport default () => null;` },
    // Not route files.
    { filename: "/repo/components/page.tsx", code: `export const x = 1;` },
    { filename: ROUTE, code: `export function GET() { return new Response(); }` },
    { filename: ROUTE, code: `export const dynamic = "force-static";\nexport function GET() { return new Response(); }` },
    { filename: ROUTE, code: `export const dynamic = process.env.STATIC ? "force-static" : "auto";\nexport function GET() { return new Response(); }` },
  ],
  invalid: [
    { filename: PAGE, code: `export function Page() { return null; }`, errors: [{ messageId: "missingDefault", data: { file: "page.tsx" }, line: 1 }] },
    { filename: LOADING, code: `export type X = 1;`, errors: [{ messageId: "missingDefault", data: { file: "loading.tsx" } }] },
    { filename: LAYOUT, code: `export default <Box />;`, errors: [{ messageId: "notComponent", data: { file: "layout.tsx", kind: "JSX element (wrap it in a function)" } }] },
    { filename: NOT_FOUND, code: `const NotFound = { title: "x" };\nexport default NotFound;`, errors: [{ messageId: "notComponent", data: { file: "not-found.tsx", kind: "object" } }] },
    { filename: PAGE, code: `export const dynamic = "dynamic";\nexport default () => null;`, errors: [{ messageId: "dynamicValue" }] },
    // Next.js's "error" is rejected at runtime with TX031.
    { filename: PAGE, code: `export const dynamic = "error";\nexport default () => null;`, errors: [{ messageId: "dynamicValue" }] },
    { filename: ROUTE, code: `export const dynamic = "error";\nexport function GET() { return new Response(); }`, errors: [{ messageId: "dynamicValue" }] },
    {
      filename: PAGE,
      code: `const mode = "force-dynamic";\nexport const dynamic = mode;\nexport let other = 1;\nexport default () => null;`,
      errors: [{ messageId: "dynamicNotLiteral" }],
    },
    { filename: PAGE, code: `export const dynamic: string = "force-dynamic";\nexport default () => null;`, errors: [{ messageId: "dynamicNotLiteral" }] },
    { filename: PAGE, code: "export const dynamic = `force-dynamic`;\nexport default () => null;", errors: [{ messageId: "dynamicNotLiteral" }] },
    { filename: LOADING, code: `export const dynamic = "force-dynamic";\nexport default () => null;`, errors: [{ messageId: "dynamicIgnored", data: { file: "loading.tsx" } }] },
  ],
});

tester().run("valid-metadata", validMetadata, {
  valid: [
    { filename: LAYOUT, code: `export const metadata: Metadata = { title: { default: "Acme", template: "%s · Acme" }, description: "x" };` },
    { filename: PAGE, code: `export const metadata = { title: "Deployments" } satisfies Metadata;` },
    { filename: PAGE, code: `export const metadata = { title: { absolute: "Home" } };` },
    { filename: NOT_FOUND, code: `export const metadata = { title: "Not found" };` },
    { filename: PAGE, code: `export function generateMetadata({ params }: any): Metadata { return { title: \`Deployment \${params.id}\` }; }` },
    { filename: PAGE, code: `export const generateMetadata = ({ params }: any) => ({ title: String(params.id) });` },
    { filename: PAGE, code: `import { shared } from "./meta";\nexport const metadata = shared;\nexport const other = { title: 1 };` },
    { filename: LAYOUT, code: `export const metadata = { title: { ...base, template: "%s | x" }, [key]: 1 };` },
    { filename: "/repo/lib/metadata.ts", code: `export const metadata = "nope";` },
  ],
  invalid: [
    { filename: LOADING, code: `export const metadata = { title: "Loading" };`, errors: [{ messageId: "ignored", data: { name: "metadata", file: "loading.tsx" } }] },
    { filename: "/repo/app/error.tsx", code: `export function generateMetadata() { return {}; }`, errors: [{ messageId: "ignored", data: { name: "generateMetadata", file: "error.tsx" } }] },
    { filename: PAGE, code: `export const metadata = { title: "a" };\nexport function generateMetadata() { return { title: "b" }; }`, errors: [{ messageId: "both" }] },
    { filename: PAGE, code: `export const metadata = "Home";`, errors: [{ messageId: "notObject" }] },
    {
      filename: PAGE,
      code: `export async function generateMetadata({ params }: any) { const d = await load(params.id); return { title: d.name }; }`,
      errors: [{ messageId: "asyncGenerate" }],
    },
    { filename: PAGE, code: `export const generateMetadata = { title: "x" };`, errors: [{ messageId: "generateNotFunction" }] },
    { filename: PAGE, code: `export const metadata = { title: 42, description: ["a"] };`, errors: [{ messageId: "titleType" }, { messageId: "descriptionType" }] },
    {
      filename: LAYOUT,
      code: `export const metadata = { title: { default: "Acme", templat: "%s · Acme" } };`,
      errors: [{ messageId: "titleObjectKey", data: { key: "templat" } }],
    },
    { filename: LAYOUT, code: `export const metadata = { title: { template: "%s · Acme" } };`, errors: [{ messageId: "titleNoDefault" }] },
    {
      filename: LAYOUT,
      code: `export const metadata = { title: { default: "Acme", template: "Acme" } };`,
      errors: [{ messageId: "templateNoPlaceholder", data: { template: "Acme" } }],
    },
    {
      filename: PAGE,
      code: `export const metadata = { title: { default: "Home", template: "%s · Acme" } };`,
      errors: [{ messageId: "templateInPage", data: { file: "page.tsx" } }],
    },
    {
      filename: PAGE,
      code: `export function generateMetadata() { if (x) return { title: 1 }; return { title: { default: "a", absolute: 2 } }; }`,
      errors: [{ messageId: "titleType" }, { messageId: "titleType" }],
    },
  ],
});

tester().run("route-handler-exports", routeHandlerExports, {
  valid: [
    { filename: ROUTE, code: `export function GET(): Response { return Response.json({ ok: true }); }` },
    { filename: ROUTE, code: `async function forward(req: Request) { return fetch(req); }\nexport const GET = forward;\nexport const HEAD = forward;\nexport { forward as POST };` },
    { filename: ROUTE, code: `export type Body = { id: string };\nexport interface Reply {}\nexport async function DELETE() { return new Response(null, { status: 204 }); }` },
    { filename: ROUTE, code: `export const runtime = "edge";\nexport function GET() { return new Response(); }`, options: [{ allow: ["runtime"] }] },
    { filename: ROUTE, code: `export const dynamic = "force-static";\nexport const revalidate = 60;\nexport function GET() { return new Response(); }` },
    { filename: ROUTE, code: `export * from "./handlers";` },
    { filename: "/repo/lib/route.ts", code: `export const helper = 1;` },
  ],
  invalid: [
    {
      filename: ROUTE,
      code: `export function get(req: Request) { return new Response(); }\nexport const handlers = { get };`,
      errors: [
        { messageId: "methodCase", data: { name: "get", method: "GET" }, suggestions: [{ messageId: "rename", output: `export function GET(req: Request) { return new Response(); }\nexport const handlers = { GET };` }] },
        { messageId: "unknownExport", data: { name: "handlers" } },
      ],
    },
    {
      filename: ROUTE,
      code: `export const Post = async () => new Response();\nconst POST = 1;`,
      errors: [{ messageId: "methodCase", suggestions: [] }],
    },
    {
      filename: ROUTE,
      code: `export default function handler() { return new Response(); }`,
      errors: [{ messageId: "defaultExport" }, { messageId: "noHandlers" }],
    },
    { filename: ROUTE, code: `export const GET = "ok";`, errors: [{ messageId: "notFunction", data: { name: "GET" } }] },
    { filename: ROUTE, code: `export const runtime = "edge";\nexport function GET() { return new Response(); }`, errors: [{ messageId: "unknownExport", data: { name: "runtime" } }] },
    { filename: ROUTE, code: `const x = 1;`, errors: [{ messageId: "noHandlers", line: 1 }] },
  ],
});
