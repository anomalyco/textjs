import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppRouter, createMemoryHistory, type RouteManifest } from "@textjs/app/router";
import * as home from "./app/page";
import * as session from "./app/session/[id]/page";
import { Shell } from "./components/Shell";
import { OpenCodeProvider, OpenCodeStore } from "./lib/store";
import type { OpenCodeClient } from "./lib/types";

const routes: RouteManifest = {
  segment: "", layout: { default: Shell }, page: home,
  children: [{ segment: "session", children: [{ segment: "[id]", page: session }] }],
};

/** The actual standalone routes, with private navigation and an explicit backend.
 * No browser history writes, title changes, dev middleware or service discovery.
 * Remount with a different key when changing servers: never carry a draft or id across. */
export function EmbeddedOpenCode({ client, onExit }: { client: OpenCodeClient; onExit?: () => void }): ReactNode {
  const exit = useRef(onExit);
  exit.current = onExit;
  const [store] = useState(() => new OpenCodeStore({ client, onExit: onExit ? () => exit.current?.() : undefined }));
  const [history] = useState(() => createMemoryHistory("/"));
  useEffect(() => {
    store.start();
    return () => store.dispose();
  }, [store]);
  return (
    <OpenCodeProvider store={store}>
      <AppRouter routes={routes} history={history} theme="opencodeDark" documentTitle={false} errorStore={null} />
    </OpenCodeProvider>
  );
}
