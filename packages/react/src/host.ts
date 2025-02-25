/**
 * Internal host element handles. `tx-box` / `tx-text` stay private to this
 * package so `React.JSX.IntrinsicElements` is never augmented and react-dom
 * JSX keeps its own types in apps that use both renderers.
 */

import type { ComponentType, ReactNode, Ref } from "react";
import type { ColorInput, SceneNode, SceneNodeProps } from "@textjs/core";
import { parseClassName } from "./classname";
import { resolveColor, type TextTheme } from "./theme";

export interface HostElementProps extends SceneNodeProps {
  children?: ReactNode;
  ref?: Ref<SceneNode>;
}

export const TxBox = "tx-box" as unknown as ComponentType<HostElementProps>;
export const TxText = "tx-text" as unknown as ComponentType<HostElementProps>;

const COLOR_KEYS = ["fg", "bg", "borderColor", "titleColor", "bottomTitleColor", "backdropColor"] as const;

function assignDefined(target: Record<string, unknown>, src: object | undefined): void {
  if (!src) return;
  for (const k in src) {
    const v = (src as Record<string, unknown>)[k];
    if (v !== undefined) target[k] = v;
  }
}

/**
 * Merge styling sources with precedence `explicit props > style > className`
 * and resolve semantic color tokens (`"muted"`, `"accent"`, …) against the theme.
 */
export function mergeStyleProps(
  theme: TextTheme,
  className: string | undefined,
  style: Partial<SceneNodeProps> | undefined,
  explicit: object,
): SceneNodeProps {
  const out: Record<string, unknown> = {};
  assignDefined(out, parseClassName(className, theme));
  assignDefined(out, style);
  assignDefined(out, explicit);
  for (const k of COLOR_KEYS) {
    const v = out[k];
    if (typeof v === "string") out[k] = resolveColor(theme, v as ColorInput);
  }
  return out as SceneNodeProps;
}
