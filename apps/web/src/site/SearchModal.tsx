import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { docPath, searchDocs } from "../docs/registry";
import { navigate } from "../router";
import { SearchIcon } from "./icons";
import { useScrollLock } from "./Sheet";

interface Item {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
}

const PAGES: Item[] = [
  { key: "p:/", group: "Pages", label: "Home", sub: "textjs.org", href: "/" },
  { key: "p:/docs", group: "Pages", label: "Documentation", sub: "/docs", href: "/docs" },
  { key: "p:/playground", group: "Pages", label: "Playground", sub: "/playground", href: "/playground" },
  { key: "p:/opencode", group: "Pages", label: "OpenCode in Console", sub: "/opencode", href: "/opencode" },
  { key: "p:/showcase", group: "Pages", label: "Showcase", sub: "/showcase", href: "/showcase" },
];

const openListeners = new Set<(open: boolean) => void>();

export function openSearch(): void {
  for (const l of openListeners) l(true);
}

export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const l = (v: boolean): void => setOpen(v);
    openListeners.add(l);
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      openListeners.delete(l);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = q ? PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.href.includes(q)) : PAGES;
    const docs = searchDocs(query, 14).map<Item>((h) => ({
      key: `d:${h.doc.slug}:${h.heading?.id ?? ""}`,
      group: "Documentation",
      label: h.heading ? h.heading.text : h.doc.title,
      sub: h.heading ? h.doc.title : h.doc.category,
      href: `${docPath(h.doc.slug)}${h.heading ? `#${h.heading.id}` : ""}`,
    }));
    return [...pages, ...docs];
  }, [query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const go = (item: Item | undefined): void => {
    if (!item) return;
    setOpen(false);
    navigate(item.href);
  };

  let lastGroup = "";
  return (
    <div className="kbar-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} data-console-bypass="">
      <div className="kbar" role="dialog" aria-modal="true" aria-label="Search documentation">
        <div className="kbar-input">
          <SearchIcon size={16} />
          <input
            ref={input}
            value={query}
            placeholder="Search documentation…"
            aria-label="Search"
            type="search"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(items[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <kbd className="kbar-esc">esc</kbd>
          <button type="button" className="kbar-cancel" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
        <div className="kbar-list" ref={list}>
          {items.length === 0 ? <div className="kbar-group">No results for “{query}”.</div> : null}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="kbar-group">{item.group}</div> : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header}
                <button type="button" className="kbar-item" data-index={i} aria-selected={i === index} onMouseMove={() => setIndex(i)} onClick={() => go(item)}>
                  <span>{item.group === "Pages" ? "▼" : "#"}</span>
                  <span>{item.label}</span>
                  {item.sub ? <span className="kbar-sub">{item.sub}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="kbar-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span style={{ marginLeft: "auto" }}>Also in your console: ⌘⌥J → 4 → /</span>
        </div>
      </div>
    </div>
  );
}
