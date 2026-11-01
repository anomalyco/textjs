import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { docPath, searchDocs } from "../docs/registry";
import { navigate } from "../router";
import { SearchIcon } from "./icons";
import { aliasResults, invertTriangles, isQuitCommand, type SearchItem } from "./search-aliases";
import { useScrollLock } from "./Sheet";

type Item = SearchItem;

const PAGES: Item[] = [
  { key: "p:/", group: "Pages", label: "Home", sub: "textjs.org", href: "/" },
  { key: "p:/docs", group: "Pages", label: "Documentation", sub: "/docs", href: "/docs" },
  { key: "p:/playground", group: "Pages", label: "Playground", sub: "/playground", href: "/playground" },
  { key: "p:/opencode", group: "Pages", label: "OpenCode in the Console", sub: "Playground · /opencode", href: "/opencode" },
  { key: "p:/coffee", group: "Pages", label: "Coffee from terminal.shop", sub: "Playground · /coffee", href: "/coffee" },
];

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    const pages = q ? PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.href.includes(q)) : PAGES;
    const aliases = aliasResults(query);
    const errors = aliases.filter((a) => a.group !== "Documentation");
    const aliasDocs = aliases.filter((a) => a.group === "Documentation");
    const docs = searchDocs(query, 14)
      .map<Item>((h) => ({
        key: `d:${h.doc.slug}:${h.heading?.id ?? ""}`,
        group: "Documentation",
        label: h.heading ? h.heading.text : h.doc.title,
        sub: h.heading ? h.doc.title : h.doc.category,
        href: `${docPath(h.doc.slug)}${h.heading ? `#${h.heading.id}` : ""}`,
      }))
      .filter((d) => !aliasDocs.some((a) => a.key === d.key));
    return [...pages, ...errors, ...aliasDocs, ...docs];
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, index]);

  if (!open) return null;

  const go = (item: Item | undefined): void => {
    if (!item) return;
    onClose();
    navigate(item.href);
  };

  let lastGroup = "";
  return (
    <div className="kbar-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-console-bypass="">
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
              const native = e.nativeEvent as InputEvent;
              setQuery(native.isComposing ? e.target.value : invertTriangles(e.target.value));
              setIndex(0);
            }}
            onCompositionEnd={(e) => setQuery(invertTriangles(e.currentTarget.value))}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (isQuitCommand(query)) onClose();
                else go(items[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <kbd className="kbar-esc">esc</kbd>
          <button type="button" className="kbar-cancel" onClick={onClose}>
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
          <span style={{ marginLeft: "auto" }}>On docs pages, press / in the console to search</span>
        </div>
      </div>
    </div>
  );
}
