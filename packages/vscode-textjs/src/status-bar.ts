/** Status bar item: dev server state and the console grid size. */

import * as vscode from "vscode";
import { formatStatus, type StatusInput } from "./status-format";

export type { StatusInput } from "./status-format";

export class StatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem("textjs.status", vscode.StatusBarAlignment.Left, 50);

  constructor() {
    this.item.name = "Text.js";
    this.item.command = "textjs.showMenu";
  }

  update(s: StatusInput, visible: boolean): void {
    const { text, tooltip } = formatStatus(s);
    this.item.text = text;
    const md = new vscode.MarkdownString(tooltip, true);
    md.isTrusted = false;
    this.item.tooltip = md;
    this.item.accessibilityInformation = { label: `Text.js: dev server ${s.server}${s.grid ? `, console ${s.grid.width} by ${s.grid.height}` : ""}` };
    if (visible) this.item.show();
    else this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}
