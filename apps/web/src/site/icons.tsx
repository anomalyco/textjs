import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svg(size: number, props: SVGProps<SVGSVGElement>, children: ReactNode): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

/** The ▼ brand mark. Points down, into the DevTools console drawer. */
export function Logo({ size = 18, ...props }: IconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M2 4h20L12 21.5z" fill="currentColor" />
    </svg>
  );
}

export function GitHubIcon({ size = 18, ...props }: IconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function CopyIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" />
      <path d="M10.5 3.5v-.5a1.5 1.5 0 00-1.5-1.5H4A1.5 1.5 0 002.5 3v5A1.5 1.5 0 004 9.5h.5" stroke="currentColor" />
    </>,
  );
}

export function CheckIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(size, props, <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />);
}

export function SearchIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}

export function MenuIcon({ size = 18, ...props }: IconProps): ReactNode {
  return svg(size, props, <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />);
}

export function CloseIcon({ size = 18, ...props }: IconProps): ReactNode {
  return svg(size, props, <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />);
}

export function ArrowRight({ size = 14, ...props }: IconProps): ReactNode {
  return svg(size, props, <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />);
}

/* DevTools glyphs */

export function ClearIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.2 11.8l7.6-7.6" stroke="currentColor" strokeWidth="1.3" />
    </>,
  );
}

export function InspectIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <path d="M13 6.5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v9a1 1 0 001 1h3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 8l6 2.2-2.6.9-.9 2.6z" fill="currentColor" />
    </>,
  );
}

export function DeviceIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <rect x="1.5" y="3" width="9" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="11.5" y="6" width="3" height="6.5" rx=".6" stroke="currentColor" strokeWidth="1.2" />
    </>,
  );
}

export function SidebarIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.2" />
    </>,
  );
}

export function EyeIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </>,
  );
}

export function GearIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>,
  );
}

export function KebabIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <circle cx="8" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.1" fill="currentColor" />
    </>,
  );
}

export function KeyboardIcon({ size = 14, ...props }: IconProps): ReactNode {
  return svg(
    size,
    props,
    <>
      <rect x="1.5" y="4" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 7h.01M6.5 7h.01M9 7h.01M11.5 7h.01M5 9.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}
