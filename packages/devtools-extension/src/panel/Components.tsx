import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DevToolsTreeNode } from "../protocol";
import { Caret, RefreshIcon } from "./icons";
import type { PanelState, PanelStore } from "./store";

interface Row {
  node: DevToolsTreeNode;
  depth: number;
  hasChildren: boolean;
}

/** Visible rows after host filtering, text filtering and collapsing. */
function visibleRows(nodes: DevToolsTreeNode[], showHosts: boolean, filter: string, collapsed: Set<number>): Row[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const shown = (n: DevToolsTreeNode): boolean => showHosts || (n.kind !== "host" && n.kind !== "text");
  const visibleParent = (n: DevToolsTreeNode): DevToolsTreeNode | null => {
    let p = n.parent === null ? null : (byId.get(n.parent) ?? null);
    while (p && !shown(p)) p = p.parent === null ? null : (byId.get(p.parent) ?? null);
    return p;
  };
  const q = filter.trim().toLowerCase();
  const match = (n: DevToolsTreeNode): boolean =>
    n.name.toLowerCase().includes(q) || (n.scene?.label ?? "").toLowerCase().includes(q) || (n.scene?.text ?? "").toLowerCase().includes(q);
  // With a filter, keep matches and their ancestors.
  let keep: Set<number> | null = null;
  if (q) {
    keep = new Set();
    for (const n of nodes) {
      if (!shown(n) || !match(n)) continue;
      for (let a: DevToolsTreeNode | null = n; a && !keep.has(a.id); a = visibleParent(a)) keep.add(a.id);
    }
  }
  const depth = new Map<number, number>();
  const hasKids = new Set<number>();
  const rows: Row[] = [];
  for (const n of nodes) {
    if (!shown(n)) continue;
    const vp = visibleParent(n);
    if (vp) hasKids.add(vp.id);
  }
  for (const n of nodes) {
    if (!shown(n)) continue;
    const vp = visibleParent(n);
    const d = vp ? (depth.get(vp.id) ?? 0) + 1 : 0;
    depth.set(n.id, d);
    if (keep && !keep.has(n.id)) continue;
    let hidden = false;
    for (let a = vp; a; a = visibleParent(a)) {
      if (collapsed.has(a.id)) {
        hidden = true;
        break;
      }
    }
    if (hidden) continue;
    rows.push({ node: n, depth: d, hasChildren: hasKids.has(n.id) });
  }
  return rows;
}

export function Components({ store, state }: { store: PanelStore; state: PanelState }): ReactNode {
  const tree = state.tree;
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const rows = useMemo(() => (tree ? visibleRows(tree.nodes, state.showHosts, state.filter, collapsed) : []), [tree, state.showHosts, state.filter, collapsed]);
  const selected = tree?.nodes.find((n) => n.id === state.selected) ?? null;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.selected === null) return;
    listRef.current?.querySelector(`[data-id="${state.selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [state.selected]);

  const toggle = (id: number): void => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  };

  const onKey = (e: React.KeyboardEvent): void => {
    if (rows.length === 0) return;
    const i = rows.findIndex((r) => r.node.id === state.selected);
    const row = rows[i];
    if (e.key === "ArrowDown") store.select(rows[Math.min(rows.length - 1, i + 1)]!.node.id);
    else if (e.key === "ArrowUp") store.select(rows[Math.max(0, i - 1)]!.node.id);
    else if (e.key === "ArrowLeft" && row) {
      if (row.hasChildren && !collapsed.has(row.node.id)) toggle(row.node.id);
      else if (row.node.parent !== null) store.select(rows.slice(0, i).reverse().find((r) => r.depth < row.depth)?.node.id ?? row.node.id);
    } else if (e.key === "ArrowRight" && row && collapsed.has(row.node.id)) toggle(row.node.id);
    else return;
    e.preventDefault();
  };

  return (
    <div className="split">
      <section className="pane tree-pane">
        <div className="pane-head">
          <input className="input search" placeholder="Filter components" value={state.filter} onChange={(e) => store.set({ filter: e.target.value })} spellCheck={false} />
          <label className="check">
            <input type="checkbox" checked={state.showHosts} onChange={(e) => store.set({ showHosts: e.target.checked })} />
            Host nodes
          </label>
          <button className="icon-btn" title="Refresh tree" aria-label="Refresh tree" onClick={() => store.fetchTree()}>
            <RefreshIcon />
          </button>
        </div>
        <div className="tree" ref={listRef} tabIndex={0} onKeyDown={onKey} onMouseLeave={() => store.unhover()} role="tree">
          {tree === null ? <p className="muted pad">Loading tree…</p> : null}
          {tree && rows.length === 0 ? <p className="muted pad">No matches.</p> : null}
          {rows.map(({ node, depth, hasChildren }) => (
            <div
              key={node.id}
              data-id={node.id}
              role="treeitem"
              aria-selected={node.id === state.selected}
              className={`row kind-${node.kind}${node.id === state.selected ? " selected" : ""}`}
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => store.select(node.id)}
              onMouseEnter={() => store.highlight(store.sceneFor(node.id))}
            >
              <span
                className="caret"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) toggle(node.id);
                }}
              >
                {hasChildren ? <Caret open={!collapsed.has(node.id)} /> : null}
              </span>
              <NodeLabel node={node} />
            </div>
          ))}
        </div>
      </section>
      <section className="pane inspector">{selected ? <Inspector node={selected} store={store} state={state} /> : <p className="muted pad">Select a component to inspect its props, hooks and layout.</p>}</section>
    </div>
  );
}

function NodeLabel({ node }: { node: DevToolsTreeNode }): ReactNode {
  if (node.kind === "text") return <span className="name text-node">{JSON.stringify(node.scene?.text ?? "")}</span>;
  return (
    <>
      <span className="name">{node.name}</span>
      {node.kind === "host" && node.scene?.label ? <span className="label">{node.scene.label}</span> : null}
      {node.key !== null ? <span className="key">{`key="${node.key}"`}</span> : null}
    </>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }): ReactNode {
  return (
    <div className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

function KV({ entries }: { entries: Array<[string, string]> }): ReactNode {
  if (entries.length === 0) return <p className="muted small">None</p>;
  return (
    <dl className="kv">
      {entries.map(([k, v], i) => (
        <div key={`${k}-${i}`} className="kv-row">
          <dt>{k}</dt>
          <dd className="mono" title={v}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const HOOK_NAMES: Record<string, string> = {
  state: "State",
  reducer: "Reducer",
  store: "SyncExternalStore",
  effect: "Effect",
  "layout-effect": "LayoutEffect",
  "insertion-effect": "InsertionEffect",
  memo: "Memo",
  callback: "Callback",
  ref: "Ref",
  id: "Id",
  hook: "Hook",
};

function Inspector({ node, store, state }: { node: DevToolsTreeNode; store: PanelStore; state: PanelState }): ReactNode {
  const tree = state.tree!;
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const owners: DevToolsTreeNode[] = [];
  for (let p = node.parent === null ? undefined : byId.get(node.parent); p; p = p.parent === null ? undefined : byId.get(p.parent)) {
    if (p.kind === "component") owners.push(p);
    if (owners.length >= 8) break;
  }
  const sceneId = store.sceneFor(node.id);
  const scene = node.scene ?? tree.nodes.find((n) => n.scene?.id === sceneId)?.scene ?? null;

  return (
    <div className="inspector-body">
      <div className="inspector-head">
        <h2 className={node.kind === "host" || node.kind === "text" ? "mono" : undefined}>{node.kind === "text" ? "#text" : node.name}</h2>
        <span className="badge">{node.kind}</span>
        {node.key !== null ? <span className="key">{`key="${node.key}"`}</span> : null}
      </div>
      {node.kind !== "text" ? (
        <Section title="Props">
          <KV entries={Object.entries(node.props)} />
        </Section>
      ) : (
        <Section title="Text">
          <p className="mono small wrap">{node.scene?.text ?? ""}</p>
        </Section>
      )}
      {node.hooks.length > 0 ? (
        <Section title="Hooks">
          <KV entries={node.hooks.map((h, i) => [`${i} ${HOOK_NAMES[h.kind] ?? h.kind}`, h.value])} />
        </Section>
      ) : null}
      {node.state !== null ? (
        <Section title="State">
          <p className="mono small wrap">{node.state}</p>
        </Section>
      ) : null}
      {scene ? (
        <Section title={node.scene ? "Scene node" : "Host scene node"} aside={<span className="muted small mono">{`#${scene.id} ${scene.type}${scene.label ? ` · ${scene.label}` : ""}`}</span>}>
          <BoxModel layout={scene.layout} content={scene.content} painted={scene.painted} />
        </Section>
      ) : null}
      {owners.length > 0 ? (
        <Section title="Rendered by">
          <ul className="owners">
            {owners.map((o) => (
              <li key={o.id}>
                <button className="link" onClick={() => store.select(o.id)} onMouseEnter={() => store.highlight(store.sceneFor(o.id))} onMouseLeave={() => store.unhover()}>
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function BoxModel({ layout, content, painted }: { layout: { x: number; y: number; width: number; height: number }; content: { x: number; y: number; width: number; height: number }; painted: boolean }): ReactNode {
  const inset = {
    top: content.y - layout.y,
    left: content.x - layout.x,
    right: layout.x + layout.width - (content.x + content.width),
    bottom: layout.y + layout.height - (content.y + content.height),
  };
  return (
    <div className="boxmodel">
      <div className="bm-outer">
        <span className="bm-tag">box</span>
        <span className="bm-edge top">{inset.top || "–"}</span>
        <span className="bm-edge left">{inset.left || "–"}</span>
        <span className="bm-edge right">{inset.right || "–"}</span>
        <span className="bm-edge bottom">{inset.bottom || "–"}</span>
        <div className="bm-content mono">{`${content.width} × ${content.height}`}</div>
      </div>
      <dl className="kv compact">
        <div className="kv-row">
          <dt>position</dt>
          <dd className="mono">{`${layout.x}, ${layout.y}`}</dd>
        </div>
        <div className="kv-row">
          <dt>size</dt>
          <dd className="mono">{`${layout.width} × ${layout.height} cells`}</dd>
        </div>
        <div className="kv-row">
          <dt>painted</dt>
          <dd className="mono">{painted ? "yes" : "no (culled or hidden)"}</dd>
        </div>
      </dl>
    </div>
  );
}
