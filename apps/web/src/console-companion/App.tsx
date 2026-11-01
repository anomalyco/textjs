import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, KeyHint, Text, useApp, useFocusManager, useInput } from "@textjs/react";
import { exampleGrid, runsExamples } from "../docs/preview-meta";
import { matchRoute } from "../router";
import { SiteDevTools } from "./DevTools";
import { DOCS_READING_HINTS, hintsFor, PRESETS, siteStore, type CompanionTab, type Hint } from "./store";
import { NotFoundTab } from "./tabs/NotFoundTab";
import { getLoadedCompanionTabs, preloadCompanionTab, subscribeCompanionTabs } from "./tabs-loader";
import { teamModule, useTeamGate } from "./team-gate";
import { useSite } from "./useSite";

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
  const [, bump] = useState(0);
  useEffect(() => subscribeCompanionTabs(() => bump((n) => n + 1)), []);

  // One wireframe flag for F2, the DevTools panel, `text.wireframe()` and the mirror's inspect button; boot applies it.
  const app = useApp();
  const wireframe = site.wireframe;
  const setWireframe = useCallback((on: boolean) => siteStore.set({ wireframe: on }), []);
  useEffect(() => app.renderer.setWireframe(wireframe), [app, wireframe]);
  const route = tab === "home" || tab === "blog" ? matchRoute(site.pathname) : null;
  // Unknown paths show the 404. Their tab stays Home (or Blog), so off-route demos stop.
  const notFound = route?.name === "not-found";
  const example = runsExamples(tab) && !notFound && site.example !== null && exampleGrid(site.example, tab) ? site.example : null;

  useEffect(() => {
    void preloadCompanionTab(tab);
    if (example !== null) void preloadCompanionTab("example");
  }, [tab, example]);

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

  const team = site.teamEgg !== null ? teamModule() : null;
  useTeamGate(tab !== "opencode" && tab !== "terminal" && example === null && team === null);

  const loaded = getLoadedCompanionTabs();

  // OpenCode is a full-screen TUI of its own, like the real thing.
  if (tab === "opencode") {
    const OpenCodeLite = loaded.opencode;
    return OpenCodeLite ? <OpenCodeLite /> : null;
  }
  // Ctrl+` opens the Dev Overlay inspector everywhere but OpenCode and terminal.shop.
  const devtools = <SiteDevTools wireframe={wireframe} setWireframe={setWireframe} />;
  if (team !== null && site.teamEgg !== null)
    return (
      <>
        <team.TeamEgg id={site.teamEgg} />
        {devtools}
      </>
    );
  // Each /learn page runs its chapter's app, with its own header and keys.
  if (tab === "learn") {
    const LearnConsole = loaded.learn;
    return LearnConsole ? (
      <>
        <LearnConsole />
        {devtools}
      </>
    ) : null;
  }
  // An example clicked on the page (docs, or Home's Components) runs here instead of the page's view.
  if (example !== null) {
    const ExampleTab = loaded.example;
    return ExampleTab ? (
      <>
        <ExampleTab key={example} id={example} />
        {devtools}
      </>
    ) : null;
  }
  // terminal.shop's ssh storefront (responsive like the ssh shop), signed in through the site's proxy.
  if (tab === "terminal") {
    const TerminalConsole = loaded.terminal;
    return TerminalConsole ? <TerminalConsole /> : null;
  }

  const HomeTab = loaded.home;
  const BlogTab = loaded.blog;
  const PresetView = loaded.playground;
  const DocsTab = loaded.docs;

  return (
    <Box className="flex-col grow pt-1">
      <Header tab={tab} notFound={notFound} />
      <Box className="flex-col grow overflow-hidden" paddingTop={1}>
        {notFound ? <NotFoundTab /> : tab === "home" && HomeTab ? <HomeTab /> : null}
        {route?.name === "blog-post" && BlogTab ? <BlogTab slug={route.slug} /> : null}
        {tab === "playground" && PresetView ? <PresetView key={site.preset} preset={site.preset} reserveRows={6} /> : null}
        {tab === "docs" && DocsTab ? <DocsTab /> : null}
      </Box>
      <HintLine tab={tab} hints={notFound ? NOT_FOUND_HINTS : tab === "docs" && site.docsPane === "content" ? DOCS_READING_HINTS : undefined} />
      {devtools}
    </Box>
  );
}
