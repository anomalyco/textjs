/**
 * The runtime `embed.js` loads on console intent when the app renders on the
 * server (`export const runtime = "server"`): the frame player, streaming
 * from the server `embed.js` came from, with input gated for the host page.
 */

import { claimConsole, CONSOLE_OWNER, type ConsoleOwner } from "@textjs/core/experimental";
import { bootFramePlayer, type FramePlayer, type FramePlayerConfig } from "../live-player";
import { createHostInput, type HostInput } from "./host-input";
import type { EmbedBootState } from "./loader";
import { publishEmbed } from "./mirror";

/** The build-time part of an embedded server app's settings. */
export interface EmbedPlayerConfig {
  viewport?: FramePlayerConfig["viewport"];
  /** Default `"/"`. */
  initialPath?: string;
  /** Default `"text"`; `false` installs no global. */
  globalName?: string | false;
  initialClear?: boolean;
  /** Send cookies to the server's origin (`embed.credentials`). */
  credentials?: boolean;
}

export interface EmbedPlayerOptions extends Partial<EmbedBootState> {
  /** The live endpoint, absolute (next to `embed.js`). */
  endpoint: string;
  config?: EmbedPlayerConfig;
}

export interface EmbedPlayer {
  player: FramePlayer;
  input: HostInput;
  dispose(): void;
}

/** `null` when the page's own app already renders in the console. */
export function bootEmbedPlayer(options: EmbedPlayerOptions): EmbedPlayer | null {
  const config = options.config ?? {};
  const g = globalThis as Record<symbol, ConsoleOwner | undefined>;
  if (g[CONSOLE_OWNER] !== undefined && g[CONSOLE_OWNER].embed !== true) return null;
  const input = createHostInput({ engaged: options.reason === "engage" });
  const painted = options.shell === true;
  const player = bootFramePlayer({
    basePath: "",
    endpoint: options.endpoint,
    path: config.initialPath ?? "/",
    viewport: config.viewport,
    credentials: config.credentials ? "include" : "same-origin",
    input: input.engine,
    syncDocument: false,
    // The first frame clears only when embed.js painted none and clearing was asked for.
    shell: painted || config.initialClear !== true,
    shellPaintedAt: painted ? options.shellAt : undefined,
    registerGlobal: config.globalName ?? "text",
  });
  // Frames and input state for <text-console> elements on the page.
  const published = publishEmbed(() => player.core.buffer, input);
  player.core.onPaint = () => published.frame();
  let disposed = false;
  const embedded: EmbedPlayer = {
    player,
    input,
    dispose() {
      if (disposed) return;
      disposed = true;
      published.dispose();
      player.dispose();
      input.dispose();
      release();
    },
  };
  // Replaces embed.js's claim; the page's own app preempts it when it starts.
  const release = claimConsole({ embed: true, preempt: () => embedded.dispose() });
  return embedded;
}
