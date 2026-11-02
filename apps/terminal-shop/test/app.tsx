import { fileURLToPath } from "node:url";
import { AppRouter, createMemoryHistory, type RouteManifest, type RouteModule, type RouteSegmentNode } from "@textjs/app/router";
import { scanApp, toStaticManifest } from "@textjs/app/vite";
import type { KeyValueStorage } from "../lib/auth";
import { resetShopStore, type ShopStore } from "../lib/store";
import { createTestRoot, type TestRoot } from "./helpers";
import { MOCK_TOKEN, startMockProxy, startMockSiteProxy, startMockTerminal, type MockProxy, type MockSiteProxy, type MockTerminal } from "./mock-terminal";
import type { StoreOptions } from "../lib/store";

const APP = fileURLToPath(new URL("..", import.meta.url));

/** The real `app/` manifest (scanner + modules), as `text dev` builds it. */
export async function loadRoutes(): Promise<RouteManifest> {
  const hydrate = async (node: RouteSegmentNode): Promise<RouteSegmentNode> => {
    const out: RouteSegmentNode = { segment: node.segment, files: node.files };
    for (const [kind, rel] of Object.entries(node.files ?? {})) {
      const mod = (await import(`${APP}/${rel}`)) as RouteModule;
      (out as unknown as Record<string, unknown>)[kind === "not-found" ? "notFound" : kind] = mod;
    }
    if (node.children) out.children = await Promise.all(node.children.map(hydrate));
    return out;
  };
  return hydrate(toStaticManifest(scanApp(APP)));
}

export function memoryStorage(seed: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

export interface Harness {
  t: TestRoot;
  api: MockTerminal;
  proxy: MockProxy | MockSiteProxy;
  store: ShopStore;
  history: ReturnType<typeof createMemoryHistory>;
  storage: ReturnType<typeof memoryStorage>;
  screen(): string;
  press(...keys: string[]): Promise<void>;
  until(text: string | RegExp, label?: string): Promise<void>;
  stop(): Promise<void>;
}

export async function mountShop(
  opts: {
    path?: string;
    signedIn?: boolean;
    email?: string | null;
    env?: Record<string, string | undefined>;
    /** Behind a textjs.org-style site proxy (session held server-side). */
    site?: { configured?: boolean; credentials?: boolean };
    store?: StoreOptions;
    /** Console size (default 80 × 30). */
    size?: { cols: number; rows: number };
  } = {},
): Promise<Harness> {
  const api = startMockTerminal({ email: opts.email });
  const proxy = opts.site ? startMockSiteProxy(api, { signedIn: opts.signedIn ?? true, configured: opts.site.configured, credentials: opts.site.credentials }) : startMockProxy(api, opts.env);
  const storage = memoryStorage(opts.signedIn === false || opts.site ? {} : { "terminal-shop:auth:dev": JSON.stringify({ kind: "token", access: MOCK_TOKEN }) });
  const store = resetShopStore({ storage, bases: [proxy.base], splashMs: 0, pollMs: 20, ...opts.store });
  const routes = await loadRoutes();
  const history = createMemoryHistory(opts.path ?? "/");
  const t = await createTestRoot({ width: opts.size?.cols ?? 80, height: opts.size?.rows ?? 30, onCaughtError: (e) => console.error(e) });
  // The shell reads `window.location` when present; tests use the memory history instead.
  await t.render(<AppRouter routes={routes} history={history} errorStore={null} documentTitle={false} />);
  const screen = (): string => t.frame();
  const h: Harness = {
    t,
    api,
    proxy,
    store,
    history,
    storage,
    screen,
    async press(...keys) {
      for (const k of keys) {
        const mods: Record<string, boolean> = {};
        let key = k;
        if (k.startsWith("shift+")) {
          mods.shiftKey = true;
          key = k.slice(6);
        }
        if (k.startsWith("ctrl+")) {
          mods.ctrlKey = true;
          key = k.slice(5);
        }
        await t.press(key, mods);
        await t.settle(5);
      }
    },
    async until(text, label) {
      await t.waitFor(() => (typeof text === "string" ? screen().includes(text) : text.test(screen())), label ?? String(text));
    },
    async stop() {
      await t.unmount();
      proxy.stop();
      api.stop();
    },
  };
  return h;
}
