import { handleTerminal, type SessionConfig } from "../../../server/terminal-session";

/** Cloudflare Pages Function: `/api/terminal/*` (status, sign in/out, the Terminal API proxy). */
export const onRequest = (context: { request: Request; env: SessionConfig }): Promise<Response> => handleTerminal(context.request, context.env);
