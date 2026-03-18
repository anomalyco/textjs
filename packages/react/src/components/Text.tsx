import type { ReactNode, Ref } from "react";
import { jsx } from "react/jsx-runtime";
import type { ColorInput, LayoutProps, SceneNode, SceneNodeProps, TextAlign, TextStyleProps, WrapMode } from "@textjs/core";
import { buildTextHostProps, TxText } from "../host";
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
export function Text(props: TextProps): ReactNode {
  return jsx(TxText, buildTextHostProps(useTheme(), props));
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
