/**
 * `textjs/link` — focusable client-side navigation for console apps.
 */

import { useRef, type ReactNode } from "react";
import { Text, useFocus, useInput, useTheme, type TextProps } from "@textjs/react";
import { useOptionalRouterState } from "./context";
import { parseHref } from "./history";

export interface LinkProps extends Omit<TextProps, "children" | "allowLink"> {
  href: string;
  /** Replace the current history entry instead of pushing. */
  replace?: boolean;
  /** Include in Tab order; `Enter` / `Space` navigate while focused (default `true`). */
  focusable?: boolean;
  autoFocus?: boolean;
  /** Focus id for `useFocusManager().focus(id)`. */
  id?: string;
  /** Preload lazy route modules on mount (default `true`). */
  prefetch?: boolean;
  /** Single key that follows the link from anywhere, e.g. `"1"`. */
  shortcut?: string;
  /** Class names applied when `href` matches the current pathname. */
  activeClassName?: string;
  /** Called before navigating. */
  onNavigate?: () => void;
  children?: ReactNode;
}

/**
 * ```tsx
 * <Link href="/deployments">Deployments</Link>
 * ```
 */
export function Link({
  href,
  replace = false,
  focusable = true,
  autoFocus,
  id,
  prefetch = true,
  shortcut,
  activeClassName,
  onNavigate,
  className,
  children,
  ...textProps
}: LinkProps): ReactNode {
  const theme = useTheme();
  const state = useOptionalRouterState();
  const focus = useFocus({ id, autoFocus, isActive: focusable });
  const latest = useRef({ href, replace, onNavigate, state });
  latest.current = { href, replace, onNavigate, state };
  const prefetched = useRef(false);

  if (prefetch && state && !prefetched.current) {
    prefetched.current = true;
    queueMicrotask(() => state.router.prefetch(href));
  }

  const navigate = (): void => {
    const { href: to, replace: rep, onNavigate: cb, state: s } = latest.current;
    cb?.();
    if (s) {
      if (rep) s.router.replace(to);
      else s.router.push(to);
    } else if (typeof window !== "undefined") window.location.assign(to);
  };

  useInput(
    (e) => {
      if (e.key === "return" || e.key === "space") {
        e.stopPropagation();
        navigate();
      }
    },
    { isActive: focus.isFocused },
  );

  useInput(
    (e) => {
      if (shortcut && e.input === shortcut && !e.ctrl && !e.meta && !e.alt) {
        e.stopPropagation();
        navigate();
      }
    },
    { isActive: shortcut !== undefined },
  );

  const active = state !== null && parseHref(href, state.location.pathname).pathname === state.location.pathname;
  const cls = [className, active ? activeClassName : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <Text
      {...textProps}
      underline={textProps.underline ?? (focus.isFocused || /\bno-underline\b/.test(cls ?? "") ? undefined : true)}
      color={textProps.color ?? (cls ? undefined : "accent")}
      className={cls}
      bg={focus.isFocused ? theme.accent : textProps.bg}
      fg={focus.isFocused ? theme.accentFg : textProps.fg}
      allowLink
    >
      {children ?? href}
    </Text>
  );
}

export default Link;
