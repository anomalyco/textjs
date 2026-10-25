import type { ReactNode } from "react";

export type IconName = "reload" | "copy" | "external" | "follow" | "chevron" | "file" | "error" | "play" | "route";

const PATHS: Record<IconName, ReactNode> = {
  reload: <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </>
  ),
  external: <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />,
  follow: (
    <>
      <path d="M2.5 5.5h9l-2.5-2.5" />
      <path d="M13.5 10.5h-9l2.5 2.5" />
    </>
  ),
  chevron: <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
  file: <path d="M9.5 1.5h-5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-9l-3-3Zm0 0v3h3" />,
  error: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.75v3.75M8 10.75v.5" />
    </>
  ),
  play: <path d="M5 3.5v9l7-4.5-7-4.5Z" />,
  route: (
    <>
      <circle cx="4" cy="12" r="1.75" />
      <circle cx="12" cy="4" r="1.75" />
      <path d="M5.75 12H10a2 2 0 0 0 0-4H6a2 2 0 0 1 0-4h4.25" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }): ReactNode {
  return (
    <svg className={`icon icon-${name}`} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
