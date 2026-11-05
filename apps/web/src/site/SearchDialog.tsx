import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATEGORY_LABELS, DOCS_META, docPath, type DocCategory } from "../docs/meta";
import { rich } from "../i18n/rich";
import { searchFold } from "../i18n/search-fold";
import { t } from "../i18n/t";
import { navigate } from "../router";
import { SearchIcon } from "./icons";
import type { SearchItem } from "./search-aliases";
import type { SearchEngine } from "./SearchModal";
import { useScrollLock } from "./Sheet";

type Item = SearchItem;

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

function invertTriangles(value: string): string {
  return value.replace(/\u25B2/g, "\u25BC");
}

function isQuitCommand(query: string): boolean {
  return /^:(q!?|wq!?|x)$/.test(query.trim());
}

/** The open search dialog. Until the search index loads (`engine`), it matches page and doc titles. */
export function SearchDialog({ engine, onClose }: { engine: SearchEngine | null; onClose: () => void }): ReactNode {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useScrollLock(true);

  useEffect(() => {
    requestAnimationFrame(() => input.current?.focus());
  }, []);

  const items = useMemo<Item[]>(() => {
    const q = searchFold(query.trim());
    if (!q) return [...PAGES, ...DEFAULT_DOCS];
    const pages = PAGES.filter((p) => searchFold(p.label).includes(q) || p.href.includes(q));
    if (!engine) {
      const fallbackDocs = DEFAULT_DOCS.filter((d) => searchFold(d.label).includes(q) || searchFold(d.sub ?? "").includes(q));
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
  }, [query, engine]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (item: Item | undefined): void => {
    if (!item) return;
    onClose();
    navigate(item.href);
  };

  let lastGroup = "";
  return (
    <div className="kbar-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-console-bypass="">
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
                if (isQuitCommand(query)) onClose();
                else go(items[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <kbd className="kbar-esc">esc</kbd>
          <button type="button" className="kbar-cancel" onClick={() => onClose()}>
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
