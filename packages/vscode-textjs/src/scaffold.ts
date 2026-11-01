/**
 * App Router scaffolding: validate a route path and generate `page`, `layout`,
 * `route`, `loading`, `error` and `not-found` files. Pure (no `vscode`).
 */

import { posix } from "node:path";

export type ScaffoldKind = "page" | "layout" | "route" | "loading" | "error" | "not-found";

export const SCAFFOLD_KINDS: readonly ScaffoldKind[] = ["page", "layout", "route", "loading", "error", "not-found"];

export const SCAFFOLD_LABELS: Record<ScaffoldKind, string> = {
  page: "Page",
  layout: "Layout",
  route: "Route Handler",
  loading: "Loading UI",
  error: "Error Boundary",
  "not-found": "Not Found Page",
};

export type Segment =
  | { kind: "static"; name: string }
  | { kind: "dynamic"; name: string }
  | { kind: "catchAll"; name: string }
  | { kind: "optionalCatchAll"; name: string }
  | { kind: "group"; name: string };

const STATIC = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function parseSegment(raw: string): Segment | null {
  let m: RegExpExecArray | null;
  if ((m = /^\[\[\.\.\.([^\]]+)\]\]$/.exec(raw))) return IDENT.test(m[1] as string) ? { kind: "optionalCatchAll", name: m[1] as string } : null;
  if ((m = /^\[\.\.\.([^\]]+)\]$/.exec(raw))) return IDENT.test(m[1] as string) ? { kind: "catchAll", name: m[1] as string } : null;
  if ((m = /^\[([^\]]+)\]$/.exec(raw))) return IDENT.test(m[1] as string) ? { kind: "dynamic", name: m[1] as string } : null;
  if ((m = /^\(([^)]+)\)$/.exec(raw))) return STATIC.test(m[1] as string) ? { kind: "group", name: m[1] as string } : null;
  return STATIC.test(raw) && raw !== "." && raw !== ".." ? { kind: "static", name: raw } : null;
}

export interface ParsedRoute {
  /** Normalized `a/[id]/b` form ("" for the app root). */
  path: string;
  segments: Segment[];
}

/** Parse user input like `/settings/[id]`, `app/blog/[...slug]` or `(marketing)/about`. */
export function parseRouteInput(input: string): ParsedRoute | { error: string } {
  let s = input.trim().replace(/\\/g, "/");
  s = s.replace(/^\.?\/+/, "").replace(/^app(\/|$)/, "").replace(/\/+$/, "");
  if (s === "") return { path: "", segments: [] };
  const parts = s.split("/");
  const segments: Segment[] = [];
  const params = new Set<string>();
  for (const [i, p] of parts.entries()) {
    if (p === "") return { error: "Remove the empty segment (`//`)." };
    const seg = parseSegment(p);
    if (!seg) return { error: `"${p}" is not a valid segment. Use letters, digits, - _ . or [param], [...slug], (group).` };
    if (seg.kind === "dynamic" || seg.kind === "catchAll" || seg.kind === "optionalCatchAll") {
      if (params.has(seg.name)) return { error: `The parameter "${seg.name}" is used twice.` };
      params.add(seg.name);
      if ((seg.kind === "catchAll" || seg.kind === "optionalCatchAll") && i !== parts.length - 1) return { error: "Catch-all segments must be last." };
    }
    segments.push(seg);
  }
  return { path: parts.join("/"), segments };
}

/** The URL pattern for segments (`/blog/[slug]`), groups removed. */
export function urlPattern(segments: readonly Segment[]): string {
  const parts = segments.filter((s) => s.kind !== "group").map((s) => (s.kind === "static" ? s.name : s.kind === "dynamic" ? `[${s.name}]` : s.kind === "catchAll" ? `[...${s.name}]` : `[[...${s.name}]]`));
  return `/${parts.join("/")}`;
}

function pascal(words: string): string {
  return words
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join("");
}

function titleCase(words: string): string {
  return words
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface ScaffoldOptions {
  /** Emit TypeScript (default `true`). */
  typescript?: boolean;
}

export interface ScaffoldResult {
  /** Path relative to the project root (`app/settings/page.tsx`). */
  file: string;
  content: string;
  /** Zero-based line/column to place the cursor. */
  cursor: { line: number; character: number };
}

function paramsType(segments: readonly Segment[]): string | null {
  const fields: string[] = [];
  for (const s of segments) {
    if (s.kind === "dynamic") fields.push(`${s.name}: string`);
    else if (s.kind === "catchAll") fields.push(`${s.name}: string[]`);
    else if (s.kind === "optionalCatchAll") fields.push(`${s.name}?: string[]`);
  }
  return fields.length > 0 ? `{ ${fields.join("; ")} }` : null;
}

function names(segments: readonly Segment[]): { base: string; title: string } {
  const statics = segments.filter((s) => s.kind === "static");
  const last = statics[statics.length - 1];
  if (!last) {
    const dyn = segments.find((s) => s.kind !== "group");
    return dyn ? { base: pascal(dyn.name), title: titleCase(dyn.name) } : { base: "", title: "Home" };
  }
  return { base: pascal(last.name), title: titleCase(last.name) };
}

function locate(content: string, marker: string): { content: string; cursor: { line: number; character: number } } {
  const i = content.indexOf(marker);
  if (i < 0) return { content, cursor: { line: 0, character: 0 } };
  const before = content.slice(0, i);
  const line = before.split("\n").length - 1;
  const character = i - before.lastIndexOf("\n") - 1;
  return { content: content.slice(0, i) + content.slice(i + marker.length), cursor: { line, character } };
}

const CURSOR = "$CURSOR$";

/** Generate the file for `kind` at the parsed route. */
export function scaffold(kind: ScaffoldKind, route: ParsedRoute, options: ScaffoldOptions = {}): ScaffoldResult {
  const ts = options.typescript ?? true;
  const ext = kind === "route" ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx";
  const file = posix.join("app", route.path, `${kind}.${ext}`);
  const { base, title } = names(route.segments);
  const pattern = urlPattern(route.segments);
  const params = paramsType(route.segments);
  const rel = posix.join("app", route.path, `${kind}.${ext}`);
  const R = ts ? ": ReactNode" : "";
  const reactImport = ts ? 'import type { ReactNode } from "react";\n' : "";
  let body: string;

  switch (kind) {
    case "page": {
      const name = `${base || "Home"}Page`;
      const imports = ["Box", "Text", "useTheme"];
      const typeImports = ts ? [...(params ? ["type PageProps"] : []), "type Metadata"] : [];
      const sig = params ? (ts ? `{ params }: PageProps<${params}>` : "{ params }") : "";
      const paramLine = params ? `\n      <Text color={theme.subtle}>{JSON.stringify(params)}</Text>` : "";
      body = `${reactImport}import { ${[...imports, ...typeImports].join(", ")} } from "@textjs/app";

export const metadata${ts ? ": Metadata" : ""} = { title: ${JSON.stringify(title)} };

export default function ${name}(${sig})${R} {
  const theme = useTheme();
  return (
    <Box className="flex-col gap-1">
      <Text bold color={theme.fg}>
        ${CURSOR}${title}
      </Text>
      <Text color={theme.muted}>Get started by editing ${rel}.</Text>${paramLine}
    </Box>
  );
}
`;
      break;
    }
    case "layout": {
      const name = `${base || "Root"}Layout`;
      const sig = ts ? `{ children }: LayoutProps${params ? `<${params}>` : ""}` : "{ children }";
      body = `${reactImport}import { Box, Text, useTheme${ts ? ", type LayoutProps" : ""} } from "@textjs/app";

export default function ${name}(${sig})${R} {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-2 shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ${CURSOR}${route.path === "" ? "▼ App" : title}
        </Text>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
    </Box>
  );
}
`;
      break;
    }
    case "route": {
      const ctx = params ? (ts ? `, { params }: { params: ${params} }` : ", { params }") : "";
      const req = ts ? "request: Request" : "request";
      body = `// ${pattern}
export async function GET(${req}${ctx})${ts ? ": Promise<Response>" : ""} {
  ${CURSOR}return Response.json({ ok: true${params ? ", params" : ""}, url: new URL(request.url).pathname });
}

export async function POST(${req}${ctx})${ts ? ": Promise<Response>" : ""} {
  const body = await request.json();
  return Response.json({ received: body }, { status: 201 });
}
`;
      break;
    }
    case "loading":
      body = `${reactImport}import { Box, Spinner } from "@textjs/app";

export default function Loading()${R} {
  return (
    <Box className="flex-col grow items-center justify-center">
      <Spinner label="${CURSOR}Loading ${title === "Home" ? "" : `${title.toLowerCase()} `}…" />
    </Box>
  );
}
`;
      break;
    case "error":
      body = `${reactImport}import { Box, Text, useInput, useTheme${ts ? ", type ErrorComponentProps" : ""} } from "@textjs/app";

export default function ${base || "App"}Error({ error, reset }${ts ? ": ErrorComponentProps" : ""})${R} {
  const theme = useTheme();
  useInput((e) => {
    if (e.input === "r") reset();
  });
  return (
    <Box className="flex-col gap-1 border rounded px-1" borderColor={theme.danger}>
      <Text bold color={theme.danger}>
        ${CURSOR}Something went wrong
      </Text>
      <Text color={theme.muted}>{error.message}</Text>
      <Text color={theme.subtle}>r retry</Text>
    </Box>
  );
}
`;
      break;
    case "not-found":
      body = `${reactImport}import { Box, Text, useTheme } from "@textjs/app";
import Link from "@textjs/app/link";

export default function NotFound()${R} {
  const theme = useTheme();
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Text color={theme.muted}>${CURSOR}404 │ This page could not be found.</Text>
      <Link href="/" autoFocus>
        Go home
      </Link>
    </Box>
  );
}
`;
      break;
  }
  const { content, cursor } = locate(body, CURSOR);
  return { file, content, cursor };
}

/** Warnings for a new file next to existing ones (e.g. `page` + `route` in one segment). */
export function scaffoldConflict(kind: ScaffoldKind, siblings: readonly string[]): string | null {
  const has = (base: string): boolean => siblings.some((f) => /^(.+)\.(tsx|ts|jsx|js)$/.exec(f)?.[1] === base);
  if (has(kind)) return `This segment already has a ${kind} file.`;
  if (kind === "route" && has("page")) return "A route.ts can't live next to a page in the same segment.";
  if (kind === "page" && has("route")) return "A page can't live next to a route.ts in the same segment.";
  return null;
}
