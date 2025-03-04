import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFocus } from "../focus";
import { useInput } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { useTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Text } from "./Text";

export interface SelectOption<V = string> {
  value: V;
  label: string;
  description?: string;
  /** Right-aligned hint (e.g. a shortcut or model size). */
  hint?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SelectProps<V = string> extends Omit<BoxProps, "children" | "onChange" | "ref"> {
  options: ReadonlyArray<SelectOption<V>>;
  /** Currently selected value (marked with `●`). */
  value?: V;
  /** Called on Enter with the highlighted option. */
  onChange?: (value: V, option: SelectOption<V>) => void;
  /** Called whenever the highlighted option changes. */
  onHighlight?: (value: V, option: SelectOption<V>) => void;
  /** Visible rows before windowing (default `8`). */
  limit?: number;
  /** Show a filter line; typing narrows the options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Show option descriptions inline (default `true`). */
  showDescriptions?: boolean;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  isActive?: boolean;
}

function matches<V>(o: SelectOption<V>, q: string): boolean {
  if (q.length === 0) return true;
  const needle = q.toLowerCase();
  return o.label.toLowerCase().includes(needle) || (o.description?.toLowerCase().includes(needle) ?? false) || String(o.value).toLowerCase().includes(needle);
}

function firstEnabled<V>(list: ReadonlyArray<SelectOption<V>>, from: number, dir: 1 | -1): number {
  for (let i = from; i >= 0 && i < list.length; i += dir) if (!(list[i] as SelectOption<V>).disabled) return i;
  return -1;
}

/** Keyboard-driven option list with optional search filtering and viewport windowing. */
export function Select<V = string>(props: SelectProps<V>): ReactNode {
  const {
    options,
    value,
    onChange,
    onHighlight,
    limit = 8,
    searchable = false,
    searchPlaceholder = "Type to filter…",
    emptyText = "No matches",
    showDescriptions = true,
    focused,
    autoFocus,
    id,
    isActive = true,
    ...boxProps
  } = props;
  const theme = useTheme();
  const focus = useFocus({ id, autoFocus, focused, isActive });
  const active = focus.isFocused && isActive;
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query]);
  const [highlight, setHighlight] = useState(() => {
    const sel = value === undefined ? -1 : options.findIndex((o) => o.value === value);
    return sel >= 0 ? sel : Math.max(0, firstEnabled(options, 0, 1));
  });
  const windowStart = useRef(0);
  const index = filtered.length === 0 ? -1 : Math.min(highlight, filtered.length - 1);
  const latest = useRef({ filtered, index });
  latest.current = { filtered, index };

  const move = (to: number): void => {
    const { filtered: list } = latest.current;
    if (list.length === 0) return;
    const clamped = Math.max(0, Math.min(list.length - 1, to));
    const dir: 1 | -1 = to >= latest.current.index ? 1 : -1;
    let next = firstEnabled(list, clamped, dir);
    if (next < 0) next = firstEnabled(list, clamped, dir === 1 ? -1 : 1);
    if (next < 0 || next === latest.current.index) return;
    latest.current = { filtered: list, index: next };
    setHighlight(next);
    const o = list[next] as SelectOption<V>;
    onHighlight?.(o.value, o);
  };

  useInput(
    (e) => {
      const { filtered: list, index: cur } = latest.current;
      const page = Math.max(1, limit - 1);
      let handled = true;
      if (e.key === "up" || (!searchable && e.key === "k" && !e.ctrl) || (e.ctrl && e.key === "p")) move(cur - 1);
      else if (e.key === "down" || (!searchable && e.key === "j" && !e.ctrl) || (e.ctrl && e.key === "n")) move(cur + 1);
      else if (e.key === "pageup") move(cur - page);
      else if (e.key === "pagedown") move(cur + page);
      else if (e.key === "home") move(0);
      else if (e.key === "end") move(list.length - 1);
      else if (e.key === "return") {
        const o = list[cur];
        if (o && !o.disabled) onChange?.(o.value, o);
      } else if (searchable && e.key === "backspace") setQuery((q) => q.slice(0, -1));
      else if (searchable && e.ctrl && e.key === "u") setQuery("");
      else if (searchable && e.key === "escape" && query.length > 0) setQuery("");
      else if (searchable && e.input.length > 0 && !e.ctrl && !e.meta) {
        setQuery((q) => q + e.input);
        setHighlight(0);
      } else handled = false;
      if (handled) e.stopPropagation();
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  const rows = Math.max(1, limit);
  let start = windowStart.current;
  if (index >= 0) {
    if (index < start) start = index;
    else if (index >= start + rows) start = index - rows + 1;
  }
  start = Math.max(0, Math.min(start, filtered.length - rows));
  windowStart.current = start;
  const visible = filtered.slice(start, start + rows);
  const above = start;
  const below = Math.max(0, filtered.length - start - rows);

  return (
    <Box flexDirection="column" flexShrink={0} {...boxProps}>
      {searchable ? (
        <Box height={1} flexShrink={0}>
          <Text color={active ? theme.accent : theme.subtle} wrap="nowrap">
            {"/ "}
          </Text>
          <Text color={query ? theme.fg : theme.subtle} wrap="truncate-end">
            {query || searchPlaceholder}
            {active ? <Text inverse>{"\u00a0"}</Text> : null}
          </Text>
        </Box>
      ) : null}
      {above > 0 ? (
        <Text color={theme.subtle} wrap="nowrap">
          {`  ↑ ${above} more`}
        </Text>
      ) : null}
      {filtered.length === 0 ? (
        <Text color={theme.subtle} italic>
          {`  ${emptyText}`}
        </Text>
      ) : null}
      {visible.map((o, i) => {
        const idx = start + i;
        const isHi = idx === index;
        const isSel = value !== undefined && o.value === value;
        const rowBg = isHi && active ? theme.selection : undefined;
        return (
          <Box key={`${String(o.value)}:${idx}`} height={1} flexShrink={0} bg={rowBg} flexDirection="row">
            <Text color={isHi ? theme.accent : theme.subtle} wrap="nowrap" flexShrink={0}>
              {isHi ? "› " : "  "}
            </Text>
            <Text
              color={o.disabled ? theme.subtle : isHi ? theme.fg : theme.muted}
              bold={isHi}
              strikethrough={o.disabled}
              wrap="truncate-end"
              flexShrink={1}
            >
              {o.label}
              {isSel ? <Text color={theme.success}> ●</Text> : null}
              {o.badge ? <Text color={theme.accent}>{` [${o.badge}]`}</Text> : null}
              {showDescriptions && o.description ? <Text color={theme.subtle}>{`  ${o.description}`}</Text> : null}
            </Text>
            <Box flexGrow={1} />
            {o.hint ? (
              <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
                {` ${o.hint}`}
              </Text>
            ) : null}
          </Box>
        );
      })}
      {below > 0 ? (
        <Text color={theme.subtle} wrap="nowrap">
          {`  ↓ ${below} more`}
        </Text>
      ) : null}
    </Box>
  );
}
