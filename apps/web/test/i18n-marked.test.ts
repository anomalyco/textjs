import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Every piece of English a visitor reads goes through the catalog (`t`, `rich`, `plural`, `msg`), so a locale
 * build can translate it and mark what it can't. This fails on JSX text and user-facing attributes written
 * as plain English in the site's pages. The console companion, demos and live previews render in the
 * console and stay English.
 */

const SRC = join(import.meta.dir, "..", "src");
const DIRS = ["pages", "site", "learn", "merch", "App.tsx", "ErrorBoundary.tsx", "Root.tsx"];
const SKIP = /\/learn\/apps\//;
const ATTRS = new Set(["title", "aria-label", "alt", "placeholder", "label", "aria-description", "activateLabel"]);

/** Code, product names, keyboard shortcuts and mock browser UI that read the same in every language. */
const ALLOWED = new Set([
  // Mock DevTools, terminal and agent windows (dir="ltr" islands).
  "Elements", "Console", "Sources", "VM12:1", "acme — text run", "text run", "textjs · read_frame", "read_frame",
  "top ▾", "Default levels ▾", "No Issues", "React + Yoga", "SSE", "21 kB gzip", "DevTools", "console.log",
  "clear() + log()", "log(), appended",
  // Code and file names.
  "app/deploys/page.tsx", "&lt;textarea&gt;", "tsx", "ms", "FPS", "esc",
  // Names and shortcuts.
  "Text.js", "▼ Text.js", "GitHub", "OpenCode", "terminal.shop", "Turbolog", "Ctrl+Shift+J", "Ctrl+Shift+K", "Ctrl+K", "CC", "English",
  // LearnPad titles: the console app's name, shown in its frame.
  "learn", "certificate",
]);

function files(): string[] {
  const out: string[] = [];
  const walk = (p: string): void => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const f = join(p, e.name);
      if (e.isDirectory()) walk(f);
      else if (f.endsWith(".tsx") && !SKIP.test(f)) out.push(f);
    }
  };
  for (const d of DIRS) {
    const p = join(SRC, d);
    if (p.endsWith(".tsx")) out.push(p);
    else walk(p);
  }
  return out;
}

function unmarked(file: string): string[] {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const at = (n: ts.Node): string => `${relative(SRC, file)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const visit = (n: ts.Node): void => {
    if (ts.isJsxText(n)) {
      const text = n.getText().replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (/[A-Za-z]{2,}/.test(text) && !ALLOWED.has(text)) found.push(`${at(n)} ${text}`);
    }
    if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText())) {
      const text = n.initializer.text;
      if (/[A-Za-z]{2,}/.test(text) && !ALLOWED.has(text)) found.push(`${at(n)} ${n.name.getText()}="${text}"`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("i18n", () => {
  test("site copy goes through the catalog", () => {
    expect(files().flatMap(unmarked)).toEqual([]);
  });
});
