/**
 * ▼ Text.js — The Console Framework for the Web.
 */

export * from "@textjs/react";
export { VERSION, ENGINE_NAME, BRAND_MARK } from "@textjs/core";
export { defineConfig, type TextConfig, type Metadata, type ViewportConfig, type Rewrite, type ProxyTarget, type AnsiConfig, type EmbedConfig } from "./config";
export { useAppTheme, type AppShellState } from "./context";
export type { PageProps, LayoutProps, ErrorComponentProps } from "./router";
