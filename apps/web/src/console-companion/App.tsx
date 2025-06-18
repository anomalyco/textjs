import { useRef, type ReactNode } from "react";
import { Box, KeyHint, Tabs, Text, themes, useApp, useFocusManager, useInput, useTheme, useViewport } from "@textjs/react";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { SnakeDemo } from "../demos/Snake";
import { useSite } from "./useSite";
import { COMPANION_TABS, siteStore, type CompanionTab } from "./store";
import { HomeTab } from "./tabs/HomeTab";
import { PlaygroundTab } from "./tabs/PlaygroundTab";
import { DocsTab } from "./tabs/DocsTab";
import { useFrameStats } from "./useFrameStats";

function Header(): ReactNode {
  const site = useSite();
  const stats = useFrameStats();
  const vp = useViewport();
  return (
    <Box className="flex-row h-1 shrink-0 px-1 bg-surface gap-1">
      <Text bold color="fg" wrap="nowrap">
        ▼ Text.js
      </Text>
      <Text color="subtle" wrap="nowrap">
        0.1 (Turbolog)
      </Text>
      <Text color="border">│</Text>
      <Text color="muted" wrap="truncate-end" flexShrink={1}>
        {`textjs.org${site.pathname}`}
      </Text>
      <Box className="grow" />
      <Text color={vp.focused ? (site.consoleInput ? "success" : "warning") : "subtle"} wrap="nowrap">
        {vp.focused ? (site.consoleInput ? "● input live" : "○ input paused") : "▯ page unfocused"}
      </Text>
      <Text color="border">│</Text>
      <Text color="subtle" wrap="nowrap">{`${stats.totalMs.toFixed(2)}ms · ${stats.spanCount} spans · #${stats.frameCount}`}</Text>
    </Box>
  );
}

function Footer({ tab }: { tab: CompanionTab }): ReactNode {
  const hints: Record<CompanionTab, Array<[string, string]>> = {
    home: [
      ["↑/↓", "count"],
      ["space", "+10"],
      ["t", "theme"],
    ],
    playground: [
      ["[ ]", "preset"],
      ["t", "theme"],
      ["F2", "wireframe"],
    ],
    opencode: [
      ["enter", "send"],
      ["tab", "build/plan"],
      ["ctrl+p", "commands"],
      ["esc", "leave prompt"],
    ],
    docs: [
      ["/", "search"],
      ["↑/↓", "browse"],
      ["enter", "read"],
      ["←", "back"],
    ],
    snake: [
      ["wasd", "steer"],
      ["space", "start"],
      ["r", "reset"],
    ],
  };
  return (
    <Box className="flex-row h-1 shrink-0 px-1 bg-surface gap-2">
      <KeyHint keys="1-5" label="tabs" />
      {hints[tab].map(([k, l]) => (
        <KeyHint key={k} keys={k} label={l} />
      ))}
      <Box className="grow" />
      <Text color="subtle" wrap="nowrap">
        window.text.help()
      </Text>
    </Box>
  );
}

export function CompanionApp(): ReactNode {
  const site = useSite();
  const theme = useTheme();
  const app = useApp();
  const focus = useFocusManager();
  const tab = site.tab;
  const wireframe = useRef(false);

  useInput((e) => {
    if (e.ctrl || e.meta || e.alt) return;
    const byKey = COMPANION_TABS.find((t) => t.shortcut === e.input);
    if (byKey) {
      e.stopPropagation();
      siteStore.set({ tab: byKey.id });
      return;
    }
    if (e.key === "tab") {
      e.stopPropagation();
      const i = COMPANION_TABS.findIndex((t) => t.id === tab);
      const next = COMPANION_TABS[(i + (e.shift ? COMPANION_TABS.length - 1 : 1)) % COMPANION_TABS.length];
      if (next) siteStore.set({ tab: next.id });
      return;
    }
    if (e.input === "t" || e.input === "T") {
      e.stopPropagation();
      siteStore.cycleTheme();
      return;
    }
    if (e.key === "f2") {
      e.stopPropagation();
      wireframe.current = !wireframe.current;
      app.renderer.setWireframe(wireframe.current);
      return;
    }
    if (e.key === "escape") {
      e.stopPropagation();
      focus.blur();
    }
  });

  return (
    <Box className="flex-col grow">
      <Header />
      <Box className="flex-row h-1 shrink-0 px-1">
        <Tabs tabs={COMPANION_TABS} activeTab={tab} onChange={(id) => siteStore.set({ tab: id as CompanionTab })} variant="pill" shortcuts={false} />
        <Box className="grow" />
        <Text color="subtle" wrap="nowrap">{`theme `}</Text>
        <Text color="accent" wrap="nowrap">
          {themes[site.theme].name}
        </Text>
      </Box>
      <Box className="flex-col grow overflow-hidden" borderColor={theme.border} border borderLeft={false} borderRight={false} borderBottom={false}>
        {tab === "home" ? <HomeTab /> : null}
        {tab === "playground" ? <PlaygroundTab /> : null}
        {tab === "opencode" ? <OpenCodeLite active /> : null}
        {tab === "docs" ? <DocsTab /> : null}
        {tab === "snake" ? <SnakeDemo reserveRows={7} title="snake · 60fps" /> : null}
      </Box>
      <Footer tab={tab} />
    </Box>
  );
}
