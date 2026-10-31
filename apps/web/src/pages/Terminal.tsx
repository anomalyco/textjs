import type { ReactNode } from "react";
import { PAGE_HINTS } from "../console-companion/store";
import { ConsolePad } from "../site/ConsolePad";

export function TerminalPage(): ReactNode {
  const { action, hints } = PAGE_HINTS.terminal;
  return (
    <ConsolePad hints={hints} action={action} top={<span className="pad-title">terminal.shop, in the console</span>}>
      <p className="pad-note">
        The real store: sign in with your Terminal account right in the console, no API key needed. Orders are charged and shipped, and the
        app asks before placing one.
      </p>
    </ConsolePad>
  );
}
