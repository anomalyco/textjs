import type { ReactNode } from "react";
import { useSearchParams } from "@textjs/app/navigation";
import { CONTENT, type Command } from "../../lib/frame";
import { defaultTheme, palette } from "../../lib/theme";
import { centerLines, fit, place, span, width, type Line } from "../../lib/ui";
import { useBlink, useHeaderMode, useKeys, useLayout, useNav } from "../chrome";
import { Screen } from "../Screen";
import { logo } from "../Shell";

/** The footer commands each page had when `m` was pressed (`state.footer.commands`). */
const PAGE_COMMANDS: Record<string, Command[]> = {
  "/shop": [
    { key: "↑/↓", value: "products" },
    { key: "+/-", value: "qty" },
    { key: "c", value: "cart" },
    { key: "q", value: "quit" },
  ],
  "/cart": [
    { key: "esc", value: "back" },
    { key: "↑/↓", value: "items" },
    { key: "+/-", value: "qty" },
    { key: "enter", value: "checkout" },
  ],
  "/account": [
    { key: "↑/↓", value: "navigate" },
    { key: "enter", value: "select" },
  ],
};

export function menuLines(from: string, cursor: boolean, widthContent = CONTENT): Line[] {
  const t = defaultTheme;
  const rows: Array<[string, string]> = [
    ["s", "shop"],
    ["a", "account"],
    ["c", "cart"],
    ["", ""],
  ];
  for (const c of PAGE_COMMANDS[from] ?? []) if (!["s", "a", "c"].includes(c.key)) rows.push([c.key, c.value]);
  // lipgloss table with a hidden border and 1-cell padding.
  const w1 = Math.max(...rows.map((r) => width(r[0]))) + 2;
  const w2 = Math.max(...rows.map((r) => width(r[1]))) + 2;
  const table: Line[] = [[]];
  for (const [k, v] of rows) table.push([span(" "), ...fit([t.bold(` ${k}`)], w1), span(" "), ...fit([t.base(` ${v}`)], w2), span(" ")]);
  table.push([]);
  const inner = w1 + w2 + 3;
  const ruleW = inner + 2;
  const rule: Line = [span("─".repeat(ruleW), { fg: palette.border })];
  const modal: Line[] = [rule, [], ...table.map((l) => fit([span(" "), ...fit(l, inner)], ruleW)), [], rule];
  return centerLines([logo(cursor), ...modal, fit([t.accent("press esc to close")], widthContent, "center")]);
}

export function MenuScreen(): ReactNode {
  const nav = useNav();
  const params = useSearchParams();
  const from = params.get("from") ?? "/shop";
  const cursor = useBlink();
  const L = useLayout();
  useHeaderMode("menu");
  useKeys((key) => {
    if (key === "esc") {
      nav(from.startsWith("/account") ? "/account" : "/shop");
      return true;
    }
    return false;
  });
  return <Screen lines={place(menuLines(from, cursor, L.widthContent), L.viewportWidth, L.viewportHeight)} />;
}
