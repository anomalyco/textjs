import { lazy, Suspense, useRef, type ReactNode } from "react";
import { Box, KeyHint, Text, useApp, useFocusManager, useInput } from "@textjs/react";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { PresetView } from "../demos/presets";
import { useSite } from "./useSite";
import { hintsFor, PRESETS, type CompanionTab, type Hint } from "./store";
import { HomeTab } from "./tabs/HomeTab";
import { DocsTab } from "./tabs/DocsTab";
import { exampleGrid, ExampleTab } from "./tabs/ExampleTab";
import { LearnConsole } from "../learn/apps/LearnConsole";
import { matchRoute } from "../router";
import { NotFoundTab } from "./tabs/NotFoundTab";

// Only /terminal needs the shop, so it loads on first visit.
const TerminalConsole = lazy(() => import("../demos/terminal").then((m) => ({ default: m.TerminalConsole })));

const PAGE_LABEL: Record<CompanionTab, string> = { home: "", playground: "playground", opencode: "opencode", docs: "docs", learn: "learn", terminal: "terminal" };

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

function Header({ tab }: { tab: CompanionTab }): ReactNode {
  const site = useSite();
  const label = tab === "playground" ? `playground / ${(PRESETS.find((p) => p.id === site.preset) ?? PRESETS[0])?.label.toLowerCase()}` : PAGE_LABEL[tab];
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
  const app = useApp();
  const focus = useFocusManager();
  const tab = site.tab;
  const example = tab === "docs" && site.example !== null && exampleGrid(site.example) ? site.example : null;
  const wireframe = useRef(false);
  // Unknown paths keep the Home tab (so off-route demos stop) but show the 404.
  const notFound = tab === "home" && matchRoute(site.pathname).name === "not-found";

  useInput(
    (e) => {
      if (tab === "opencode") return;
    if (e.key === "f2") {
      e.stopPropagation();
      wireframe.current = !wireframe.current;
      app.renderer.setWireframe(wireframe.current);
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
  // Each /learn page runs its chapter's app, with its own header and keys.
  if (tab === "learn") return <LearnConsole />;
  // A docs example clicked on the page runs here instead of the Docs view.
  if (example !== null) return <ExampleTab key={example} id={example} />;
  // terminal.shop's ssh storefront, 80 × 30, signed in through the site's proxy.
  if (tab === "terminal")
    return (
      <Suspense fallback={null}>
        <TerminalConsole />
      </Suspense>
    );

  return (
    <Box className="flex-col grow pt-1">
      <Header tab={tab} />
      <Box className="flex-col grow overflow-hidden" paddingTop={1}>
        {tab === "home" ? notFound ? <NotFoundTab /> : <HomeTab /> : null}
        {tab === "playground" ? <PresetView key={site.preset} preset={site.preset} reserveRows={6} /> : null}
        {tab === "docs" ? <DocsTab /> : null}
      </Box>
      <HintLine tab={tab} hints={notFound ? NOT_FOUND_HINTS : undefined} />
    </Box>
  );
}
