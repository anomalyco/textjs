import { useMemo, type ReactNode } from "react";
import { EmbeddedOpenCode } from "../../../../opencode-console/embed";
import { createDemoClient } from "../../../../opencode-console/lib/demo";
import { createTransport, createV1Client, createV2Client } from "../../../../opencode-console/lib/client";
import { useSite } from "../../console-companion/useSite";
import { scenario } from "./scenario";

export function OpenCodeLite(): ReactNode {
  const connection = useSite().opencode;
  const live = connection.mode === "live" ? connection : null;
  const url = live?.url;
  const protocol = live?.protocol;
  const client = useMemo(() => {
    if (!url) return createDemoClient({ scenario });
    const transport = createTransport(url, new URL(url).host);
    return protocol === "v1" ? createV1Client(transport, "custom") : createV2Client(transport, "custom");
  }, [url, protocol]);
  return <EmbeddedOpenCode key={JSON.stringify([url, protocol])} client={client} />;
}
