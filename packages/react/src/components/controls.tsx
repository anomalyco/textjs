import { useState, type ReactNode } from "react";
import { useFocus } from "../focus";
import { useInput } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { useTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Text } from "./Text";

interface FocusableProps {
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  /** Respond to input and join the Tab order (default `true`). */
  isActive?: boolean;
  disabled?: boolean;
}

function useControl({ focused, autoFocus, id, isActive = true, disabled = false }: FocusableProps): { active: boolean } {
  const focus = useFocus({ id, autoFocus, focused, isActive: isActive && !disabled });
  return { active: focus.isFocused && isActive && !disabled };
}

function useToggleState(checked: boolean | undefined, defaultChecked: boolean | undefined, onChange?: (v: boolean) => void): [boolean, () => void] {
  const [inner, setInner] = useState(defaultChecked ?? false);
  const value = checked ?? inner;
  return [
    value,
    () => {
      if (checked === undefined) setInner(!value);
      onChange?.(!value);
    },
  ];
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends FocusableProps, Omit<BoxProps, "children" | "ref"> {
  children?: ReactNode;
  /** Enter or Space while focused. */
  onPress?: () => void;
  variant?: ButtonVariant;
}

/** A focusable button. Focus fills it with the accent; Enter or Space presses. */
export function Button({ children, onPress, variant = "secondary", focused, autoFocus, id, isActive, disabled, ...box }: ButtonProps): ReactNode {
  const theme = useTheme();
  const { active } = useControl({ focused, autoFocus, id, isActive, disabled });
  useInput(
    (e) => {
      if (e.key === "return" || e.key === "space") {
        e.stopPropagation();
        onPress?.();
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  const tone = variant === "danger" ? theme.danger : theme.accent;
  const bg = disabled ? undefined : active ? (variant === "ghost" ? theme.selection : tone) : variant === "ghost" ? undefined : theme.elevated;
  const fg = disabled
    ? theme.subtle
    : active
      ? variant === "ghost"
        ? theme.fg
        : variant === "danger"
          ? theme.bg
          : theme.accentFg
      : variant === "primary"
        ? theme.accent
        : variant === "danger"
          ? theme.danger
          : variant === "ghost"
            ? theme.muted
            : theme.fg;
  return (
    <Box flexDirection="row" height={1} flexShrink={0} {...box}>
      <Text bg={bg} color={fg} bold={active || variant === "primary"} wrap="nowrap" flexShrink={0} strikethrough={false}>
        {" "}
        {children}{" "}
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Checkbox / Switch
// ---------------------------------------------------------------------------

export interface CheckboxProps extends FocusableProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  /** Dimmed text after the label. */
  description?: ReactNode;
}

/** `[✓] Label` — Space or Enter toggles. */
export function Checkbox({ checked, defaultChecked, onChange, label, description, ...focusProps }: CheckboxProps): ReactNode {
  const theme = useTheme();
  const { active } = useControl(focusProps);
  const [value, toggle] = useToggleState(checked, defaultChecked, onChange);
  useInput(
    (e) => {
      if (e.key === "space" || e.key === "return") {
        e.stopPropagation();
        toggle();
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  const disabled = focusProps.disabled ?? false;
  return (
    <Text wrap="truncate-end" flexShrink={0}>
      <Text color={disabled ? theme.subtle : active ? theme.accent : value ? theme.fg : theme.subtle}>{value ? "[✓]" : "[ ]"}</Text>
      {label !== undefined ? (
        <Text color={disabled ? theme.subtle : active ? theme.fg : theme.muted} bold={active}>
          {" "}
          {label}
        </Text>
      ) : null}
      {description !== undefined ? (
        <Text color={theme.subtle}>
          {"  "}
          {description}
        </Text>
      ) : null}
    </Text>
  );
}

export interface SwitchProps extends CheckboxProps {}

/** A pill toggle: ` ●  ` off, `  ● ` on (accent). Space or Enter toggles. */
export function Switch({ checked, defaultChecked, onChange, label, description, ...focusProps }: SwitchProps): ReactNode {
  const theme = useTheme();
  const { active } = useControl(focusProps);
  const [value, toggle] = useToggleState(checked, defaultChecked, onChange);
  useInput(
    (e) => {
      if (e.key === "space" || e.key === "return" || (value && e.key === "left") || (!value && e.key === "right")) {
        e.stopPropagation();
        toggle();
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  const disabled = focusProps.disabled ?? false;
  const track = disabled ? theme.border : value ? theme.accent : active ? theme.subtle : theme.border;
  const knob = value ? theme.accentFg : theme.fg;
  return (
    <Text wrap="truncate-end" flexShrink={0}>
      <Text bg={track} color={knob}>
        {value ? "  ● " : " ●  "}
      </Text>
      {label !== undefined ? (
        <Text color={disabled ? theme.subtle : active ? theme.fg : theme.muted} bold={active}>
          {" "}
          {label}
        </Text>
      ) : null}
      {description !== undefined ? (
        <Text color={theme.subtle}>
          {"  "}
          {description}
        </Text>
      ) : null}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// RadioGroup
// ---------------------------------------------------------------------------

export interface RadioOption<V = string> {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps<V = string> extends FocusableProps, Omit<BoxProps, "children" | "onChange" | "ref"> {
  options: ReadonlyArray<RadioOption<V>>;
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /** Stack vertically (default) or lay out in a row. */
  orientation?: "vertical" | "horizontal";
}

/** `(•) One  ( ) Two` — arrows move the selection; it follows the cursor. */
export function RadioGroup<V = string>({
  options,
  value,
  defaultValue,
  onChange,
  orientation = "vertical",
  focused,
  autoFocus,
  id,
  isActive,
  disabled,
  ...box
}: RadioGroupProps<V>): ReactNode {
  const theme = useTheme();
  const { active } = useControl({ focused, autoFocus, id, isActive, disabled });
  const [inner, setInner] = useState<V | undefined>(defaultValue ?? options.find((o) => !o.disabled)?.value);
  const current = value === undefined ? inner : value;
  const idx = options.findIndex((o) => o.value === current);
  const select = (i: number): void => {
    const o = options[i];
    if (!o || o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.(o.value);
  };
  useInput(
    (e) => {
      const prev = orientation === "vertical" ? e.key === "up" || e.key === "k" : e.key === "left" || e.key === "h";
      const next = orientation === "vertical" ? e.key === "down" || e.key === "j" : e.key === "right" || e.key === "l";
      if (!prev && !next) return;
      e.stopPropagation();
      const dir = next ? 1 : -1;
      for (let i = idx + dir; i >= 0 && i < options.length; i += dir) {
        if (!(options[i] as RadioOption<V>).disabled) {
          select(i);
          return;
        }
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  return (
    <Box flexDirection={orientation === "vertical" ? "column" : "row"} columnGap={2} flexShrink={0} {...box}>
      {options.map((o, i) => {
        const on = i === idx;
        const off = o.disabled || disabled;
        return (
          <Text key={String(o.value)} wrap="truncate-end" flexShrink={0}>
            <Text color={off ? theme.subtle : on ? (active ? theme.accent : theme.fg) : theme.subtle}>{on ? "(•)" : "( )"}</Text>
            <Text color={off ? theme.subtle : on ? theme.fg : theme.muted} bold={on && active} strikethrough={o.disabled}>
              {` ${o.label}`}
            </Text>
            {o.description ? <Text color={theme.subtle}>{`  ${o.description}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

export interface SliderProps extends FocusableProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** Arrow-key increment (default `(max - min) / 20`). Shift+arrow moves 5 steps. */
  step?: number;
  /** Track width in cells (default `24`). */
  width?: number;
  label?: ReactNode;
  /** Show the value after the track (default `true`). */
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

/** `━━━━━━●──────── 40` — ←/→ adjust, Home/End jump. */
export function Slider({
  value,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step,
  width = 24,
  label,
  showValue = true,
  formatValue = (v) => String(Math.round(v * 100) / 100),
  ...focusProps
}: SliderProps): ReactNode {
  const theme = useTheme();
  const { active } = useControl(focusProps);
  const [inner, setInner] = useState(defaultValue ?? min);
  const v = Math.max(min, Math.min(max, value ?? inner));
  const inc = step ?? (max - min) / 20;
  const set = (next: number): void => {
    const snapped = Math.max(min, Math.min(max, Math.round((next - min) / inc) * inc + min));
    if (snapped === v) return;
    if (value === undefined) setInner(snapped);
    onChange?.(snapped);
  };
  useInput(
    (e) => {
      const n = e.shift ? 5 : 1;
      if (e.key === "left" || e.key === "h" || e.key === "down") set(v - inc * n);
      else if (e.key === "right" || e.key === "l" || e.key === "up") set(v + inc * n);
      else if (e.key === "home") set(min);
      else if (e.key === "end") set(max);
      else return;
      e.stopPropagation();
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  const ratio = max > min ? (v - min) / (max - min) : 0;
  const knob = Math.round(ratio * (width - 1));
  const disabled = focusProps.disabled ?? false;
  const fill = disabled ? theme.subtle : active ? theme.accent : theme.muted;
  return (
    <Text wrap="nowrap" flexShrink={0}>
      {label !== undefined ? (
        <Text color={active ? theme.fg : theme.muted} bold={active}>
          {label}{" "}
        </Text>
      ) : null}
      <Text color={fill}>{"━".repeat(knob)}</Text>
      <Text color={active ? theme.fg : fill}>●</Text>
      <Text color={theme.border}>{"─".repeat(Math.max(0, width - knob - 1))}</Text>
      {showValue ? <Text color={theme.muted}>{` ${formatValue(v)}`}</Text> : null}
    </Text>
  );
}
