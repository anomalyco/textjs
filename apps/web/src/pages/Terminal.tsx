import type { ReactNode } from "react";
import { PAGE_HINTS } from "../console-companion/store";
import { ConsolePad } from "../site/ConsolePad";

export function TerminalPage(): ReactNode {
  const { action, hints } = PAGE_HINTS.terminal;
  return (
    <ConsolePad hints={hints} action={action} top={<span className="pad-title">terminal.shop in the console</span>}>
      <p className="pad-note">
        This is the live terminal.shop store. Sign in with your Terminal account in the console, no API key needed. Orders are charged and
        shipped, and the app asks you to confirm each one.
      </p>
    </ConsolePad>
  );
}
