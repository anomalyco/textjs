import { handleReport, type ReportsEnv } from "../../server/reports";

/** Cloudflare Pages Function: `POST /api/errors` (crash reports from the website). */
export const onRequest = (context: { request: Request; env: ReportsEnv }): Promise<Response> => handleReport(context.request, context.env);
