import type { ReactNode } from "react";
import type { ThemeName } from "@textjs/react";
import { useInView } from "../site/useInView";
import { SandboxConsole } from "./SandboxConsole";
import { useSandbox } from "./useSandbox";

export interface InlineSandboxProps {
  /** A memoized element (a new element identity re-renders the console tree). */
  app: ReactNode;
  cols: number;
  rows: number;
  theme: ThemeName;
  source?: string;
  filter?: string;
  className?: string;
}

/** A lazily-mounted headless console root displayed in a DevTools window. */
export function InlineSandbox({ app, cols, rows, theme, source, filter, className }: InlineSandboxProps): ReactNode {
  const [ref, inView] = useInView<HTMLDivElement>();
  const sandbox = useSandbox(app, { cols, rows, theme, enabled: inView });
  return (
    <div ref={ref} className={className}>
      <SandboxConsole frame={sandbox.frame} engine={sandbox.engine} source={source} filter={filter} captureWheel cols={cols} rows={rows} />
    </div>
  );
}
