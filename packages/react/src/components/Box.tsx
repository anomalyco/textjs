import type { ReactNode, Ref } from "react";
import type { ColorInput, SceneNode, SceneNodeProps } from "@textjs/core";
import { mergeStyleProps, TxBox } from "../host";
import { useTheme } from "../theme";

export interface BoxProps extends Omit<SceneNodeProps, "wrap" | "textAlign"> {
  /** Cell utilities, e.g. `"flex-col gap-1 p-1 border rounded bg-surface"`. */
  className?: string;
  /** Style object; overrides `className`, overridden by explicit props. */
  style?: Partial<SceneNodeProps>;
  /** Alias for `bg`. */
  backgroundColor?: ColorInput;
  /** Alias for `fg`. */
  color?: ColorInput;
  /** Visual focus state; switches the border to `focusedBorderColor`. */
  focused?: boolean;
  /** Border color while `focused` (defaults to the theme's `borderFocus`). */
  focusedBorderColor?: ColorInput;
  ref?: Ref<SceneNode>;
  children?: ReactNode;
}

export function Box({ className, style, children, ref, focused, focusedBorderColor, backgroundColor, color, ...rest }: BoxProps): ReactNode {
  const theme = useTheme();
  const props = mergeStyleProps(theme, className, style, {
    ...rest,
    bg: rest.bg ?? backgroundColor,
    fg: rest.fg ?? color,
    borderColor: focused ? (focusedBorderColor ?? theme.borderFocus) : rest.borderColor,
  });
  return (
    <TxBox {...props} ref={ref}>
      {children}
    </TxBox>
  );
}
