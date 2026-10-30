import { memo, useCallback, type NamedExoticComponent, type ReactNode } from "react";
import { ATTR_BOLD, parseColor, stringWidth, type CellBuffer, type ColorInput, type ComputedRect } from "@textjs/core";
import { TxBox } from "../host";
import { resolveColor, useTheme } from "../theme";
import { Text } from "./Text";

export interface SpacerProps {
  size?: number;
}

/** Flexible space that pushes siblings apart (or a fixed `size` in cells). */
export const Spacer: NamedExoticComponent<SpacerProps> = memo(function Spacer({ size }: SpacerProps): ReactNode {
  return size === undefined ? <TxBox flexGrow={1} flexShrink={1} /> : <TxBox width={size} height={size} flexShrink={0} />;
});

export interface DividerProps {
  title?: string;
  color?: ColorInput;
  titleColor?: ColorInput;
  /** Line character (default `─`). */
  char?: string;
  titleAlign?: "left" | "center" | "right";
  /** Draw a vertical divider instead. */
  vertical?: boolean;
}

/** A full-width horizontal rule with an optional inline title. */
export const Divider: NamedExoticComponent<DividerProps> = memo(function Divider({
  title,
  color,
  titleColor,
  char,
  titleAlign = "left",
  vertical = false,
}: DividerProps): ReactNode {
  const theme = useTheme();
  const lineColor = parseColor(resolveColor(theme, color ?? theme.border));
  const labelColor = parseColor(resolveColor(theme, titleColor ?? theme.muted));
  const ch = char ?? (vertical ? "│" : "─");
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      if (vertical) {
        for (let y = 0; y < r.height; y++) buf.setCell(r.x, r.y + y, ch, lineColor, 0);
        return;
      }
      for (let x = 0; x < r.width; x++) buf.setCell(r.x + x, r.y, ch, lineColor, 0);
      if (title && r.width > 4) {
        const label = ` ${title} `;
        const w = Math.min(stringWidth(label), r.width - 2);
        const x = titleAlign === "center" ? Math.floor((r.width - w) / 2) : titleAlign === "right" ? r.width - w - 2 : 2;
        buf.drawLogicalText(r.x + x, r.y, label, labelColor, 0, ATTR_BOLD, w);
      }
    },
    [ch, lineColor, labelColor, title, titleAlign, vertical],
  );
  return vertical ? (
    <TxBox width={1} maxWidth={1} flexGrow={1} alignSelf="stretch" flexShrink={0} customPaint={paint} />
  ) : (
    <TxBox height={1} maxHeight={1} flexGrow={1} flexShrink={1} alignSelf="stretch" customPaint={paint} />
  );
});

export type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info" | "outline";

export interface BadgeProps {
  variant?: BadgeVariant;
  children?: ReactNode;
}

/** A compact inverse label: ` NEW `, ` 3 `, ` beta `. */
export const Badge: NamedExoticComponent<BadgeProps> = memo(function Badge({ variant = "default", children }: BadgeProps): ReactNode {
  const theme = useTheme();
  if (variant === "outline") {
    return (
      <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
        [{children}]
      </Text>
    );
  }
  const bg =
    variant === "default"
      ? theme.elevated
      : variant === "accent"
        ? theme.accent
        : variant === "success"
          ? theme.success
          : variant === "warning"
            ? theme.warning
            : variant === "danger"
              ? theme.danger
              : theme.info;
  const fg = variant === "default" ? theme.fg : variant === "accent" ? theme.accentFg : theme.bg;
  return (
    <Text bg={bg} fg={fg} bold wrap="nowrap" flexShrink={0}>
      {" "}
      {children}{" "}
    </Text>
  );
});

export interface KeyHintProps {
  keys: string;
  label: string;
}

/** Keyboard shortcut legend: **⌘K** search. */
export const KeyHint: NamedExoticComponent<KeyHintProps> = memo(function KeyHint({ keys, label }: KeyHintProps): ReactNode {
  const theme = useTheme();
  return (
    <Text wrap="nowrap" flexShrink={0}>
      <Text color={theme.fg} bold>
        {keys}
      </Text>
      <Text color={theme.subtle}> {label}</Text>
    </Text>
  );
});
