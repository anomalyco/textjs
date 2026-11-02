import { useEffect, useState } from "react";
import { Text, useInput, useFocus } from "@textjs/app";
import { PickerPanel } from "./PickerPanel";
type Dialog = (typeof import("./SessionDialogs"))["default"];
let loaded: Dialog | undefined, pending: Promise<Dialog> | undefined;
export function loadDialogs() {
  return (pending ??= import("./SessionDialogs").then(
    (m) => (loaded = m.default),
    (e) => {
      pending = undefined;
      throw e;
    },
  ));
}
/** Keep the editor trapped even if the dialog chunk fails or the user cancels the download. */
export function DeferredDialog(props: Parameters<Dialog>[0]) {
  const [component, ready] = useState<Dialog | undefined>(() => loaded),
    [failed, fail] = useState(false);
  useEffect(() => {
    if (component) return;
    let live = true;
    void loadDialogs().then(
      (v) => {
        if (live) ready(() => v);
      },
      () => {
        if (live) fail(true);
      },
    );
    return () => {
      live = false;
    };
  }, [component]);
  const Component = component;
  if (Component) return <Component {...props} />;
  return (
    <PickerPanel>
      <Waiting close={props.close} failed={failed} />
    </PickerPanel>
  );
}
function Waiting({ close, failed }: { close: () => void; failed: boolean }) {
  useFocus({ id: "opencode-loading-dialog", autoFocus: true });
  useInput(
    (e) => {
      e.stopPropagation();
      if (e.key === "escape") close();
    },
    { priority: 32 },
  );
  return <Text paddingX={3}>{failed ? "Could not load the dialog. Press Esc and reopen it to retry." : "Loading…"}</Text>;
}
