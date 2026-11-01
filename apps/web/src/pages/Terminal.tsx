import type { ReactNode } from "react";

/** Below the terminal.shop demo, in the pad's fixed-height bottom slot. */
export function TerminalNote(): ReactNode {
  return (
    <p className="pad-note">
      This is the live terminal.shop store. Sign in with your Terminal account in the console, no API key needed. Orders are charged and shipped,
      and the app asks you to confirm each one.
    </p>
  );
}
