import { handleTerminal, type SessionConfig } from "../../server/terminal-session";

/** Cloudflare Pages Function: the OAuth redirect URI, `/terminal/callback`. */
export const onRequest = (context: { request: Request; env: SessionConfig }): Promise<Response> => handleTerminal(context.request, context.env);
