import { useRef, useState, type ReactNode } from "react";
import { stringWidth } from "@textjs/core";
import type { Scope } from "../context";
import { useRuntime } from "../context";
import { useKeymap, useKeymapBindings, type RegisteredBinding } from "../keymap";
import { formatKeys } from "../keys";
import { useTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Modal } from "./Modal";
import { KeyHint } from "./primitives";
import { ScrollBox } from "./ScrollBox";
import { Text } from "./Text";

export interface KbdProps {
  children: string;
  /** Format combo strings (`"mod+k"` → `⌘K`). Default `true`. */
  format?: boolean;
}

/** An inline keyboard key: ` ⌘K `. */
export function Kbd({ children, format = true }: KbdProps): ReactNode {
  const theme = useTheme();
  let text = children;
  if (format) {
    try {
      text = formatKeys(children);
    } catch {
      text = children;
    }
  }
  return (
    <Text bg={theme.elevated} color={theme.fg} wrap="nowrap" flexShrink={0}>
      {` ${text} `}
    </Text>
  );
}

export interface KeyHintItem {
  keys: string;
  label: string;
}

export interface KeyHintsProps extends Omit<BoxProps, "children" | "ref"> {
  /** Explicit hints. Omit to show keymap bindings marked `hint: true`. */
  items?: readonly KeyHintItem[];
  /** Cells between hints (default `2`). */
  gap?: number;
}

/** A row of `key label` hints, auto-collected from `useKeymap` bindings with `hint: true`. */
export function KeyHints({ items, gap = 2, ...box }: KeyHintsProps): ReactNode {
  const bindings = useKeymapBindings();
  const list = items ?? bindings.filter((b) => b.hint).map((b) => ({ keys: b.keys, label: b.label }));
  return (
    <Box flexDirection="row" height={1} flexShrink={0} columnGap={gap} overflow="hidden" {...box}>
      {list.map((h) => (
        <KeyHint key={`${h.keys}:${h.label}`} keys={safeFormat(h.keys)} label={h.label} />
      ))}
    </Box>
  );
}

function safeFormat(keys: string): string {
  try {
    return formatKeys(keys);
  } catch {
    return keys;
  }
}

export interface StatusBarProps extends Omit<BoxProps, "children" | "ref" | "right"> {
  /** Left-aligned content. */
  children?: ReactNode;
  /** Right-aligned content. */
  right?: ReactNode;
}

/** A one-row footer with left and right slots on the surface color. */
export function StatusBar({ children, right, ...box }: StatusBarProps): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="row" height={1} flexShrink={0} paddingX={1} columnGap={2} bg={theme.surface} overflow="hidden" {...box}>
      <Box flexDirection="row" columnGap={2} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
        {children}
      </Box>
      {right !== undefined ? (
        <Box flexDirection="row" columnGap={2} flexShrink={0}>
          {right}
        </Box>
      ) : null}
    </Box>
  );
}

export interface KeyHelpProps {
  /** Keys that toggle the overlay (default `"?"`). */
  keys?: string;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
}

/**
 * A `?` overlay listing every labeled `useKeymap` binding, grouped. It lists
 * what is live where it opened: bindings hidden by a modal stay hidden.
 */
export function KeyHelp({ keys = "?", open: openProp, onOpenChange, title = "Keyboard shortcuts" }: KeyHelpProps): ReactNode {
  const rt = useRuntime();
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const trapRef = useRef<Scope | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) trapRef.current = rt.focus.topTrap;
  wasOpen.current = open;
  const trap = trapRef.current;
  const setOpen = (v: boolean): void => {
    if (openProp === undefined) setInner(v);
    onOpenChange?.(v);
  };
  useKeymap({ [keys]: { label: "Keyboard shortcuts", run: () => setOpen(!open), group: "Help" } }, { isActive: !open });
  if (!open) return null;
  return <KeyHelpPanel trap={trap} title={title} keys={keys} onClose={() => setOpen(false)} />;
}

function KeyHelpPanel({ trap, title, keys, onClose }: { trap: Scope | null; title: string; keys: string; onClose: () => void }): ReactNode {
  const theme = useTheme();
  const bindings = useKeymapBindings({ trap });
  const groups = new Map<string, RegisteredBinding[]>();
  for (const b of bindings) {
    const list = groups.get(b.group) ?? [];
    if (!list.some((x) => x.keys === b.keys && x.label === b.label)) list.push(b);
    groups.set(b.group, list);
  }
  const keyW = Math.max(6, ...bindings.map((b) => stringWidth(safeFormat(b.keys))));
  return (
    <Modal title={title} onClose={onClose} width={Math.min(64, keyW + 40)} maxHeight="90%">
      <CloseKeys keys={keys} onClose={onClose} />
      <ScrollBox focusable autoFocus showScrollbar flexShrink={1} minHeight={1}>
        {[...groups.entries()].map(([group, list], gi) => (
          <Box key={group} flexDirection="column" flexShrink={0} marginTop={gi === 0 ? 0 : 1}>
            <Text color={theme.subtle} wrap="nowrap">
              {group}
            </Text>
            {list.map((b) => (
              <Box key={b.id} flexDirection="row" height={1} flexShrink={0}>
                <Text color={theme.fg} bold width={keyW + 2} wrap="nowrap" flexShrink={0}>
                  {safeFormat(b.keys)}
                </Text>
                <Text color={theme.muted} wrap="truncate-end">
                  {b.label}
                </Text>
              </Box>
            ))}
          </Box>
        ))}
        {bindings.length === 0 ? (
          <Text color={theme.subtle} italic>
            No shortcuts
          </Text>
        ) : null}
      </ScrollBox>
    </Modal>
  );
}

function CloseKeys({ keys, onClose }: { keys: string; onClose: () => void }): ReactNode {
  useKeymap({ [keys]: onClose, q: onClose });
  return null;
}
