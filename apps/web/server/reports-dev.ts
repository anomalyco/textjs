/**
 * `vite dev` / `vite preview` adapter for `POST /api/errors`: the Pages Function's handler with no
 * Analytics Engine binding, so each report is printed as one JSON line.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { MAX_BODY_BYTES, REPORT_PATH } from "../src/telemetry/shared";
import { handleReport } from "./reports";

type Next = (err?: unknown) => void;

export function reportsDevMiddleware(): (req: IncomingMessage, res: ServerResponse, next: Next) => void {
  return (req, res, next) => {
    if ((req.url ?? "/").split("?")[0] !== REPORT_PATH) return next();
    void (async () => {
      const method = (req.method ?? "GET").toUpperCase();
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const c of req as AsyncIterable<Buffer>) {
        size += c.byteLength;
        if (size > MAX_BODY_BYTES + 1) break;
        chunks.push(c);
      }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string" && k !== "cf-connecting-ip" && k !== "content-length") headers.set(k, v);
      const body = method === "GET" || method === "HEAD" ? undefined : new Uint8Array(Buffer.concat(chunks));
      const response = await handleReport(new Request(`http://${req.headers.host ?? "localhost"}${REPORT_PATH}`, { method, headers, body }), {});
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end();
    })().catch(next);
  };
}
