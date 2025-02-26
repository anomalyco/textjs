import type { ReactNode, Ref } from "react";
import type { ColorInput, LayoutProps, SceneNode, SceneNodeProps, TextAlign, TextStyleProps, WrapMode } from "@textjs/core";
import { mergeStyleProps, TxText } from "../host";
import { useTheme } from "../theme";

export interface TextProps extends TextStyleProps, LayoutProps {
  /** Alias for `fg`. Accepts colors or theme tokens (`"muted"`, `"accent"`, …). */
  color?: ColorInput;
  wrap?: WrapMode;
  align?: TextAlign;
  zIndex?: number;
  className?: string;
  style?: Partial<SceneNodeProps>;
  ref?: Ref<SceneNode>;
  children?: ReactNode;
}

/** Rich inline text. Nested `<Text>` elements become styled spans of the outer text. */
export function Text({ color, align, className, style, ref, children, fg, ...rest }: TextProps): ReactNode {
  const theme = useTheme();
  const props = mergeStyleProps(theme, className, style, { ...rest, fg: fg ?? color, textAlign: align });
  return (
    <TxText {...props} ref={ref}>
      {children}
    </TxText>
  );
}

export interface LinkProps extends Omit<TextProps, "allowLink"> {
  href: string;
}

/** An underlined, linkified URL (keeps DevTools' URL auto-linking enabled for this span). */
export function Link({ href, children, ...rest }: LinkProps): ReactNode {
  return (
    <Text color="accent" underline allowLink {...rest}>
      {children ?? href}
    </Text>
  );
}
