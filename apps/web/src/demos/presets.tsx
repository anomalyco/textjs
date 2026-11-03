import type { ReactNode } from "react";
import type { PresetId } from "../console-companion/store";
import { DashboardDemo } from "./Dashboard";
import { DoomDemo } from "./doom/Doom";
import { SnakeDemo } from "./Snake";
import { StreamingDemo } from "./Streaming";

export interface PresetViewProps {
  preset: PresetId;
  /** Rows used by surrounding chrome (for the Snake board size). */
  reserveRows?: number;
  /** Whether the console companion is active (engaged on desktop). */
  active?: boolean;
}

export function PresetView({ preset, reserveRows = 4, active = true }: PresetViewProps): ReactNode {
  switch (preset) {
    case "dashboard":
      return <DashboardDemo />;
    case "streaming":
      return <StreamingDemo />;
    case "snake":
      return <SnakeDemo reserveRows={reserveRows} />;
    case "doom":
      return <DoomDemo reserveRows={4} active={active} />;
  }
}
