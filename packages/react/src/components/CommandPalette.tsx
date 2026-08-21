import { useMemo, useRef, useState, type ReactNode } from "react";
import type { Dimension } from "@textjs/core";
import type { Scope } from "../context";
import { useRuntime } from "../context";
import { fuzzyFilter, type FuzzyMatch } from "../fuzzy";
import { useInput } from "../hooks";
import { FOCUSED_INPUT_PRIORITY, type KeyEvent } from "../input-manager";
import { useKeymap, useKeymapBindings } from "../keymap";
import { formatKeys, keyEventFromCombo } from "../keys";
import { useTheme } from "../theme";
import { Box } from "./Box";
import { Modal } from "./Modal";
import { Text } from "./Text";
import { Scrollbar, useWindowStart } from "./virtual";

export interface Command {
  id: string;
  label: string;
  /** Dimmed section name shown on the right. */
  group?: string;
  /** Shortcut to display (e.g. `"ctrl+s"`). */
  keys?: string;
  /** Extra search terms. */
  keywords?: readonly string[];
  disabled?: boolean;
  run: () => void;
}

export interface CommandPaletteProps {
  commands?: readonly Command[];
  /** Keys that open the palette (default `"ctrl+k, ctrl+p"`). Pass `null` to disable. */
  keys?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Also list labeled `useKeymap` bindings (default `true`). */
  includeKeymap?: boolean;
  placeholder?: string;
  /** Visible results (default `8`). */
  limit?: number;
  width?: Dimension;
  emptyText?: string;
}

function syntheticEvent(keys: string): KeyEvent {
  let base;
  try {
    base = keyEventFromCombo(keys.split(",")[0]?.trim().split(/\s+/).pop() ?? keys);
  } catch {
    base = keyEventFromCombo("return");
  }
  return { ...base, stopPropagation() {}, propagationStopped: false };
}

function safeFormat(keys: string): string {
  try {
    return formatKeys(keys);
  } catch {
    return keys;
  }
}

/**
 * A fuzzy command launcher (`Ctrl+K`). Lists your commands plus every labeled
 * `useKeymap` binding, so shortcuts are discoverable by name.
 */
export function CommandPalette({
  commands = [],
  keys = "ctrl+k, ctrl+p",
  open: openProp,
  onOpenChange,
  includeKeymap = true,
  placeholder = "Type a command…",
  limit = 8,
  width = 64,
  emptyText = "No matching commands",
}: CommandPaletteProps): ReactNode {
  const rt = useRuntime();
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  // Capture the trap the palette opens over (before its own modal pushes one).
  const trap = useRef<Scope | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) trap.current = rt.focus.topTrap;
  wasOpen.current = open;
  const setOpen = (v: boolean): void => {
    if (openProp === undefined) setInner(v);
    onOpenChange?.(v);
  };
  useKeymap(keys === null ? {} : { [keys]: { label: "Command palette", run: () => setOpen(true), group: "General", command: false } }, {
    isActive: !open,
  });
  if (!open) return null;
  return (
    <Palette
      commands={commands}
      includeKeymap={includeKeymap}
      trap={trap.current}
      placeholder={placeholder}
      limit={limit}
      width={width}
      emptyText={emptyText}
      onClose={() => setOpen(false)}
    />
  );
}

interface PaletteProps {
  commands: readonly Command[];
  includeKeymap: boolean;
  trap: Scope | null;
  placeholder: string;
  limit: number;
  width: Dimension;
  emptyText: string;
  onClose: () => void;
}

function Palette(props: PaletteProps): ReactNode {
  return (
    <Modal onClose={props.onClose} width={props.width} footer="↑↓ navigate  ↵ run  esc close">
      <PaletteBody {...props} />
    </Modal>
  );
}

// Rendered inside the modal so its key handler lives in the modal's input scope.
function PaletteBody({ commands, includeKeymap, trap, placeholder, limit, emptyText, onClose }: PaletteProps): ReactNode {
  const theme = useTheme();
  const bindings = useKeymapBindings({ trap });
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const all = useMemo<Command[]>(() => {
    const out: Command[] = commands.filter((c) => !c.disabled);
    if (includeKeymap) {
      const seen = new Set(out.map((c) => c.label));
      for (const b of bindings) {
        if (!b.command || seen.has(b.label)) continue;
        seen.add(b.label);
        out.push({ id: b.id, label: b.label, group: b.group, keys: b.keys, run: () => b.run(syntheticEvent(b.keys)) });
      }
    }
    return out;
  }, [commands, bindings, includeKeymap]);

  const results = useMemo(
    () => fuzzyFilter(query, all, (c) => (c.keywords ? `${c.label} ${c.keywords.join(" ")}` : c.label)),
    [query, all],
  );
  const cur = results.length === 0 ? -1 : Math.min(index, results.length - 1);
  const rows = Math.max(1, Math.min(limit, results.length));
  const start = useWindowStart(results.length, rows, cur);

  const run = (c: Command): void => {
    onClose();
    queueMicrotask(c.run);
  };

  useInput(
    (e) => {
      const n = results.length;
      if (e.key === "up" || (e.ctrl && e.key === "p")) setIndex(n === 0 ? 0 : (cur - 1 + n) % n);
      else if (e.key === "down" || (e.ctrl && e.key === "n") || (e.key === "tab" && !e.shift)) setIndex(n === 0 ? 0 : (cur + 1) % n);
      else if (e.key === "tab" && e.shift) setIndex(n === 0 ? 0 : (cur - 1 + n) % n);
      else if (e.key === "pageup") setIndex(Math.max(0, cur - rows));
      else if (e.key === "pagedown") setIndex(Math.min(n - 1, cur + rows));
      else if (e.key === "return") {
        const hit = results[cur];
        if (hit) run(hit.item);
      } else if (e.key === "backspace") {
        setQuery((q) => q.slice(0, -1));
        setIndex(0);
      } else if (e.ctrl && e.key === "u") {
        setQuery("");
        setIndex(0);
      } else if (e.ctrl && e.key === "w") {
        setQuery((q) => q.replace(/\s*\S+\s*$/, ""));
        setIndex(0);
      } else if (e.input.length > 0 && !e.ctrl && !e.meta) {
        setQuery((q) => q + e.input);
        setIndex(0);
      } else return;
      e.stopPropagation();
    },
    { priority: FOCUSED_INPUT_PRIORITY },
  );

  const visible = results.slice(start, start + rows);
  return (
    <>
      <Box flexDirection="row" height={1} flexShrink={0}>
        <Text color={theme.accent} wrap="nowrap" flexShrink={0}>
          {"› "}
        </Text>
        <Text color={query ? theme.fg : theme.subtle} wrap="truncate-start">
          {query || placeholder}
        </Text>
        {query ? <Text inverse>{"\u00a0"}</Text> : null}
      </Box>
      <Box height={1} flexShrink={0} />
      <Box flexDirection="row" flexShrink={0} height={Math.max(1, Math.min(limit, all.length))}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          {results.length === 0 ? (
            <Text color={theme.subtle} italic wrap="nowrap">
              {emptyText}
            </Text>
          ) : null}
          {visible.map(({ item, match }, i) => {
            const hi = start + i === cur;
            return (
              <Box key={item.id} flexDirection="row" height={1} flexShrink={0} bg={hi ? theme.selection : undefined} paddingX={1}>
                <Highlighted text={item.label} match={match} active={hi} />
                <Box flexGrow={1} minWidth={1} />
                {item.keys ? (
                  <Text color={hi ? theme.muted : theme.subtle} wrap="nowrap" flexShrink={0}>
                    {safeFormat(item.keys)}
                  </Text>
                ) : item.group ? (
                  <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
                    {item.group}
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </Box>
        <Scrollbar total={results.length} visible={rows} start={start} active />
      </Box>
    </>
  );
}

function Highlighted({ text, match, active }: { text: string; match: FuzzyMatch; active: boolean }): ReactNode {
  const theme = useTheme();
  const base = active ? theme.fg : theme.muted;
  if (match.indices.length === 0) {
    return (
      <Text color={base} wrap="truncate-end" flexShrink={1}>
        {text}
      </Text>
    );
  }
  const marks = new Set(match.indices);
  const parts: Array<{ text: string; on: boolean }> = [];
  for (let i = 0; i < text.length; i++) {
    const on = marks.has(i);
    const last = parts[parts.length - 1];
    if (last && last.on === on) last.text += text[i];
    else parts.push({ text: text[i] as string, on });
  }
  return (
    <Text color={base} wrap="truncate-end" flexShrink={1}>
      {parts.map((p, i) =>
        p.on ? (
          <Text key={i} color={theme.accent} bold>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}
