import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useApp } from "@textjs/react";
import { EmbeddedOpenCode } from "../../../../opencode-console/embed";
import { createDemoClient } from "../../../../opencode-console/lib/demo";
import { createTransport, createV1Client, createV2Client } from "../../../../opencode-console/lib/client";
import { siteStore } from "../../console-companion/store";
import { clearViewportConsole } from "../../console-companion/viewport-console";
import { useSite } from "../../console-companion/useSite";
import { BRIDGE_TOKEN_HEADER } from "./live";
import { scenario } from "./scenario";

export function OpenCodeLite(): ReactNode {
  const site = useSite();
  const connection = site.opencode;
  const live = connection.mode === "live" ? connection : null;
  const url = live?.url;
  const protocol = live?.protocol;
  const token = live?.token;
  const client = useMemo(() => {
    if (!url) return createDemoClient({ scenario });
    const transport = createTransport(url, new URL(url).host, token ? { [BRIDGE_TOKEN_HEADER]: token } : {});
    return protocol === "v1" ? createV1Client(transport, "custom") : createV2Client(transport, "custom");
  }, [url, protocol, token]);
  const { renderer } = useApp();
  const paused = useRef(false);
  // `/exit` drops you at your shell, which here is the DevTools prompt. The connected server is left alone.
  const exit = useCallback(() => {
    paused.current = true;
    renderer.pause();
    if (typeof window !== "undefined") clearViewportConsole();
    siteStore.set({ opencodeExited: true, consoleInput: false });
  }, [renderer]);
  // Clicking the page pad engages console input again, which restarts it.
  const restart = site.opencodeExited && site.consoleInput;
  useEffect(() => {
    if (restart) siteStore.set({ opencodeExited: false });
  }, [restart]);
  useEffect(() => {
    if (site.opencodeExited || !paused.current) return;
    paused.current = false;
    renderer.resume();
  }, [site.opencodeExited, renderer]);
  useEffect(
    () => () => {
      if (!paused.current) return;
      paused.current = false;
      siteStore.set({ opencodeExited: false });
      renderer.resume();
    },
    [renderer],
  );
  return <EmbeddedOpenCode key={JSON.stringify([url, protocol, token])} client={client} onExit={exit} />;
}
