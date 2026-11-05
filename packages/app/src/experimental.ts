/**
 * `@textjs/app/experimental`: APIs that may change in a minor release.
 *
 * Embeds: `text build --embed` (or `embed` in `text.config.ts`) builds the app
 * as one `<script type="module" src=".../embed.js">` tag for other sites.
 * These are the pieces it is made of, for hosts that load an app themselves.
 */

export { bootEmbedClient, type EmbedClient, type EmbedClientConfig, type EmbedClientOptions } from "./embed/boot-client";
export { bootEmbedPlayer, type EmbedPlayer, type EmbedPlayerConfig, type EmbedPlayerOptions } from "./embed/boot-player";
export { BYPASS_SELECTOR, createHostInput, ENGAGE_SELECTOR, type HostInput, type HostInputOptions } from "./embed/host-input";
export { startEmbed, type EmbedBootState } from "./embed/loader";
export type { EmbedConfig } from "./config";
