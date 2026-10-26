/**
 * `@textjs/next/mcp` — drive Text.js apps from coding agents.
 *
 * `text mcp [dir]` serves these tools over stdio; `createTextMcpServer()`
 * embeds the same server in another process (any MCP transport), and
 * `HeadlessSession` is the transport-free core.
 */

export { createTextMcpServer, formatFrame, SessionController, type TextMcpServerOptions } from "./server";
export { HeadlessSession, SessionError, purgeModuleCache, type FetchResult, type FocusSummary, type FrameSnapshot, type SessionOptions, type SettleResult } from "./session";
export { findText, frameText, styledRows, type Region, type StyledRow, type StyledRun, type TextMatch } from "./frame";
export { FiberProbe, formatTree, inspect, type Bounds, type FocusableInfo, type InspectOptions, type InspectResult, type TreeNode } from "./inspect";
export { parseKeyInput, textToKeyEvents, KeySpecError, MAX_KEYS_PER_CALL } from "./keys";
export { captureConsole, LogBuffer, type LogEntry, type LogLevel } from "./logs";
export { MCP_HELP, parseMcpArgs, runMcpCli } from "./cli";
