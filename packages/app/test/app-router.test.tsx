import { afterEach, describe, expect, test } from "bun:test";
import { use, useState, type ReactNode } from "react";
import { Box, Input, Text, themes, useInput } from "@textjs/react";
import { AppRouter, createMemoryHistory, type ErrorComponentProps, type LayoutProps, type PageProps, type RouteManifest } from "../src/router";
import { Link } from "../src/link";
import { notFound, redirect, useParams, usePathname, useRouter, useSearchParams } from "../src/navigation";
import { connectViteHmr, DevErrorStore, devErrors, TextDevOverlay } from "../src/devtools";
import { useAppTheme } from "../src/context";
import { createTestRoot, type TestRoot } from "./helpers";

let t: TestRoot | null = null;
afterEach(async () => {
  await t?.unmount();
  t = null;
});

async function mount(routes: RouteManifest, url = "/", extra: { overlay?: boolean; store?: DevErrorStore; width?: number; height?: number } = {}) {
  const history = createMemoryHistory(url);
  const store = extra.store ?? new DevErrorStore();
  t = await createTestRoot({ width: extra.width ?? 80, height: extra.height ?? 24, onCaughtError: () => undefined });
  await t.render(
    <AppRouter routes={routes} history={history} errorStore={store} documentTitle={false} devOverlay={extra.overlay ? <TextDevOverlay store={store} /> : undefined} />,
  );
  return { t, history, store };
}

const flush = async (): Promise<void> => {
  await t?.act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

function RootLayout({ children }: LayoutProps): ReactNode {
  const pathname = usePathname();
  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Text>{`▼ ROOT ${pathname}`}</Text>
      {children}
    </Box>
  );
}

function Home(): ReactNode {
  return (
    <Box flexDirection="column">
      <Text>HOME PAGE</Text>
      <Link href="/deployments/dpl_42" autoFocus>
        Open deployment
      </Link>
    </Box>
  );
}

function Deployment(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const router = useRouter();
  useInput((e) => {
    if (e.key === "b") router.back();
    if (e.key === "n") router.push(`/deployments/${id}-next?tab=logs`);
  });
  if (id === "missing") notFound();
  if (id === "old") redirect("/deployments/new-home");
  return <Text>{`DEPLOYMENT ${id} tab=${q.get("tab") ?? "-"}`}</Text>;
}

function DeploymentsNotFound(): ReactNode {
  return <Text>DEPLOYMENT NOT FOUND</Text>;
}

function RootNotFound(): ReactNode {
  return <Text>ROOT 404</Text>;
}

const routes: RouteManifest = {
  segment: "",
  layout: { default: RootLayout, metadata: { title: { default: "Test", template: "%s · Test" } } },
  page: { default: Home, metadata: { title: "Home" } },
  notFound: { default: RootNotFound },
  children: [
    {
      segment: "deployments",
      notFound: { default: DeploymentsNotFound },
      children: [{ segment: "[id]", page: { default: Deployment as (p: PageProps) => ReactNode } }],
    },
    { segment: "docs", children: [{ segment: "[...slug]", page: { default: ({ params }: PageProps) => <Text>{`DOCS ${(params.slug as string[]).join("/")}`}</Text> } }] },
  ],
};

describe("<AppRouter>", () => {
  test("renders nested layouts and pages", async () => {
    await mount(routes, "/");
    const frame = t!.frame();
    expect(frame).toContain("▼ ROOT /");
    expect(frame).toContain("HOME PAGE");
    expect(frame).toContain("Open deployment");
  });

  test("<Link> navigates on Enter, useParams / useSearchParams read the match, router.back() returns", async () => {
    const { history } = await mount(routes, "/");
    await t!.press("Enter");
    expect(history.location.pathname).toBe("/deployments/dpl_42");
    expect(t!.frame()).toContain("DEPLOYMENT dpl_42 tab=-");
    expect(t!.frame()).toContain("▼ ROOT /deployments/dpl_42");
    await t!.press("n");
    expect(t!.frame()).toContain("DEPLOYMENT dpl_42-next tab=logs");
    expect(history.entries.map((e) => e.href)).toEqual(["/", "/deployments/dpl_42", "/deployments/dpl_42-next?tab=logs"]);
    await t!.press("b");
    expect(t!.frame()).toContain("DEPLOYMENT dpl_42 tab=-");
    await t!.act(() => history.back());
    expect(t!.frame()).toContain("HOME PAGE");
  });

  test("catch-all params", async () => {
    await mount(routes, "/docs/guides/app-router");
    expect(t!.frame()).toContain("DOCS guides/app-router");
  });

  test("unmatched URLs render the nearest not-found.tsx inside the root layout", async () => {
    await mount(routes, "/nope");
    expect(t!.frame()).toContain("▼ ROOT /nope");
    expect(t!.frame()).toContain("ROOT 404");
    await t!.unmount();
    t = null;
    await mount(routes, "/deployments/a/b");
    expect(t!.frame()).toContain("DEPLOYMENT NOT FOUND");
  });

  test("notFound() renders the segment's not-found boundary", async () => {
    await mount(routes, "/deployments/missing");
    expect(t!.frame()).toContain("DEPLOYMENT NOT FOUND");
    expect(t!.frame()).toContain("▼ ROOT /deployments/missing");
  });

  test("redirect() replaces the history entry", async () => {
    const { history } = await mount(routes, "/deployments/old");
    await flush();
    expect(history.location.pathname).toBe("/deployments/new-home");
    expect(history.entries.length).toBe(1);
    expect(t!.frame()).toContain("DEPLOYMENT new-home");
  });

  test("default 404 when the app has no not-found.tsx", async () => {
    await mount({ segment: "", page: { default: () => <Text>x</Text> } }, "/missing");
    expect(t!.frame()).toContain("404");
    expect(t!.frame()).toContain("This page could not be found.");
  });

  test("document.title follows route metadata", async () => {
    const g = globalThis as { document?: { title: string } };
    const prev = g.document;
    g.document = { title: "" };
    try {
      const history = createMemoryHistory("/");
      t = await createTestRoot({ width: 60, height: 10 });
      await t.render(<AppRouter routes={routes} history={history} errorStore={null} />);
      expect(g.document.title).toBe("Home · Test");
      await t.act(() => history.push("/deployments/x"));
      expect(g.document.title).toBe("Test");
    } finally {
      if (prev === undefined) delete g.document;
      else g.document = prev;
    }
  });
});

describe("error.tsx, loading.tsx and the root error boundary", () => {
  let shouldThrow = true;
  function Flaky(): ReactNode {
    if (shouldThrow) throw new Error("Deployment exploded");
    return <Text>RECOVERED</Text>;
  }
  function SegmentError({ error, reset }: ErrorComponentProps): ReactNode {
    useInput((e) => {
      if (e.key === "r") reset();
    });
    return <Text>{`SEGMENT ERROR: ${error.message}`}</Text>;
  }

  test("error.tsx catches render errors and reset() recovers", async () => {
    shouldThrow = true;
    const manifest: RouteManifest = {
      segment: "",
      layout: { default: RootLayout },
      page: { default: () => <Text>home</Text> },
      children: [{ segment: "flaky", error: { default: SegmentError }, page: { default: Flaky } }],
    };
    const { store } = await mount(manifest, "/flaky");
    expect(t!.frame()).toContain("SEGMENT ERROR: Deployment exploded");
    expect(t!.frame()).toContain("▼ ROOT /flaky");
    expect(store.getSnapshot().errors.length).toBe(0);
    shouldThrow = false;
    await t!.press("r");
    expect(t!.frame()).toContain("RECOVERED");
  });

  test("uncaught errors reach the Redbox; Esc dismisses; navigation recovers", async () => {
    shouldThrow = true;
    const manifest: RouteManifest = {
      segment: "",
      page: { default: () => <Text>home ok</Text> },
      children: [{ segment: "boom", page: { default: Flaky } }],
    };
    const { store, history } = await mount(manifest, "/boom", { overlay: true });
    expect(store.getSnapshot().errors[0]?.message).toBe("Deployment exploded");
    let frame = t!.frame();
    expect(frame).toContain("Unhandled Runtime Error");
    expect(frame).toContain("Error: Deployment exploded");
    expect(frame).toContain("1 of 1 error");
    expect(frame).toContain("[▼ !]");
    await t!.press("Escape");
    frame = t!.frame();
    expect(frame).not.toContain("Unhandled Runtime Error");
    expect(frame).toContain("Application error: a client-side exception has occurred");
    expect(frame).toContain("[▼ !]");
    await t!.act(() => history.push("/"));
    expect(t!.frame()).toContain("home ok");
  });

  test("loading.tsx wraps suspending pages in <Suspense>", async () => {
    let resolve: (v: string) => void = () => undefined;
    const data = new Promise<string>((r) => {
      resolve = r;
    });
    function Slow(): ReactNode {
      const v = use(data);
      return <Text>{`LOADED ${v}`}</Text>;
    }
    const manifest: RouteManifest = {
      segment: "",
      loading: { default: () => <Text>LOADING…</Text> },
      page: { default: Slow },
    };
    await mount(manifest, "/");
    expect(t!.frame()).toContain("LOADING…");
    await t!.act(async () => {
      resolve("42 rows");
      await data;
    });
    expect(t!.frame()).toContain("LOADED 42 rows");
  });

  test("lazy route modules load through Suspense", async () => {
    const manifest: RouteManifest = {
      segment: "",
      loading: { default: () => <Text>LOADING</Text> },
      page: async () => ({ default: () => <Text>LAZY PAGE</Text>, metadata: { title: "Lazy" } }),
    };
    await mount(manifest, "/");
    await flush();
    await flush();
    expect(t!.frame()).toContain("LAZY PAGE");
  });

  test("Vite HMR errors open a Build Error Redbox and clear after a successful update", async () => {
    const listeners = new Map<string, (p: unknown) => void>();
    const hot = { on: (ev: string, cb: (p: unknown) => void) => void listeners.set(ev, cb) };
    const store = new DevErrorStore();
    connectViteHmr(hot, store);
    await mount({ segment: "", page: { default: () => <Text>fine</Text> } }, "/", { overlay: true, store });
    await t!.act(() =>
      listeners.get("vite:error")?.({
        err: {
          message: "Unexpected token (3:10)",
          id: "/Users/you/app/page.tsx",
          loc: { file: "/Users/you/app/page.tsx", line: 3, column: 10 },
          frame: "1 | export default function Page() {\n2 |   return (\n3 |     <Text>{</Text>\n  |           ^",
          plugin: "vite:esbuild",
          stack: "",
        },
      }),
    );
    const frame = t!.frame();
    expect(frame).toContain("Build Error");
    expect(frame).toContain("Unexpected token (3:10)");
    expect(frame).toContain("page.tsx:3:10");
    expect(frame).toContain("3 |     <Text>{</Text>");
    expect(frame).toContain("plugin: vite:esbuild");
    await t!.act(() => listeners.get("vite:beforeUpdate")?.({}));
    expect(t!.frame()).not.toContain("Build Error");
    expect(t!.frame()).toContain("[▼]");
  });
});

describe("production builds", () => {
  async function inProduction(fn: () => Promise<void>): Promise<void> {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await fn();
    } finally {
      if (prev === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev;
    }
  }
  const render = async (page: () => ReactNode, devOverlay: ReactNode | boolean): Promise<void> => {
    t = await createTestRoot({ width: 60, height: 8, onCaughtError: () => undefined });
    await t.render(<AppRouter routes={{ segment: "", page: { default: page } }} history={createMemoryHistory("/")} documentTitle={false} devOverlay={devOverlay} />);
  };

  test("devOverlay={true} draws no [▼] pill", async () => {
    await inProduction(async () => {
      await render(() => <Text>prod home</Text>, true);
      expect(t!.frame()).toContain("prod home");
      expect(t!.frame()).not.toContain("[▼]");
    });
  });

  test("errors don't reach the global Redbox store", async () => {
    await inProduction(async () => {
      const before = devErrors.getSnapshot().errors.length;
      await render(() => {
        throw new Error("prod exploded");
      }, true);
      expect(t!.frame()).toContain("Application error: a client-side exception has occurred");
      expect(devErrors.getSnapshot().errors.length).toBe(before);
    });
  });

  test("an explicit devOverlay={<TextDevOverlay />} still renders", async () => {
    await inProduction(async () => {
      // Its own store, so errors other tests left in the global one can't open a Redbox over the pill.
      await render(() => <Text>prod home</Text>, <TextDevOverlay store={new DevErrorStore()} />);
      expect(t!.lines().at(-1)?.startsWith("[▼]")).toBe(true);
    });
  });
});

describe("theme", () => {
  test("the App Router and the root share one theme, so root chrome follows theme changes", async () => {
    let shell: ReturnType<typeof useAppTheme> | null = null;
    function Page(): ReactNode {
      shell = useAppTheme();
      return <Text>{shell.theme.name}</Text>;
    }
    const history = createMemoryHistory("/");
    t = await createTestRoot({ width: 40, height: 4 });
    await t.render(<AppRouter routes={{ segment: "", page: { default: Page } }} history={history} errorStore={null} documentTitle={false} theme="tokyoNight" />);
    expect(t.root.getTheme().id).toBe(themes.tokyoNight.id);
    await t.act(() => shell!.setTheme("geistLight"));
    expect(t.root.getTheme().id).toBe(themes.geistLight.id);
    expect(t.frame()).toContain(themes.geistLight.name);
    await t.act(() => t!.root.setTheme("amberCrt"));
    expect(shell!.theme.id).toBe(themes.amberCrt.id);
    await t.act(() => shell!.cycleTheme());
    expect(t.root.getTheme().id).toBe(shell!.theme.id);
    expect(shell!.theme.id).not.toBe(themes.amberCrt.id);
  });
});

describe("<TextDevOverlay>", () => {
  function Settings(): ReactNode {
    const shell = useAppTheme();
    const [typed, setTyped] = useState("");
    return (
      <Box flexDirection="column">
        <Text>{`THEME ${shell.theme.name}`}</Text>
        <Input value={typed} onChange={setTyped} autoFocus placeholder="type" />
      </Box>
    );
  }
  const manifest: RouteManifest = {
    segment: "",
    page: { default: () => <Text>home</Text> },
    children: [{ segment: "projects", children: [{ segment: "[slug]", page: { default: Settings, metadata: { title: "Project" } } }] }],
  };

  test("renders the [▼] pill and toggles the inspector with F2 and Ctrl+`", async () => {
    await mount(manifest, "/projects/acme", { overlay: true, width: 100, height: 30 });
    let lines = t!.lines();
    expect(lines[lines.length - 1]?.startsWith("[▼]")).toBe(true);
    expect(t!.frame()).not.toContain("Dev Overlay");

    await t!.press("F2");
    let frame = t!.frame();
    expect(frame).toContain("Dev Overlay · Turbolog");
    // "Text.js DevTools" is the Chrome extension's name.
    expect(frame).not.toContain("DevTools");
    expect(frame).toContain("ƒ Dynamic");
    expect(frame).toContain("/projects/[slug]");
    expect(frame).toContain('{ slug: "acme" }');
    expect(frame).toContain("Project");
    expect(frame).toContain("100×30 cells");
    expect(frame).toContain("%c spans");

    // Inspector traps input: typing "t" cycles the theme instead of reaching the <Input>.
    await t!.press("t");
    frame = t!.frame();
    expect(frame).toContain("THEME Geist Light");
    await t!.press("w");
    expect(t!.frame()).toContain("┌devtools");
    await t!.press("w");
    expect(t!.frame()).not.toContain("┌devtools");
    expect(t!.frame()).toContain("off");

    await t!.press("`", { ctrlKey: true });
    frame = t!.frame();
    expect(frame).not.toContain("Dev Overlay");
    await t!.type("hi");
    expect(t!.frame()).toContain("hi");
    lines = t!.lines();
    expect(lines[lines.length - 1]?.startsWith("[▼]")).toBe(true);

    await t!.press("`", { ctrlKey: true });
    expect(t!.frame()).toContain("Dev Overlay");
    await t!.press("Escape");
    expect(t!.frame()).not.toContain("Dev Overlay");
  });
});

describe("<TextDevOverlay> outside the App Router", () => {
  const ctrlBackquote = (e: { key: string; code?: string; ctrl: boolean }): boolean => e.ctrl && (e.key === "`" || e.code === "Backquote");

  test("pill={false} draws nothing until the shortcut opens the inspector", async () => {
    t = await createTestRoot({ width: 100, height: 30 });
    await t.render(
      <Box flexDirection="column" width="100%" height="100%">
        <Text>app</Text>
        <TextDevOverlay pill={false} redbox={false} store={new DevErrorStore()} />
      </Box>,
    );
    const blank = t.frame();
    expect(blank).not.toContain("[▼]");
    expect(blank.trim()).toBe("app");
    await t.press("`", { ctrlKey: true });
    expect(t.frame()).toContain("Dev Overlay · Turbolog");
    await t.press("Escape");
    expect(t.frame()).toBe(blank);
  });

  test("shortcut narrows the toggle keys, and shell supplies theme and wireframe controls", async () => {
    let wireframe = false;
    let cycled = 0;
    const shell = {
      theme: themes.tokyoNight,
      themeName: "tokyoNight",
      setTheme: () => undefined,
      cycleTheme: () => void cycled++,
      wireframe,
      setWireframe: (on: boolean) => void (wireframe = on),
    };
    let f2 = 0;
    function App(): ReactNode {
      useInput((e) => {
        if (e.key === "f2") f2++;
      });
      return <Text>app</Text>;
    }
    t = await createTestRoot({ width: 100, height: 30 });
    await t.render(
      <Box flexDirection="column" width="100%" height="100%">
        <App />
        <TextDevOverlay pill={false} redbox={false} shortcut={ctrlBackquote} shell={shell} store={new DevErrorStore()} />
      </Box>,
    );
    await t.press("F2");
    expect(f2).toBe(1);
    expect(t.frame()).not.toContain("Dev Overlay");
    await t.press("`", { ctrlKey: true });
    const frame = t.frame();
    expect(frame).toContain("Dev Overlay · Turbolog");
    expect(frame).toContain("Tokyo Night");
    await t.press("t");
    expect(cycled).toBe(1);
    await t.press("w");
    expect(wireframe).toBe(true);
  });
});
