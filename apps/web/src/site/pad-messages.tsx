import type { FocusPadHint, FocusPadMessages } from "@textjs/react/dom";
import { rich } from "../i18n/rich";
import { msg, t } from "../i18n/t";

/** The focus pad's own strings in the page's language. In English they match `defaultFocusPadMessages`. */
export const PAD_MESSAGES: FocusPadMessages = {
  step: (n, total) => t("Step {n} of {total}", { n, total }),
  stepLive: t("Live"),
  openConsole: t("Open the console"),
  pressShortcut: (keys) => t("Press {keys}", { keys }),
  rendersInDevtools: t("The app renders in DevTools."),
  safariDeveloperFeatures: t("First turn on “Show features for web developers” in Safari Settings → Advanced."),
  then: (action) => t("Then click here and {action}.", { action }),
  defaultAction: (keys) => (keys === null ? t("type") : t("press {keys}", { keys })),
  clickHere: t("Click here"),
  readsKeys: t("The app reads keys from this page."),
  shortcutOpens: (shortcut) => rich("<shortcut></shortcut> opens the console.", { shortcut: () => shortcut }),
  liveInConsole: t("Live in your console"),
  startTyping: t("Start typing."),
  openOnDesktop: t("Open on a desktop"),
  needsDesktop: t("This app renders in the DevTools console, which needs a desktop browser."),
  fitConsole: t("Fit console"),
  custom: t("Custom"),
  consoleSize: t("Console size"),
  consoleSizeUndocked: t("Console size. Undocked DevTools can't be measured from the page, so this uses a default. Dock DevTools or pick a size."),
  columns: t("Columns"),
  rows: t("Rows"),
};

/**
 * The demos' hint labels and actions ("Then click here and …"), translated for the pad. The console shows the
 * same hints in English (`console-companion/store.ts`, `learn/meta.ts`), so the page looks them up by their
 * English text. Actions finish the sentence in `PAD_MESSAGES.then`.
 */
const PAD_TEXT: Readonly<Record<string, string>> = {
  // Actions
  "press ← →": msg("press ← →"),
  "press ↑ ↓ to browse": msg("press ↑ ↓ to browse"),
  "press ↓": msg("press ↓"),
  "press 2": msg("press 2"),
  "press an arrow key": msg("press an arrow key"),
  "press Enter": msg("press Enter"),
  "press Enter to try again": msg("press Enter to try again"),
  "press Esc to cancel": msg("press Esc to cancel"),
  "press r": msg("press r"),
  "press s": msg("press s"),
  "press t": msg("press t"),
  "type a prompt": msg("type a prompt"),
  // Hint labels
  agents: msg("agents"),
  back: msg("back"),
  "break a test": msg("break a test"),
  cancel: msg("cancel"),
  cart: msg("cart"),
  chapters: msg("chapters"),
  chart: msg("chart"),
  commands: msg("commands"),
  deploy: msg("deploy"),
  details: msg("details"),
  direction: msg("direction"),
  fire: msg("fire"),
  move: msg("move"),
  navigate: msg("navigate"),
  "new deployment": msg("new deployment"),
  open: msg("open"),
  pause: msg("pause"),
  products: msg("products"),
  qty: msg("qty"),
  quit: msg("quit"),
  refetch: msg("refetch"),
  reset: msg("reset"),
  rows: msg("rows"),
  "run tests": msg("run tests"),
  "say hello": msg("say hello"),
  select: msg("select"),
  send: msg("send"),
  shortcuts: msg("shortcuts"),
  sidebar: msg("sidebar"),
  sort: msg("sort"),
  status: msg("status"),
  steer: msg("steer"),
  "stream again": msg("stream again"),
  "switch region": msg("switch region"),
  theme: msg("theme"),
  "try again": msg("try again"),
};

/** A hint label or action in the page's language (English, and commands like `text run`, as written). */
export function padText(english: string): string {
  return PAD_TEXT[english] ?? english;
}

export function padHints(hints: readonly FocusPadHint[]): FocusPadHint[] {
  return hints.map((h) => ({ keys: h.keys, label: padText(h.label) }));
}
