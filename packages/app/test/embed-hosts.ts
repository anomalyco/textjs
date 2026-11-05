/**
 * Host pages for embed tests and the CWV audit: a plain marketing page, and the
 * same page running its own React 18 app (Next.js 14's React) from an import
 * map that maps `"react"` to React 18.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export interface HostFile {
  body: string;
  type: string;
}

const JS = "text/javascript; charset=utf-8";

/** React 18's own exports, so the import map's `"react"` module has the same named exports as the package. */
const REACT_EXPORTS = Object.keys(require("react-18") as Record<string, unknown>).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== "default");

/** The host's React 18 counter and form: plain `createElement`, hooks, and a controlled input. */
const REACT18_APP = `import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
const h = React.createElement;
function HostApp() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  useEffect(() => { window.__r18Commits = (window.__r18Commits || 0) + 1; });
  return h("form", { id: "r18-form", onSubmit: (e) => { e.preventDefault(); window.__r18Submitted = name; } },
    h("button", { type: "button", id: "r18-count", onClick: () => setCount((c) => c + 1) }, "count " + count),
    h("input", { id: "r18-name", "aria-label": "name", value: name, onChange: (e) => setName(e.target.value) }),
    h("output", { id: "r18-echo" }, name),
  );
}
createRoot(document.getElementById("r18-root")).render(h(HostApp));
window.__r18Version = React.version;
`;

/** Files the React 18 host serves, by path. */
export function react18Files(): Record<string, HostFile> {
  const umd = (pkg: string, file: string): HostFile => ({ body: readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "umd", file), "utf8"), type: JS });
  return {
    "/vendor/react.production.min.js": umd("react-18", "react.production.min.js"),
    "/vendor/react-dom.production.min.js": umd("react-dom-18", "react-dom.production.min.js"),
    "/vendor/react.mjs": { body: `const R = window.React;\nexport default R;\nexport const { ${REACT_EXPORTS.join(", ")} } = R;\n`, type: JS },
    "/vendor/react-dom-client.mjs": { body: "const D = window.ReactDOM;\nexport const createRoot = D.createRoot;\nexport const hydrateRoot = D.hydrateRoot;\nexport default { createRoot, hydrateRoot };\n", type: JS },
    "/react18-app.mjs": { body: REACT18_APP, type: JS },
  };
}

/** The import map, an inline script (a policy allows it with `'unsafe-inline'` or this hash). */
export const REACT18_IMPORT_MAP = `<script type="importmap">{"imports":{"react":"/vendor/react.mjs","react-dom/client":"/vendor/react-dom-client.mjs"}}</script>`;

/**
 * `<head>` tags for the React 18 host, before any module script as import maps must be. The UMD builds are
 * deferred, and deferred scripts and modules run in document order, so the app module finds `window.React`.
 */
export const REACT18_HEAD = `<script defer src="/vendor/react.production.min.js"></script><script defer src="/vendor/react-dom.production.min.js"></script>${REACT18_IMPORT_MAP}<script type="module" src="/react18-app.mjs"></script>`;

/** Where the React 18 app mounts. */
export const REACT18_ROOT = `<div id="r18-root"></div>`;

/**
 * A stand-in for the React DevTools extension's `__REACT_DEVTOOLS_GLOBAL_HOOK__`,
 * installed before any script runs, as the extension does. It records every
 * renderer that registers, and every root it commits.
 */
export function installReactDevToolsHook(): void {
  const renderers = new Map<number, { version?: string; rendererPackageName?: string }>();
  const commits: number[] = [];
  let id = 0;
  (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers,
    supportsFiber: true,
    isDisabled: false,
    checkDCE() {},
    inject(renderer: { version?: string; rendererPackageName?: string }) {
      renderers.set(++id, renderer);
      return id;
    },
    onScheduleFiberRoot() {},
    onCommitFiberRoot(rendererId: number) {
      commits.push(rendererId);
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    setStrictMode() {},
    getFiberRoots: () => new Set(),
    __commits: commits,
  };
}

/** What registered with the hook: each renderer's package and version, and how many roots each committed. */
export function reactDevToolsRenderers(): Array<{ name: string; version: string; commits: number }> {
  const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__: { renderers: Map<number, { version?: string; rendererPackageName?: string }>; __commits: number[] } }).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  return [...hook.renderers].map(([id, r]) => ({ name: r.rendererPackageName ?? "?", version: r.version ?? "?", commits: hook.__commits.filter((c) => c === id).length }));
}
