/**
 * Workspace Trust and workspace-folder boundaries. Previews and the dev server
 * run the project's code (Vite config, `text.config.*`, components), so they
 * only run in trusted workspaces and only for files inside a workspace folder.
 */

import * as vscode from "vscode";
import { findProjectRoot, previewTargetInFolder, type PreviewTarget } from "./project";

export function isTrusted(): boolean {
  return vscode.workspace.isTrusted;
}

/** The workspace folder containing `file`, or `undefined` for files outside the workspace. */
export function workspaceFolderFor(file: string | vscode.Uri): string | undefined {
  const uri = typeof file === "string" ? vscode.Uri.file(file) : file;
  if (uri.scheme !== "file") return undefined;
  return vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
}

/** The Text.js project for `file`, searching no higher than its workspace folder. */
export function projectRootInWorkspace(file: string): string | null {
  const folder = workspaceFolderFor(file);
  return folder === undefined ? null : findProjectRoot(file, folder);
}

export function previewTargetInWorkspace(file: string): PreviewTarget | null {
  return previewTargetInFolder(file, workspaceFolderFor(file));
}
