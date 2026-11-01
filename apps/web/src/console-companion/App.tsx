import { lazy, Suspense, useCallback, useEffect, type ReactNode } from "react";
import { Box, KeyHint, Text, useApp, useFocusManager, useInput } from "@textjs/react";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { PresetView } from "../demos/presets";
import { useSite } from "./useSite";
import { hintsFor, PRESETS, siteStore, type CompanionTab, type Hint } from "./store";
import { HomeTab } from "./tabs/HomeTab";
import { DocsTab } from "./tabs/DocsTab";
import { exampleGrid, ExampleTab, runsExamples } from "./tabs/ExampleTab";
import { LearnConsole } from "../learn/apps/LearnConsole";
import { matchRoute } from "../router";
import { NotFoundTab } from "./tabs/NotFoundTab";
import { SiteDevTools } from "./DevTools";

// Only /terminal needs the shop, so it loads on first visit.
const TerminalConsole = lazy(() => import("../demos/terminal").then((m) => ({ default: m.TerminalConsole })));
const BlogTab = lazy(() => import("./tabs/BlogTab").then((m) => ({ default: m.BlogTab })));

const PAGE_LABEL: Record<CompanionTab, string> = { home: "", playground: "playground", opencode: "opencode", docs: "docs", learn: "learn", terminal: "terminal", blog: "blog" };

const NOT_FOUND_HINTS: readonly Hint[] = [{ keys: "Enter", label: "home" }];

/** One quiet row of keys at the bottom of every view. */
function HintLine({ tab, hints: override }: { tab: CompanionTab; hints?: readonly Hint[] }): ReactNode {
  const site = useSite();
  const hints = override ?? hintsFor(tab, site.preset).hints;
  return (
    <Box className="flex-row h-1 shrink-0 px-2 gap-3">
      {hints.map((h) => (
        <KeyHint key={h.keys} keys={h.keys} label={h.label} />
      ))}
    </Box>
  );
}

function Header({ tab, notFound = false }: { tab: CompanionTab; notFound?: boolean }): ReactNode {
  const site = useSite();
  const label = notFound ? "" : tab === "playground" ? `playground / ${(PRESETS.find((p) => p.id === site.preset) ?? PRESETS[0])?.label.toLowerCase()}` : PAGE_LABEL[tab];
  return (
    <Box className="flex-row h-1 shrink-0 px-2 gap-1">
      <Text bold color="fg" wrap="nowrap">
        ▼ Text.js
      </Text>
      {label ? <Text color="subtle" wrap="nowrap">{` / ${label}`}</Text> : null}
    </Box>
  );
}

export function CompanionApp(): ReactNode {
  const site = useSite();
  const focus = useFocusManager();
  const tab = site.tab;
  // One wireframe flag for F2, the DevTools panel, `text.wireframe()` and the mirror's inspect button; boot applies it.
  const app = useApp();
  const wireframe = site.wireframe;
  const setWireframe = useCallback((on: boolean) => siteStore.set({ wireframe: on }), []);
  useEffect(() => app.renderer.setWireframe(wireframe), [app, wireframe]);
  const route = tab === "home" || tab === "blog" ? matchRoute(site.pathname) : null;
  // Unknown paths show the 404. Their tab stays Home (or Blog), so off-route demos stop.
  const notFound = route?.name === "not-found";
  const example = runsExamples(tab) && !notFound && site.example !== null && exampleGrid(site.example, tab) ? site.example : null;

  useInput(
    (e) => {
      if (tab === "opencode") return;
    if (e.key === "f2") {
      e.stopPropagation();
      setWireframe(!siteStore.getSnapshot().wireframe);
    } else if (e.key === "escape" && example === null) {
      e.stopPropagation();
      focus.blur();
    }
    },
    // terminal.shop owns every key, esc included.
    { isActive: tab !== "terminal" },
  );

  // OpenCode is a full-screen TUI of its own, like the real thing.
  if (tab === "opencode") return <OpenCodeLite />;
  // Ctrl+` opens the Text.js DevTools inspector everywhere but OpenCode and terminal.shop.
  const devtools = <SiteDevTools wireframe={wireframe} setWireframe={setWireframe} />;
  // Each /learn page runs its chapter's app, with its own header and keys.
  if (tab === "learn")
    return (
      <>
        <LearnConsole />
        {devtools}
      </>
    );
  // An example clicked on the page (docs, or Home's Components) runs here instead of the page's view.
  if (example !== null)
    return (
      <>
        <ExampleTab key={example} id={example} />
        {devtools}
      </>
    );
  // terminal.shop's ssh storefront, 80 × 30, signed in through the site's proxy.
  if (tab === "terminal")
    return (
      <Suspense fallback={null}>
        <TerminalConsole />
      </Suspense>
    );

  return (
    <Box className="flex-col grow pt-1">
      <Header tab={tab} notFound={notFound} />
      <Box className="flex-col grow overflow-hidden" paddingTop={1}>
        {notFound ? <NotFoundTab /> : tab === "home" ? <HomeTab /> : null}
        {route?.name === "blog-post" ? (
          <Suspense fallback={null}>
            <BlogTab slug={route.slug} />
          </Suspense>
        ) : null}
        {tab === "playground" ? <PresetView key={site.preset} preset={site.preset} reserveRows={6} /> : null}
        {tab === "docs" ? <DocsTab /> : null}
      </Box>
      <HintLine tab={tab} hints={notFound ? NOT_FOUND_HINTS : undefined} />
      {devtools}
    </Box>
  );
}
