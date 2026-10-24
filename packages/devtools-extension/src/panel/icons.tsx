import type { ReactNode } from "react";

function Icon({ children, size = 14 }: { children: ReactNode; size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const PauseIcon = (): ReactNode => (
  <Icon>
    <path d="M5.5 3.5v9M10.5 3.5v9" />
  </Icon>
);

export const PlayIcon = (): ReactNode => (
  <Icon>
    <path d="M5 3.5v9l7-4.5-7-4.5z" />
  </Icon>
);

export const WireframeIcon = (): ReactNode => (
  <Icon>
    <rect x="2.5" y="2.5" width="11" height="11" rx="1" strokeDasharray="2 1.6" />
    <path d="M2.5 6.5h11M6.5 6.5v7" />
  </Icon>
);

export const CopyIcon = (): ReactNode => (
  <Icon>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
  </Icon>
);

export const FitIcon = (): ReactNode => (
  <Icon>
    <path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" />
  </Icon>
);

export const RefreshIcon = (): ReactNode => (
  <Icon>
    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5" />
  </Icon>
);

export const Caret = ({ open }: { open: boolean }): ReactNode => (
  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 120ms ease" }}>
    <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
