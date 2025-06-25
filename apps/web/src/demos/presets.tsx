import type { ReactNode } from "react";
import type { PresetId } from "../console-companion/store";
import { CounterDemo } from "./Counter";
import { DashboardDemo } from "./Dashboard";
import { FormDemo } from "./Form";
import { SnakeDemo } from "./Snake";
import { StreamingDemo } from "./Streaming";

export interface PresetViewProps {
  preset: PresetId;
  title?: string;
  markdown?: string;
  /** Rows used by surrounding chrome (for the Snake board size). */
  reserveRows?: number;
}

export function PresetView({ preset, title, markdown, reserveRows = 4 }: PresetViewProps): ReactNode {
  switch (preset) {
    case "counter":
      return <CounterDemo title={title} />;
    case "dashboard":
      return <DashboardDemo title={title} />;
    case "form":
      return <FormDemo title={title} />;
    case "streaming":
      return <StreamingDemo title={title} markdown={markdown} />;
    case "snake":
      return <SnakeDemo reserveRows={reserveRows} title={title} />;
  }
}
