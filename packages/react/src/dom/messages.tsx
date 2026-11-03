import type { ReactNode } from "react";

/**
 * Every string the pad and its size control show, including labels for screen readers. Parameterized lines
 * are functions that return the whole sentence, so a translation can put the words in any order.
 */
export interface FocusPadMessages {
  /** Progress label for screen readers: "Step 1 of 3". */
  step: (n: number, total: number) => string;
  /** Progress label once keys reach the app: "Live". */
  stepLive: string;
  /** Headline while the console is closed: "Open the console". */
  openConsole: string;
  /** Label for a shortcut's keycaps: "Press ⌘ ⌥ J". */
  pressShortcut: (keys: string) => string;
  /** "The app renders in DevTools." */
  rendersInDevtools: string;
  /** Shown instead in Safari, which hides Web Inspector until its developer features are on. */
  safariDeveloperFeatures: string;
  /** The line after the shortcut. `action` is the `action` prop, or `defaultAction` of the first hint. */
  then: (action: string) => ReactNode;
  /** The action when there's no `action` prop: "press ↑ ↓" for the first hint's keys, or "type" without hints. */
  defaultAction: (keys: string | null) => string;
  /** Headline while the page doesn't have the keyboard: "Click here". */
  clickHere: string;
  /** "The app reads keys from this page." */
  readsKeys: string;
  /** "⌘⌥J opens the console." `shortcut` is the shortcut as a keycap. */
  shortcutOpens: (shortcut: ReactNode) => ReactNode;
  /** Headline while keys reach the app: "Live in your console". */
  liveInConsole: string;
  /** Shown live when there are no hints: "Start typing." */
  startTyping: string;
  /** Headline on touch screens: "Open on a desktop". */
  openOnDesktop: string;
  /** "This app renders in the DevTools console, which needs a desktop browser." */
  needsDesktop: string;
  /** Size control option that follows the docked console: "Fit console". The measured size is appended. */
  fitConsole: string;
  /** Size control option for any other size: "Custom". */
  custom: string;
  /** Size control label: "Console size". */
  consoleSize: string;
  /** Size control tooltip while it can't measure the console. */
  consoleSizeUndocked: string;
  /** Labels for the custom size fields: "Columns", "Rows". */
  columns: string;
  rows: string;
}

export const defaultFocusPadMessages: FocusPadMessages = {
  step: (n, total) => `Step ${n} of ${total}`,
  stepLive: "Live",
  openConsole: "Open the console",
  pressShortcut: (keys) => `Press ${keys}`,
  rendersInDevtools: "The app renders in DevTools.",
  safariDeveloperFeatures: "First turn on “Show features for web developers” in Safari Settings → Advanced.",
  then: (action) => `Then click here and ${action}.`,
  defaultAction: (keys) => (keys === null ? "type" : `press ${keys}`),
  clickHere: "Click here",
  readsKeys: "The app reads keys from this page.",
  shortcutOpens: (shortcut) => (
    <>
      {shortcut}
      {" "}opens the console.
    </>
  ),
  liveInConsole: "Live in your console",
  startTyping: "Start typing.",
  openOnDesktop: "Open on a desktop",
  needsDesktop: "This app renders in the DevTools console, which needs a desktop browser.",
  fitConsole: "Fit console",
  custom: "Custom",
  consoleSize: "Console size",
  consoleSizeUndocked: "Console size. Undocked DevTools can't be measured from the page, so this uses a default. Dock DevTools or pick a size.",
  columns: "Columns",
  rows: "Rows",
};

/** `base` (the defaults) with `messages` on top; a key set to `undefined` keeps the base. */
export function resolveFocusPadMessages(messages: Partial<FocusPadMessages> | undefined, base: FocusPadMessages = defaultFocusPadMessages): FocusPadMessages {
  if (!messages) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(messages)) if (v !== undefined) out[k] = v;
  return out as unknown as FocusPadMessages;
}
