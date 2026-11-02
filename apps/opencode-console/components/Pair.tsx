import { useEffect, useRef, useState } from "react";
import { useClipboard } from "@textjs/app";
import { useStore } from "../lib/store";
import { Choices } from "./Choices";
/** Never put a redeemable URL in a retained DevTools frame, snapshot, or app store. */
export function Pair({ close }: { close: () => void }) {
  const api = useStore().api,
    pair = api?.pairing,
    { copy } = useClipboard(),
    [hosts, list] = useState<string[]>([]),
    [host, choose] = useState(""),
    [note, report] = useState(""),
    [issued, finish] = useState(false),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (pair)
      void pair.origins().then(
        (xs) => {
          if (alive.current) list(xs);
        },
        () => {
          if (alive.current) report("Could not load server information");
        },
      );
    return () => {
      alive.current = false;
    };
  }, [pair]);
  const instructions =
    api?.kind === "demo"
      ? "Sandbox preview. No server will accept this link."
      : "Pairing links grant server access. Copy a link without printing it to the console.";
  if (!pair || issued)
    return (
      <Choices
        title="Pair"
        items={[{ id: "done", label: "OK" }]}
        choose={close}
        close={close}
        note={note || "Open /pair in the native TUI."}
      />
    );
  if (!host)
    return (
      <Choices
        title="Pair"
        items={hosts.map((h) => ({ id: h, label: h }))}
        choose={choose}
        close={close}
        note={note || instructions}
      />
    );
  const back = () => {
    if (lock.current) close();
    else choose("");
  };
  return (
    <Choices
      title="Create pairing link"
      items={[
        { id: "cancel", label: "Cancel" },
        { id: "copy", label: `Copy link for ${host}` },
      ]}
      close={back}
      note={note || instructions}
      choose={(id) => {
        if (id !== "copy") {
          back();
          return;
        }
        if (lock.current) return;
        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
          report("Clipboard unavailable. Open /pair in the native TUI.");
          return;
        }
        lock.current = true;
        void (async () => {
          const r = await pair.issue();
          if (!alive.current) return;
          const ok = await copy(new URL("/auth/connect/" + encodeURIComponent(r.code), host).href);
          if (!alive.current) return;
          report(
            `${ok ? "Link copied." : "Clipboard unavailable."} ${api?.kind === "demo" ? "This is a sandbox preview." : `Links work once and expire in ${Math.ceil(r.expires_in / 60)} minutes.`}`,
          );
          finish(true);
        })()
          .catch(() => {
            if (alive.current) report("Could not create a pairing link. Close and reopen Pair to try again.");
          })
          .finally(() => {
            lock.current = false;
          });
      }}
    />
  );
}
