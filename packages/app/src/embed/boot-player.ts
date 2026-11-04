/**
 * The runtime `embed.js` loads on console intent when the app renders on the
 * server (`export const runtime = "server"`): the frame player, streaming
 * from the server `embed.js` came from, with input gated for the host page.
 */

import { bootFramePlayer, type FramePlayer, type FramePlayerConfig } from "../live-player";
import { createHostInput, type HostInput } from "./host-input";
import type { EmbedBootState } from "./loader";

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

export function bootEmbedPlayer(options: EmbedPlayerOptions): EmbedPlayer {
  const config = options.config ?? {};
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
  return {
    player,
    input,
    dispose() {
      player.dispose();
      input.dispose();
    },
  };
}
