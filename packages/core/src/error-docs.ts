/**
 * Long-form documentation for every `TX###` code, rendered at
 * `https://textjs.org/errors/TX###`. Kept apart from `errors.ts` so runtime
 * bundles that only throw never include it.
 *
 * `cause` and `fix` are Markdown (`~~~` fences keep the source readable).
 */

import { errorUrl, TX_MESSAGES, type TxCode } from "./errors";

export type TxPackage = "@textjs/core" | "@textjs/react" | "@textjs/app" | "@textjs/opencode" | "create-text-app";

export const TX_PACKAGES: readonly TxPackage[] = ["@textjs/core", "@textjs/react", "@textjs/app", "@textjs/opencode", "create-text-app"];

export interface TxErrorDoc {
  code: TxCode;
  package: TxPackage;
  kind: "error" | "warning";
  /** Short, sentence-case summary used in the index and page title. */
  title: string;
  /** The message template (`%s` placeholders). */
  message: string;
  /** Why it happens (Markdown). */
  cause: string;
  /** How to fix it (Markdown, usually with a code example). */
  fix: string;
  url: string;
}

type Entry = Omit<TxErrorDoc, "code" | "message" | "url" | "kind"> & { kind?: TxErrorDoc["kind"] };

const DOCS: Record<TxCode, Entry> = {
  TX001: {
    package: "@textjs/core",
    title: "Yoga is not initialized",
    cause: `Layout runs on Yoga, which ships as WebAssembly and has to be instantiated before the first frame. Something created a scene node or root synchronously before \`initYoga()\` resolved.`,
    fix: `Use the async root helpers, which initialize Yoga for you:

~~~tsx
import { createConsoleRoot } from "@textjs/react";

const root = await createConsoleRoot();
root.render(<App />);
~~~

If you need \`createConsoleRootSync()\` or the core scene graph directly, await \`initYoga()\` once at startup:

~~~ts
import { initYoga } from "@textjs/core";

await initYoga();
~~~

Apps started with \`text dev\` never see this error.`,
  },
  TX002: {
    package: "@textjs/react",
    title: "Rendered outside a console root",
    cause: `A Text.js hook or component (\`useInput\`, \`<ScrollBox>\`, …) rendered under a React root that is not a console root, most often \`react-dom\` rendering a component meant for the console.`,
    fix: `Render console components through \`renderToConsole\` (or \`createConsoleRoot\`), not \`react-dom\`:

~~~tsx
import { renderToConsole, Box, Text } from "@textjs/react";

await renderToConsole(
  <Box padding={1}>
    <Text>Hello, DevTools.</Text>
  </Box>,
);
~~~

To show the same UI on the page, use \`<TextCanvas>\` from \`@textjs/react/dom\`, which creates its own console root.`,
  },
  TX003: {
    package: "@textjs/react",
    title: "Unknown host element",
    cause: `The reconciler only understands two intrinsic elements, \`tx-box\` and \`tx-text\`. A lowercase element such as \`<div>\` or \`<span>\` reached it.`,
    fix: `Use the exported components instead:

~~~tsx
// Before
<div style={{ padding: 1 }}>
  <span>Ready</span>
</div>

// After
<Box padding={1}>
  <Text>Ready</Text>
</Box>
~~~`,
  },
  TX004: {
    package: "@textjs/react",
    title: "<Box> nested inside <Text>",
    cause: `\`<Text>\` lays out a run of inline text; it cannot contain a Flexbox container. A \`<Box>\` (or a component that renders one, such as \`<Spacer>\` or \`<Divider>\`) was rendered inside a \`<Text>\`.`,
    fix: `Move the \`<Box>\` out and put text siblings side by side in a row:

~~~tsx
// Before
<Text>
  Status: <Box><Text color="green">ok</Text></Box>
</Text>

// After
<Box flexDirection="row">
  <Text>Status: </Text>
  <Text color="green">ok</Text>
</Box>
~~~

Nested \`<Text>\` is fine; it renders as an inline span.`,
  },
  TX005: {
    package: "@textjs/react",
    title: "Render after unmount",
    cause: `\`root.render()\` was called on a console root after \`root.unmount()\`. An unmounted root has released its renderer and input listeners.`,
    fix: `Create a new root, or keep the root mounted and render a different tree:

~~~tsx
root.unmount();
const next = await createConsoleRoot();
next.render(<App />);
~~~

In tests, check \`root.unmounted\` before rendering from async callbacks.`,
  },
  TX006: {
    package: "@textjs/react",
    title: "Unknown modifier in key combo",
    cause: `Every part of a combo before the last \`+\` must be a modifier: \`ctrl\`, \`alt\` (\`option\`), \`shift\`, \`meta\` (\`cmd\`) or \`mod\` (\`⌘\` on Apple, \`Ctrl\` elsewhere).`,
    fix: `~~~tsx
// Before
useKeymap({ "hyper+k": openPalette });

// After
useKeymap({ "mod+k": openPalette });
~~~`,
  },
  TX007: {
    package: "@textjs/react",
    title: "Unknown key in key combo",
    cause: `The last part of a combo must be a single character, a named key (\`enter\`, \`escape\`, \`tab\`, \`up\`, \`pagedown\`, \`space\`, …) or a function key (\`f1\`–\`f12\`).`,
    fix: `~~~tsx
// Before
useKeymap({ "ctrl+return-key": submit });

// After
useKeymap({ "ctrl+enter": submit });
~~~

Sequences are space-separated strokes (\`"g g"\`). Alternatives are comma-separated (\`"j, down"\`).`,
  },
  TX008: {
    package: "@textjs/react",
    title: "Empty key combo",
    cause: `A combo ended without a key, for example \`"ctrl+"\` or \`""\`.`,
    fix: `Name the key. To bind the plus key itself, write \`"ctrl++"\`:

~~~tsx
useKeymap({ "ctrl++": zoomIn, "ctrl+-": zoomOut });
~~~`,
  },
  TX009: {
    package: "@textjs/react",
    title: "Expected a single key stroke",
    cause: `A key press is one concrete stroke. \`keyEventFromCombo()\` received a sequence such as \`"g g"\`, or the MCP \`press\` tool received alternatives such as \`"a,b"\`.`,
    fix: `Build one event per stroke. \`app.press()\` in tests and the MCP \`press\` tool split space-separated sequences for you:

~~~tsx
await app.press("g g");

keyEventFromCombo("g");
~~~`,
  },
  TX010: {
    package: "@textjs/react",
    title: "No stdout for renderToTerminal",
    cause: `\`renderToTerminal()\` writes ANSI frames to \`process.stdout\` by default. It ran somewhere without one (a browser, a worker) and no \`stdout\` option was passed.`,
    fix: `Run it under Bun or Node, or pass a writable stream:

~~~ts
import { renderToTerminal } from "@textjs/react/terminal";

await renderToTerminal(<App />, { stdout: process.stdout, stdin: process.stdin });
~~~

In the browser, use \`renderToConsole\` instead.`,
  },
  TX011: {
    package: "@textjs/react",
    title: "<Image src> without a DOM",
    cause: `\`<Image src>\` decodes images through an \`<img>\` and a canvas. There is no \`document\` here (terminal, server, tests), so the URL cannot be loaded.`,
    fix: `Decode the image yourself and pass RGBA pixels:

~~~tsx
<Image pixels={{ width: 64, height: 64, data: rgba }} width={32} />
~~~`,
  },
  TX012: {
    package: "@textjs/react",
    title: "No 2D canvas for <Image>",
    cause: `The browser refused a \`2d\` canvas context, usually because a policy or a fingerprinting shield disables canvas, or the page is out of GPU memory.`,
    fix: `Pass \`pixels\` decoded elsewhere, or render an \`alt\` fallback. \`<Image>\` already shows its \`alt\` text when loading fails:

~~~tsx
<Image src="/logo.png" alt="▼ Text.js" width={24} />
~~~`,
  },
  TX013: {
    package: "@textjs/react",
    title: "<Image> failed to load",
    cause: `The image request failed: a 404, a network error, or a cross-origin server that does not send \`Access-Control-Allow-Origin\`. Pixels are read from a canvas, so cross-origin images need CORS.`,
    fix: `Serve the image from your own origin (\`public/\`), or enable CORS on the image host:

~~~tsx
<Image src="/avatar.png" width={16} />
~~~

~~~http
Access-Control-Allow-Origin: *
~~~`,
  },
  TX014: {
    package: "@textjs/app",
    title: "Used outside <AppRouter>",
    cause: `\`useRouter\`, \`usePathname\`, \`useParams\`, \`useSearchParams\`, \`useAppTheme\` and \`<Link>\` read state that \`<AppRouter>\` provides. The component rendered outside of it, usually in a standalone \`renderToConsole\` call or a unit test.`,
    fix: `Run the app with \`text dev\`, \`text start\` or \`text run\`, which mount \`<AppRouter>\` for you. When rendering by hand (tests, embeds), mount the router instead of the page:

~~~tsx
import { AppRouter } from "@textjs/app/router";

await renderToConsole(<AppRouter routes={routes} />);
~~~`,
  },
  TX015: {
    package: "@textjs/app",
    title: "Route file has no default component",
    cause: `\`page\`, \`layout\`, \`loading\`, \`error\` and \`not-found\` files must \`export default\` a React component. This one exports nothing by default, or exports something that is not a function.`,
    fix: `~~~tsx@app/settings/page.tsx
// Before
export function Settings() {
  return <Text>Settings</Text>;
}

// After
export default function Settings() {
  return <Text>Settings</Text>;
}
~~~`,
  },
  TX016: {
    package: "@textjs/app",
    title: "Route handler returned no Response",
    cause: `A \`route.ts\` handler resolved to \`undefined\` (or another non-\`Response\` value), typically from a missing \`return\` on one branch.`,
    fix: `Return a \`Response\` from every branch:

~~~ts@app/api/deployments/route.ts
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  return Response.json(await getDeployment(id));
}
~~~`,
  },
  TX017: {
    package: "@textjs/app",
    title: "No production build",
    cause: `\`text start\` serves the output of \`text build\`, and the output directory (\`outDir\`, default \`dist\`) has no build in it.`,
    fix: `~~~bash
text build
text start
~~~

If you changed \`outDir\` in \`text.config.ts\`, run both commands from the same project root.`,
  },
  TX018: {
    package: "@textjs/app",
    title: "No app/ directory",
    cause: `\`text run\` renders the App Router in your terminal and could not find the routes directory.`,
    fix: `Run it from the project root, or pass the project directory:

~~~bash
text run ./my-app
~~~`,
  },
  TX019: {
    package: "@textjs/app",
    title: "text run / text mcp require Bun",
    cause: `\`text run\` and \`text mcp\` import your \`.tsx\` route files directly, which needs Bun's native TypeScript loader. Started with Node, the CLI re-runs itself with Bun when \`bun\` is on the \`PATH\`; this error means it is not.`,
    fix: `Install [Bun](https://bun.sh), or run the command with Bun directly:

~~~bash
bunx --bun text run
bunx --bun text mcp
~~~

\`text dev\`, \`text build\` and \`text start\` work on Node.`,
  },
  TX020: {
    package: "@textjs/app",
    title: "Unknown CLI command",
    cause: `The \`text\` CLI has six commands: \`dev\`, \`build\`, \`start\`, \`run\`, \`proxy\` and \`mcp\`.`,
    fix: `~~~bash
text --help
~~~

There is no \`text deploy\`. Build for your platform with \`text build --adapter <name>\` and deploy the output with the platform's CLI. See [Deploying](/docs/deploying).`,
  },
  TX021: {
    package: "@textjs/opencode",
    title: "Invalid OpenCode server URL",
    cause: `\`--target\` (or \`OPENCODE_SERVER_URL\`) must be a bare HTTP(S) origin. It contained a path, query, hash or credentials. Credentials in URLs end up in logs and browser history.`,
    fix: `~~~bash
# Before
bunx @textjs/opencode@latest proxy --target http://user:pass@127.0.0.1:4096/api

# After
bunx @textjs/opencode@latest proxy --target http://127.0.0.1:4096
~~~

Set the server password with \`OPENCODE_PASSWORD\` instead.`,
  },
  TX022: {
    package: "@textjs/opencode",
    title: "Bridge port collides with OpenCode",
    cause: `The bridge was asked to listen on the same local port as the OpenCode server it proxies to.`,
    fix: `~~~bash
bunx @textjs/opencode@latest proxy --port 4097
~~~`,
  },
  TX023: {
    package: "@textjs/opencode",
    title: "Bridge already running",
    cause: `Another bridge (\`bunx @textjs/opencode@latest proxy\` or \`text proxy\`) already listens on this port. You can connect to it instead of starting another.`,
    fix: `Connect to the running bridge, or start a second one on another port:

~~~bash
bunx @textjs/opencode@latest proxy --port 4097
~~~`,
  },
  TX024: {
    package: "@textjs/opencode",
    title: "Bridge port in use",
    cause: `Something other than a Text.js bridge is listening on the requested port.`,
    fix: `~~~bash
bunx @textjs/opencode@latest proxy --port 4097
~~~

Or find the other process: \`lsof -i :4096\`.`,
  },
  TX025: {
    package: "create-text-app",
    title: "Unknown template",
    cause: `\`--template\` must name one of the bundled templates: \`starter\`, \`dashboard\` or \`opencode\`.`,
    fix: `~~~bash
bunx create-text-app my-app --template dashboard
~~~`,
  },
  TX026: {
    package: "create-text-app",
    title: "Target directory is not empty",
    cause: `create-text-app only scaffolds into a new or empty directory so it never overwrites your files. A \`.git\` directory and editor folders (\`.vscode\`, \`.idea\`) are fine.`,
    fix: `Choose a new directory name:

~~~bash
bunx create-text-app my-console-app
~~~`,
  },
  TX027: {
    package: "create-text-app",
    title: "Invalid project name",
    cause: `The directory name becomes the \`package.json\` name, which must be a valid npm package name: lowercase, URL-friendly, at most 214 characters, and not one of \`textjs\`, \`react\`, \`react-dom\`, \`node_modules\` or \`favicon.ico\`.`,
    fix: `~~~bash
# Before
bunx create-text-app "My App"

# After
bunx create-text-app my-app
~~~`,
  },
  TX028: {
    package: "@textjs/app",
    title: "Blocked host",
    cause: `\`text dev\`, and \`text start\` while bound to loopback (the default), only answer requests addressed to \`localhost\`, a \`*.localhost\` name or an IP address. This protects them from DNS rebinding. A request arrived with another \`Host\` header, typically through a tunnel, a reverse proxy or a LAN hostname.`,
    fix: `Allow the host in \`text.config.ts\`. \`text dev\` reads Vite's \`vite.server.allowedHosts\`, and \`text start\` reads \`server.allowedHosts\`. A leading \`.\` allows subdomains:

~~~ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  // text dev
  vite: { server: { allowedHosts: ["my-laptop.local", ".ngrok.app"] } },
  // text start
  server: { allowedHosts: [".example.com"] },
});
~~~

\`text start --host\` with any address other than loopback skips the check. See [Behind a proxy](/docs/deploying#behind-a-proxy).`,
  },
  TX029: {
    package: "@textjs/app",
    kind: "warning",
    title: "Unknown text.config option",
    cause: `\`text.config.ts\` exported a key Text.js does not read, usually a typo (\`basepath\` for \`basePath\`) or a Vite option at the top level.`,
    fix: `Fix the spelling, or move Vite options under \`vite\`:

~~~ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  basePath: "/console",
  vite: { server: { open: true } },
});
~~~

\`defineConfig\` type-checks the config and catches these in your editor.`,
  },
  TX030: {
    package: "@textjs/app",
    title: "Server-rendered routes need a long-lived server",
    cause: `A page exports \`runtime = "server"\`: it renders on the server and streams frames to each open tab over a session that lives as long as the tab. Static hosts, Vercel Functions and Cloudflare Workers can't keep those sessions, so \`text build --adapter static|vercel|cloudflare\` refuses the app instead of shipping routes that can't render.`,
    fix: `Deploy with a server that stays up:

~~~bash
text build --adapter bun
bun dist/server.js

# or
text build && text start
~~~

Or render the route in the browser by removing the export:

~~~tsx@app/ops/page.tsx
// Before
export const runtime = "server";

// After: the default client runtime
~~~`,
  },
  TX031: {
    package: "@textjs/app",
    title: "Invalid dynamic export",
    cause: `A route handler exports \`dynamic\` with a value Text.js does not support. Next.js also accepts \`"error"\`, which renders the route statically and fails the build if it reads request data. Text.js can't detect request reads, so it rejects \`"error"\`.`,
    fix: `Use \`"force-static"\` to cache the handler. A cached handler receives a request with no query string, headers, cookies or body:

~~~ts@app/api/posts/route.ts
// Before
export const dynamic = "error";

// After
export const dynamic = "force-static";
~~~

Use \`"force-dynamic"\`, or remove the export, if the handler reads the request. See [Caching](/docs/caching).`,
  },
  TX032: {
    package: "@textjs/core",
    title: "Yoga's WebAssembly failed to load",
    cause: `\`initYoga()\` loads Yoga's WebAssembly from a \`.wasm\` file in Text.js apps (\`text dev\`, \`text build\`), in builds that set the \`@textjs/wasm-asset\` resolve condition, and when you pass \`initYoga({ wasm })\`. The request failed, returned an error status, or what came back wasn't valid WebAssembly. The error names the URL and the \`Content-Type\` the server sent. The usual causes are a server that answers the \`.wasm\` URL with an HTML fallback page, and a Content Security Policy without \`'wasm-unsafe-eval'\` in \`script-src\`.`,
    fix: `Make the URL from the error return the file, with \`Content-Type: application/wasm\` so it compiles while it downloads. A rewrite that serves \`index.html\` for unknown paths has to skip \`/assets/\`. Allow WebAssembly in your Content Security Policy:

~~~text
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'
~~~

If you mount the console yourself and serve the file from somewhere else, call \`initYoga()\` with its URL, its bytes or a compiled \`WebAssembly.Module\` before \`createConsoleRoot()\`. Only the first call loads Yoga:

~~~ts
import { initYoga } from "@textjs/core";

await initYoga({ wasm: "/yoga.wasm" });
~~~

See [WebAssembly](/docs/deploying#webassembly).`,
  },
};

export const TX_ERRORS: readonly TxErrorDoc[] = (Object.keys(TX_MESSAGES) as TxCode[]).map((code) => {
  const d = DOCS[code];
  return { code, kind: d.kind ?? "error", package: d.package, title: d.title, message: TX_MESSAGES[code], cause: d.cause, fix: d.fix, url: errorUrl(code) };
});

export function getTxError(code: string): TxErrorDoc | undefined {
  return TX_ERRORS.find((e) => e.code === code);
}
