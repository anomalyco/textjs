import { useMemo, type ReactNode } from "react";
import { themes, type KeyEvent, type ThemeName } from "@textjs/react";
import type { AppShellState } from "@textjs/app";
import { TextDevOverlay } from "@textjs/app/devtools";
import { siteStore, THEME_ORDER } from "./store";
import { useSite } from "./useSite";

/** `` Ctrl+` `` opens the inspector, as in Text.js apps. F2 stays the site's wireframe key. */
export function isCtrlBackquote(e: KeyEvent): boolean {
  return e.ctrl && !e.meta && !e.alt && (e.key === "`" || e.code === "Backquote");
}

/** The `@textjs/app/devtools` Dev Overlay inspector, without its `[▼]` pill. */
export function SiteDevTools({ wireframe, setWireframe }: { wireframe: boolean; setWireframe(on: boolean): void }): ReactNode {
  const site = useSite();
  const shell = useMemo<AppShellState>(
    () => ({
      theme: themes[site.theme],
      themeName: site.theme,
      setTheme: (t) => {
        const name = typeof t === "string" ? t : t.id;
        if ((THEME_ORDER as readonly string[]).includes(name)) siteStore.set({ theme: name as ThemeName });
      },
      cycleTheme: () => void siteStore.cycleTheme(),
      wireframe,
      setWireframe,
    }),
    [site.theme, wireframe, setWireframe],
  );
  return <TextDevOverlay pill={false} redbox={false} shortcut={isCtrlBackquote} shell={shell} />;
}
