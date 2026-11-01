import { AnsiDriver } from "@textjs/core";
import { render } from "@textjs/react/testing";
import { CompanionApp } from "./console-companion/App";
import { resetLocation } from "./router";

export const HOME_ANSI_COLS = 80;
export const HOME_ANSI_ROWS = 24;

/**
 * The console Home view (geistDark, count 0) as one truecolor ANSI frame, for `curl textjs.org`
 * (functions/index.ts). Rendered at build time by the same encoder as `text run`.
 */
export async function renderHomeAnsi(): Promise<string> {
  resetLocation("/");
  const app = await render(<CompanionApp />, { cols: HOME_ANSI_COLS, rows: HOME_ANSI_ROWS, theme: "geistDark", tabFocus: false });
  let out = "";
  new AnsiDriver((chunk) => (out = chunk), { lineSeparator: "\n" }).render(app.root.renderer.buffer);
  await app.unmount();
  return `${out}\n`;
}
