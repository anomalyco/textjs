import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DOC_CATEGORIES, DOCS, docPath, getDoc, headingsOf, neighbors } from "../docs/registry";
import { A, useLocation } from "../router";
import { devtoolsShortcut } from "../site/Chrome";
import { MenuIcon } from "../site/icons";
import { MarkdownDoc } from "../site/Markdown";

function Sidebar({ slug, open }: { slug: string; open: boolean }): ReactNode {
  return (
    <aside className={`docs-sidebar${open ? " open" : ""}`} aria-label="Documentation">
      {DOC_CATEGORIES.map((cat) => (
        <div key={cat}>
          <h5>{cat}</h5>
          {DOCS.filter((d) => d.category === cat).map((d) => (
            <A key={d.slug} href={docPath(d.slug)} aria-current={d.slug === slug ? "page" : undefined}>
              {d.nav ?? d.title}
            </A>
          ))}
        </div>
      ))}
    </aside>
  );
}

function useActiveHeading(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ids]);
  return active;
}

export function DocsPage({ slug }: { slug: string }): ReactNode {
  const doc = getDoc(slug) ?? DOCS[0];
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);
  const headings = useMemo(() => (doc ? headingsOf(doc.markdown) : []), [doc]);
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const active = useActiveHeading(ids);
  if (!doc) return null;
  const { prev, next } = neighbors(doc.slug);

  return (
    <>
      <div className="docs-mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setMenu((m) => !m)} aria-label="Toggle docs navigation">
          <MenuIcon size={16} />
        </button>
        <span>
          {doc.category} <span className="subtle">/</span> <span style={{ color: "var(--fg)" }}>{doc.nav ?? doc.title}</span>
        </span>
      </div>
      <div className="docs">
        <Sidebar slug={doc.slug} open={menu} />
        <article className="docs-main">
          <div className="breadcrumbs">
            <A href="/docs">Docs</A>
            <span>/</span>
            <span>{doc.category}</span>
          </div>
          <h1 className="docs-title">{doc.title}</h1>
          <p className="docs-desc">{doc.description}</p>
          <MarkdownDoc source={doc.markdown} />
          <nav className="docs-nav" aria-label="Pagination">
            {prev ? (
              <A href={docPath(prev.slug)}>
                <small>Previous</small>
                <span>← {prev.title}</span>
              </A>
            ) : null}
            {next ? (
              <A href={docPath(next.slug)} className="next">
                <small>Next</small>
                <span>{next.title} →</span>
              </A>
            ) : null}
          </nav>
        </article>
        <aside className="docs-toc" aria-label="On this page">
          <h6>On this page</h6>
          {headings.map((h) => (
            <a key={h.id} href={`#${h.id}`} className={`d${h.depth}${active === h.id ? " active" : ""}`}>
              {h.text}
            </a>
          ))}
          <div className="toc-console">
            This page is also open in your console. Press <kbd>{devtoolsShortcut()}</kbd> then <kbd>4</kbd>.
          </div>
        </aside>
      </div>
    </>
  );
}
