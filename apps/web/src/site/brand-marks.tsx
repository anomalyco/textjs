import type { ReactNode } from "react";

/**
 * The official marks of the two apps in the Playground, drawn in `currentColor` so they follow the
 * text around them in light and dark. Both sit in the same 16 × 15 box, centred at their own aspect.
 */

/**
 * OpenCode's mark (anomalyco/opencode, packages/console/app/src/asset/lander/opencode-logo-{dark,light}.svg).
 * The inner block is #4B4646 on dark and #BCBBBB on light, about 28% of the outer colour.
 */
export function OpenCodeMark(): ReactNode {
  return (
    <svg className="brand-mark" width="16" height="15" viewBox="0 0 32 40" fill="none" aria-hidden="true">
      <path d="M24 32H8V16H24V32Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M24 8H8V32H24V8ZM32 40H0V0H32V40Z" fill="currentColor" />
    </svg>
  );
}

/** terminal.shop's mark, a `t` and the orange block cursor (terminal.shop/favicon.svg, without its black tile). */
export function TerminalMark(): ReactNode {
  return (
    <svg className="brand-mark" width="16" height="15" viewBox="31 29 237 243" fill="none" aria-hidden="true">
      <rect x="154.896" y="29" width="113.104" height="243" fill="#FF5C00" />
      <path
        d="M80.7312 87.4596V186.405C80.7312 190.855 81.8967 194.323 84.2279 196.81C86.559 199.296 89.8615 200.54 94.1352 200.54H119.972V218.994H91.9984C81.1197 218.994 73.0254 216.311 67.7156 210.945C62.5352 205.578 59.9451 197.922 59.9451 187.975V87.4596H80.7312ZM120.361 114.944V133.398H31V114.944H120.361Z"
        fill="currentColor"
      />
    </svg>
  );
}
