import type { ReactNode } from "react";
import type { Look } from "../index";

function Mark({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
    </svg>
  );
}

export const look: Look = { id: "a2", name: "a2", Mark, banner: [] };
