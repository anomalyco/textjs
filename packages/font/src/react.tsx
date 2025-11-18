import { useMemo, type ReactNode } from "react";
import { AsciiFont, type AsciiFontProps, type AsciiFontRenderer } from "@textjs/react";
import type { FigletFont } from "./parse";
import { renderFiglet, type FigletAlign, type FigletLayout, type FigletVerticalLayout } from "./render";

export interface FigletTextProps extends Omit<AsciiFontProps, "text" | "font" | "letterSpacing"> {
  font: FigletFont;
  /** The text to render. Newlines start new lines of FIGcharacters. */
  children: string | number | readonly (string | number)[];
  layout?: FigletLayout;
  verticalLayout?: FigletVerticalLayout;
  /** Wrap at this many columns, like `figlet -w`. Default: no wrapping. */
  columns?: number;
  align?: FigletAlign;
  direction?: "default" | "ltr" | "rtl";
}

/**
 * FIGlet lettering: `<FigletText font={slant}>Text.js</FigletText>`. Rows render cell-exact,
 * exactly as the `figlet` program prints them.
 */
export function FigletText({ font, children, layout, verticalLayout, columns, align, direction, ...rest }: FigletTextProps): ReactNode {
  const text = Array.isArray(children) ? children.join("") : String(children);
  const renderer = useMemo<AsciiFontRenderer>(
    () => ({
      name: font.name,
      render: (t: string) => renderFiglet(font, t, { layout, verticalLayout, width: columns, align, direction }),
    }),
    [font, layout, verticalLayout, columns, align, direction],
  );
  return <AsciiFont {...rest} text={text} font={renderer} />;
}
