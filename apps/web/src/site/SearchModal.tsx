import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";
import { CATEGORY_LABELS, DOCS_META, docPath, type DocCategory } from "../docs/meta";
import { rich } from "../i18n/rich";
import { t } from "../i18n/t";
import { navigate } from "../router";
import { SearchIcon } from "./icons";
import type { SearchItem } from "./search-aliases";
import { useScrollLock } from "./Sheet";

type Item = SearchItem;
type SearchEngine = {
  searchDocsMeta: typeof import("../docs/search-index").searchDocsMeta;
  aliasResults: typeof import("./search-aliases").aliasResults;
};

const PAGES: Item[] = [
  { key: "p:/", group: "Pages", label: t("Home"), sub: "textjs.org", href: "/" },
  { key: "p:/docs", group: "Pages", label: t("Documentation"), sub: "/docs", href: "/docs" },
  { key: "p:/playground", group: "Pages", label: "Playground", sub: "/playground", href: "/playground" },
  { key: "p:/opencode", group: "Pages", label: t("OpenCode in the Console"), sub: "Playground · /opencode", href: "/opencode" },
  { key: "p:/coffee", group: "Pages", label: t("Coffee from terminal.shop"), sub: "Playground · /coffee", href: "/coffee" },
];

/** Group headings as shown; the ids stay English. */
const GROUP_LABELS: Readonly<Record<string, string>> = { Pages: t("Pages"), Documentation: t("Documentation"), "Error Codes": t("Error Codes") };

/** A doc's category id → its label; anything else (a page title) as is. */
const subLabel = (sub: string | undefined): string | undefined => (sub && sub in CATEGORY_LABELS ? CATEGORY_LABELS[sub as DocCategory] : sub);

const DEFAULT_DOCS: Item[] = DOCS_META.map((doc) => ({
  key: `d:${doc.slug}:`,
  group: "Documentation",
  label: doc.title,
  sub: doc.category,
  href: docPath(doc.slug),
}));

const openListeners = new Set<(open: boolean) => void>();
let engineCache: SearchEngine | null = null;
let enginePromise: Promise<SearchEngine> | null = null;

export function preloadSearchDialog(): Promise<SearchEngine> {
  if (engineCache) return Promise.resolve(engineCache);
  if (!enginePromise) {
    enginePromise = Promise.all([import("../docs/search-index"), import("./search-aliases")]).then(([idx, al]) => {
      engineCache = { searchDocsMeta: idx.searchDocsMeta, aliasResults: al.aliasResults };
      return engineCache;
    });
  }
  return enginePromise;
}

export function openSearch(): void {
  void preloadSearchDialog();
  for (const l of openListeners) l(true);
}

function invertTriangles(value: string): string {
  return value.replace(/\u25B2/g, "\u25BC");
}

function isQuitCommand(query: string): boolean {
  return /^:(q!?|wq!?|x)$/.test(query.trim());
}

export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [engine, setEngine] = useState<SearchEngine | null>(() => engineCache);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const l = (v: boolean): void => {
      if (v) void preloadSearchDialog().then(setEngine);
      setOpen(v);
    };
    openListeners.add(l);
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        // An example running in the console keeps the Ctrl+K it received (its command palette); ⌘K still searches.
        if (e.defaultPrevented && siteStore.getSnapshot().example !== null) return;
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) void preloadSearchDialog().then(setEngine);
          return next;
        });
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
      if (!engine) void preloadSearchDialog().then(setEngine);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [...PAGES, ...DEFAULT_DOCS];
    const pages = PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.href.includes(q));
    if (!engine) {
      const fallbackDocs = DEFAULT_DOCS.filter((d) => d.label.toLowerCase().includes(q) || (d.sub ?? "").toLowerCase().includes(q));
      return [...pages, ...fallbackDocs];
    }
    const aliases = engine.aliasResults(query);
    const errors = aliases.filter((a) => a.group !== "Documentation");
    const aliasDocs = aliases.filter((a) => a.group === "Documentation");
    const docs = engine
      .searchDocsMeta(query, 14)
      .map<Item>((h) => ({
        key: `d:${h.doc.slug}:${h.heading?.id ?? ""}`,
        group: "Documentation",
        label: h.heading ? h.heading.text : h.doc.title,
        sub: h.heading ? h.doc.title : h.doc.category,
        href: `${docPath(h.doc.slug)}${h.heading ? `#${h.heading.id}` : ""}`,
      }))
      .filter((d) => !aliasDocs.some((a) => a.key === d.key));
    return [...pages, ...errors, ...aliasDocs, ...docs];
  }, [open, query, engine]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, index]);

  if (!open) return null;

  const go = (item: Item | undefined): void => {
    if (!item) return;
    setOpen(false);
    navigate(item.href);
  };

  let lastGroup = "";
  return (
    <div className="kbar-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} data-console-bypass="">
      <div className="kbar" role="dialog" aria-modal="true" aria-label={t("Search documentation")}>
        <div className="kbar-input">
          <SearchIcon size={16} />
          <input
            ref={input}
            name="q"
            value={query}
            placeholder={t("Search documentation…")}
            aria-label={t("Search")}
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
                if (isQuitCommand(query)) setOpen(false);
                else go(items[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <kbd className="kbar-esc">esc</kbd>
          <button type="button" className="kbar-cancel" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </button>
        </div>
        <div className="kbar-list" ref={list}>
          {items.length === 0 ? <div className="kbar-group">{t("No results for “{query}”.", { query })}</div> : null}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="kbar-group">{GROUP_LABELS[item.group] ?? item.group}</div> : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header}
                <button type="button" className="kbar-item" data-index={i} aria-selected={i === index} onMouseMove={() => setIndex(i)} onClick={() => go(item)}>
                  <span>{item.group === "Pages" ? "▼" : "#"}</span>
                  <span>{item.label}</span>
                  {item.sub ? <span className="kbar-sub">{subLabel(item.sub)}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="kbar-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t("navigate")}
          </span>
          <span>
            <kbd>↵</kbd> {t("open")}
          </span>
          <span style={{ marginInlineStart: "auto" }}>{rich("On docs pages, press <key>/</key> in the console to search", { key: (c) => <kbd>{c}</kbd> })}</span>
        </div>
      </div>
    </div>
  );
}
