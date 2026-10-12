import { useMemo, useState, type ReactNode } from "react";
import { useFocus } from "../focus";
import { useInput, useViewport, useWheel } from "../hooks";
import { useMeasure } from "../hooks/measure";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { mergeStyleProps, TxBox } from "../host";
import { useTheme } from "../theme";
import type { BoxProps } from "./Box";
import { Text } from "./Text";
import { handleListKey, Scrollbar, useCursor, useWheelSteps, useWindowStart } from "./virtual";

export interface TreeNode {
  id: string;
  label: string;
  /** Dimmed trailing text (a size, a count, a status). */
  hint?: string;
  children?: readonly TreeNode[];
  /** Leading glyph override (default: `▸`/`▾` for branches, none for leaves). */
  icon?: string;
}

export interface FlatTreeNode {
  node: TreeNode;
  depth: number;
  parent: string | null;
  /** Guide prefix, e.g. `"│  ├─ "` (when `guides` is on). */
  guide: string;
  isLeaf: boolean;
  expanded: boolean;
}

/** Flatten the visible part of a tree (children of collapsed nodes are skipped). */
export function flattenTree(nodes: readonly TreeNode[], expanded: ReadonlySet<string>): FlatTreeNode[] {
  const out: FlatTreeNode[] = [];
  const walk = (list: readonly TreeNode[], depth: number, parent: string | null, prefix: string): void => {
    list.forEach((node, i) => {
      const last = i === list.length - 1;
      const isLeaf = !node.children || node.children.length === 0;
      const open = !isLeaf && expanded.has(node.id);
      out.push({ node, depth, parent, guide: depth === 0 ? "" : `${prefix}${last ? "└─ " : "├─ "}`, isLeaf, expanded: open });
      if (open) walk(node.children as readonly TreeNode[], depth + 1, node.id, depth === 0 ? "" : `${prefix}${last ? "   " : "│  "}`);
    });
  };
  walk(nodes, 0, null, "");
  return out;
}

export interface TreeProps extends Omit<BoxProps, "children" | "onSelect" | "ref" | "height"> {
  data: readonly TreeNode[];
  /** Controlled expanded ids. */
  expanded?: ReadonlySet<string>;
  defaultExpanded?: Iterable<string>;
  onExpandedChange?: (expanded: Set<string>) => void;
  /** Enter on a node. */
  onSelect?: (node: TreeNode) => void;
  onHighlight?: (node: TreeNode) => void;
  /** Draw `├─` / `└─` guides (default `true`). */
  guides?: boolean;
  /** Visible rows. Default: fill the parent. */
  height?: number;
  scrollbar?: boolean;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  isActive?: boolean;
}

/**
 * An expandable, virtualized tree. ←/→ collapse and expand (or jump to the
 * parent / first child), Space toggles, Enter selects.
 */
export function Tree(props: TreeProps): ReactNode {
  const {
    data,
    expanded: expandedProp,
    defaultExpanded,
    onExpandedChange,
    onSelect,
    onHighlight,
    guides = true,
    height,
    scrollbar = true,
    focused,
    autoFocus,
    id,
    isActive = true,
    className,
    style,
    ...rest
  } = props;
  const theme = useTheme();
  const vp = useViewport();
  const focus = useFocus({ id, autoFocus, focused, isActive });
  const active = focus.isFocused && isActive;
  const [inner, setInner] = useState<Set<string>>(() => new Set(defaultExpanded ?? []));
  const expanded = expandedProp ?? inner;
  const flat = useMemo(() => flattenTree(data, expanded), [data, expanded]);
  const [measureRef, size] = useMeasure({ enabled: height === undefined });
  const rows = Math.max(1, height ?? (size.height > 0 ? size.height : Math.min(flat.length || 1, vp.rows)));
  const [cursorId, setCursorId] = useState<string | null>(null);
  const idIndex = cursorId === null ? 0 : Math.max(0, flat.findIndex((f) => f.node.id === cursorId));
  const cursor = useCursor({
    count: flat.length,
    index: idIndex,
    onChange: (i) => {
      const f = flat[i];
      if (!f) return;
      setCursorId(f.node.id);
      onHighlight?.(f.node);
    },
  });
  const start = useWindowStart(flat.length, rows, cursor.index);
  const wheelSteps = useWheelSteps();

  const setExpanded = (next: Set<string>): void => {
    if (expandedProp === undefined) setInner(next);
    onExpandedChange?.(next);
  };
  const toggle = (nodeId: string, open?: boolean): void => {
    const next = new Set(expanded);
    const want = open ?? !next.has(nodeId);
    if (want === next.has(nodeId)) return;
    if (want) next.add(nodeId);
    else next.delete(nodeId);
    setExpanded(next);
  };

  useInput(
    (e) => {
      const cur = flat[cursor.index];
      if (handleListKey(e, cursor, Math.max(1, rows - 1), flat.length)) e.stopPropagation();
      else if (!cur) return;
      else if (e.key === "right" || (e.key === "l" && !e.ctrl)) {
        if (!cur.isLeaf && !cur.expanded) toggle(cur.node.id, true);
        else if (!cur.isLeaf) cursor.moveBy(1);
        e.stopPropagation();
      } else if (e.key === "left" || (e.key === "h" && !e.ctrl)) {
        if (cur.expanded) toggle(cur.node.id, false);
        else if (cur.parent !== null) {
          const p = flat.findIndex((f) => f.node.id === cur.parent);
          if (p >= 0) cursor.moveTo(p);
        }
        e.stopPropagation();
      } else if (e.key === "space") {
        if (!cur.isLeaf) toggle(cur.node.id);
        e.stopPropagation();
      } else if (e.key === "return") {
        if (onSelect) onSelect(cur.node);
        else if (!cur.isLeaf) toggle(cur.node.id);
        e.stopPropagation();
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  useWheel(
    (e) => {
      const n = wheelSteps(e.rows);
      if (n !== 0) cursor.moveBy(n);
      if (active) e.stopPropagation();
    },
    { isActive, priority: active ? 1 : 0 },
  );

  const outer = mergeStyleProps(theme, className, style, rest);
  const fill = height === undefined;
  const visible = flat.slice(start, start + rows);
  return (
    <TxBox
      flexDirection="row"
      flexGrow={fill ? 1 : undefined}
      flexBasis={fill ? 0 : undefined}
      flexShrink={fill ? 1 : 0}
      minHeight={1}
      {...outer}
      height={height}
      overflow="hidden"
    >
      <TxBox ref={measureRef} flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
        {visible.map((f, i) => {
          const index = start + i;
          const hi = index === cursor.index;
          const icon = f.node.icon ?? (f.isLeaf ? " " : f.expanded ? "▾" : "▸");
          return (
            <TxBox key={f.node.id} flexDirection="row" height={1} flexShrink={0} bg={hi && active ? theme.selection : undefined}>
              <Text wrap="truncate-end" flexGrow={1} flexShrink={1}>
                <Text color={theme.border}>{guides ? f.guide : "  ".repeat(f.depth)}</Text>
                <Text color={hi ? theme.accent : theme.subtle}>{`${icon} `}</Text>
                <Text color={hi ? theme.fg : f.isLeaf ? theme.muted : theme.fg} bold={hi && active}>
                  {f.node.label}
                </Text>
              </Text>
              {f.node.hint ? (
                <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
                  {` ${f.node.hint}`}
                </Text>
              ) : null}
            </TxBox>
          );
        })}
      </TxBox>
      {scrollbar ? <Scrollbar total={flat.length} visible={rows} start={start} active={active} /> : null}
    </TxBox>
  );
}
