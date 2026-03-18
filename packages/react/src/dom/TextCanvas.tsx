import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createConsoleRoot, type ConsoleRoot, type ConsoleRootOptions } from "../root";
import type { TextTheme, ThemeName } from "../theme";
import { FocusPad, type FocusPadHint } from "./FocusPad";

export interface TextCanvasProps {
  /** The console app to mount into `console.log`. */
  app: ReactNode;
  width?: number;
  height?: number;
  responsive?: boolean;
  theme?: TextTheme | ThemeName;
  showMirrorDefault?: boolean;
  title?: string;
  /** Focus Pad appearance (defaults to the theme's appearance). */
  appearance?: "dark" | "light";
  /** Keys worth pressing, shown on the Focus Pad. */
  hints?: readonly FocusPadHint[];
  rootOptions?: Omit<ConsoleRootOptions, "width" | "height" | "responsive" | "theme">;
  onRoot?: (root: ConsoleRoot | null) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Boot a console root from a react-dom page: the app renders into the DevTools
 * console while the page shows the Focus Pad receiver.
 */
export function TextCanvas({
  app,
  width = 100,
  height = 32,
  responsive = false,
  theme,
  showMirrorDefault = false,
  title,
  appearance,
  hints,
  rootOptions,
  onRoot,
  className,
  style,
  children,
}: TextCanvasProps): ReactNode {
  const [root, setRoot] = useState<ConsoleRoot | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: ConsoleRoot | null = null;
    createConsoleRoot({ ...rootOptions, width, height, responsive, theme }).then(
      (r) => {
        if (cancelled) {
          r.unmount();
          return;
        }
        created = r;
        setRoot(r);
        onRoot?.(r);
      },
      (error: unknown) => console.error(error),
    );
    return () => {
      cancelled = true;
      if (created) {
        created.unmount();
        onRoot?.(null);
      }
      setRoot(null);
    };
    // The root is created once; size, theme and app changes are applied below.
  }, []);

  useEffect(() => {
    if (root && !root.unmounted) root.render(app);
  }, [root, app]);

  useEffect(() => {
    if (!root || root.unmounted) return;
    if (responsive) {
      root.renderer.viewport.setResponsive(true);
      root.viewport.refresh();
    } else root.renderer.resize(width, height);
  }, [root, width, height, responsive]);

  useEffect(() => {
    if (root && !root.unmounted && theme !== undefined) root.setTheme(theme);
  }, [root, theme]);

  const resolvedAppearance = appearance ?? (root ? root.getTheme().appearance : typeof theme === "object" ? theme.appearance : theme === "geistLight" ? "light" : "dark");

  return (
    <FocusPad root={root} title={title} appearance={resolvedAppearance} hints={hints} showMirrorDefault={showMirrorDefault} className={className} style={style}>
      {children}
    </FocusPad>
  );
}
