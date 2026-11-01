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

/** Pre-stripped scene props attached by `Box`/`Text` so the reconciler skips `toSceneProps` copies. */
export const SCENE_PROPS: unique symbol = Symbol.for("textjs.sceneProps");
const EMPTY_SCENE_PROPS: SceneNodeProps = Object.freeze({});

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

function needsTokenResolve(v: unknown): boolean {
  return typeof v === "string" && v.length > 0 && v.charCodeAt(0) !== 35;
}

function resolveColorFields(theme: TextTheme, out: Record<string, unknown>): void {
  if (needsTokenResolve(out.fg)) out.fg = resolveColor(theme, out.fg as ColorInput);
  if (needsTokenResolve(out.bg)) out.bg = resolveColor(theme, out.bg as ColorInput);
  if (needsTokenResolve(out.borderColor)) out.borderColor = resolveColor(theme, out.borderColor as ColorInput);
  if (needsTokenResolve(out.titleColor)) out.titleColor = resolveColor(theme, out.titleColor as ColorInput);
  if (needsTokenResolve(out.bottomTitleColor)) out.bottomTitleColor = resolveColor(theme, out.bottomTitleColor as ColorInput);
  if (needsTokenResolve(out.backdropColor)) out.backdropColor = resolveColor(theme, out.backdropColor as ColorInput);
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
  if (className) assignDefined(out, parseClassName(className, theme));
  if (style) assignDefined(out, style);
  assignDefined(out, explicit);
  resolveColorFields(theme, out);
  return out as SceneNodeProps;
}

/** Single-pass host props builder for `<Box>` (avoids intermediate rest/spread objects). */
export function buildBoxHostProps(
  theme: TextTheme,
  raw: {
    className?: string;
    style?: Partial<SceneNodeProps>;
    backgroundColor?: ColorInput;
    color?: ColorInput;
    focused?: boolean;
    focusedBorderColor?: ColorInput;
    bg?: ColorInput;
    fg?: ColorInput;
    borderColor?: ColorInput;
    titleColor?: ColorInput;
    bottomTitleColor?: ColorInput;
    backdropColor?: ColorInput;
    children?: ReactNode;
    ref?: Ref<SceneNode>;
  },
): HostElementProps {
  let onlyClass = true;
  const src = raw as Record<string, unknown>;
  for (const k in src) {
    if (k !== "className" && k !== "children" && k !== "ref" && k !== "key" && src[k] !== undefined) {
      onlyClass = false;
      break;
    }
  }
  if (onlyClass) {
    const scene = raw.className ? parseClassName(raw.className, theme) : EMPTY_SCENE_PROPS;
    return { children: raw.children, ref: raw.ref, [SCENE_PROPS]: scene } as HostElementProps;
  }
  const out: Record<string, unknown> = {};
  if (raw.className) assignDefined(out, parseClassName(raw.className, theme));
  if (raw.style) assignDefined(out, raw.style);
  for (const k in src) {
    if (
      k === "className" ||
      k === "style" ||
      k === "focused" ||
      k === "focusedBorderColor" ||
      k === "backgroundColor" ||
      k === "color" ||
      k === "children" ||
      k === "ref" ||
      k === "key"
    ) {
      continue;
    }
    const v = src[k];
    if (v !== undefined) out[k] = v;
  }
  const bg = raw.bg ?? raw.backgroundColor;
  if (bg !== undefined) out.bg = bg;
  const fg = raw.fg ?? raw.color;
  if (fg !== undefined) out.fg = fg;
  if (raw.focused) out.borderColor = raw.focusedBorderColor ?? theme.borderFocus;
  resolveColorFields(theme, out);
  return { children: raw.children, ref: raw.ref, [SCENE_PROPS]: out as SceneNodeProps } as HostElementProps;
}

/** Single-pass host props builder for `<Text>` (avoids intermediate rest/spread objects). */
export function buildTextHostProps(
  theme: TextTheme,
  raw: {
    className?: string;
    style?: Partial<SceneNodeProps>;
    color?: ColorInput;
    fg?: ColorInput;
    align?: SceneNodeProps["textAlign"];
    children?: ReactNode;
    ref?: Ref<SceneNode>;
  },
): HostElementProps {
  let onlyClass = true;
  const src = raw as Record<string, unknown>;
  for (const k in src) {
    if (k !== "className" && k !== "children" && k !== "ref" && k !== "key" && src[k] !== undefined) {
      onlyClass = false;
      break;
    }
  }
  if (onlyClass) {
    const scene = raw.className ? parseClassName(raw.className, theme) : EMPTY_SCENE_PROPS;
    return { children: raw.children, ref: raw.ref, [SCENE_PROPS]: scene } as HostElementProps;
  }
  const out: Record<string, unknown> = {};
  if (raw.className) assignDefined(out, parseClassName(raw.className, theme));
  if (raw.style) assignDefined(out, raw.style);
  for (const k in src) {
    if (k === "className" || k === "style" || k === "color" || k === "align" || k === "children" || k === "ref" || k === "key") continue;
    const v = src[k];
    if (v !== undefined) out[k] = v;
  }
  const fg = raw.fg ?? raw.color;
  if (fg !== undefined) out.fg = fg;
  if (raw.align !== undefined) out.textAlign = raw.align;
  resolveColorFields(theme, out);
  return { children: raw.children, ref: raw.ref, [SCENE_PROPS]: out as SceneNodeProps } as HostElementProps;
}
void COLOR_KEYS;
