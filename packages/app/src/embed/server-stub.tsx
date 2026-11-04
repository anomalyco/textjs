/**
 * Stands in for server-rendered pages in an embedded client app. On the app's
 * own site such a page loads as a document; an embed can't navigate the host
 * page, so it says so in the console instead.
 */

import { useEffect, type ReactNode } from "react";

export const runtime = "server";

export default function EmbeddedServerRoute(): ReactNode {
  useEffect(() => {
    console.error("▼ Text.js: this page renders on the server, so it can't open in an embedded client app. Set `embed.initialPath` to it to embed it on its own.");
  }, []);
  return null;
}
