import { useRef, type ReactNode } from "react";
import { Box, KeyHint, Text, useApp, useFocusManager, useInput } from "@textjs/react";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { PresetView } from "../demos/presets";
import { useSite } from "./useSite";
import { hintsFor, PRESETS, type CompanionTab } from "./store";
import { HomeTab } from "./tabs/HomeTab";
import { DocsTab } from "./tabs/DocsTab";
import { exampleGrid, ExampleTab } from "./tabs/ExampleTab";
import { LearnConsole } from "../learn/apps/LearnConsole";

const PAGE_LABEL: Record<CompanionTab, string> = { home: "", playground: "playground", opencode: "opencode", docs: "docs", learn: "learn" };

/** One quiet row of keys at the bottom of every view. */
function HintLine({ tab }: { tab: CompanionTab }): ReactNode {
  const site = useSite();
  const { hints } = hintsFor(tab, site.preset);
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

  useInput((e) => {
    if (e.key === "f2") {
      e.stopPropagation();
      wireframe.current = !wireframe.current;
      app.renderer.setWireframe(wireframe.current);
    } else if (e.key === "escape" && example === null) {
      e.stopPropagation();
      focus.blur();
    }
  });

  // OpenCode is a full-screen TUI of its own, like the real thing.
  if (tab === "opencode") return <OpenCodeLite active />;
  // Each /learn page runs its chapter's app, with its own header and keys.
  if (tab === "learn") return <LearnConsole />;
  // A docs example clicked on the page runs here instead of the Docs view.
  if (example !== null) return <ExampleTab key={example} id={example} />;

  return (
    <Box className="flex-col grow pt-1">
      <Header tab={tab} />
      <Box className="flex-col grow overflow-hidden" paddingTop={1}>
        {tab === "home" ? <HomeTab /> : null}
        {tab === "playground" ? <PresetView key={site.preset} preset={site.preset} reserveRows={6} /> : null}
        {tab === "docs" ? <DocsTab /> : null}
      </Box>
      <HintLine tab={tab} />
    </Box>
  );
}
