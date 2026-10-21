import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DOC_CATEGORIES, DOCS, docPath, getDoc, headingsOf, neighbors } from "../docs/registry";
import { A, useLocation } from "../router";
import { Footer } from "../site/Chrome";
import { ChevronDown, CloseIcon, MenuIcon } from "../site/icons";
import { MarkdownDoc } from "../site/Markdown";
import { Sheet, useCloseOnMedia } from "../site/Sheet";

function DocLinks({ slug }: { slug: string }): ReactNode {
  return (
    <>
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
    </>
  );
}

function Sidebar({ slug }: { slug: string }): ReactNode {
  return (
    <aside className="docs-sidebar" aria-label="Documentation">
      <DocLinks slug={slug} />
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
  const close = (): void => setMenu(false);
  useEffect(close, [pathname]);
  useCloseOnMedia(menu, "(min-width: 821px)", close);
  const headings = useMemo(() => (doc ? headingsOf(doc.markdown) : []), [doc]);
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const active = useActiveHeading(ids);
  if (!doc) return null;
  const { prev, next } = neighbors(doc.slug);

  return (
    <>
      <div className="docs-mobile-bar">
        <button type="button" onClick={() => setMenu(true)} aria-label="Open docs navigation" aria-expanded={menu} aria-controls="docs-drawer">
          <MenuIcon size={16} />
          <span key={doc.slug} className="docs-mobile-crumb">
            {doc.category} <span className="subtle">/</span> <span className="docs-mobile-current">{doc.nav ?? doc.title}</span>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
      <Sheet open={menu} onClose={close} id="docs-drawer" label="Documentation" side="left" className="docs-drawer">
        <div className="docs-drawer-head">
          <span>Documentation</span>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close docs navigation">
            <CloseIcon />
          </button>
        </div>
        <nav className="docs-drawer-body" aria-label="Documentation" onClick={(e) => (e.target as Element).closest("a") && close()}>
          <DocLinks slug={doc.slug} />
        </nav>
      </Sheet>
      <div className="docs">
        <Sidebar slug={doc.slug} />
        {/* The footer lives in the content column, so the sticky sidebar and TOC stay pinned to the very bottom. */}
        <div className="docs-body">
          <article className="docs-main">
            <div className="breadcrumbs">
              <A href="/docs">Docs</A>
              <span>/</span>
              <span>{doc.category}</span>
            </div>
            <h1 className="docs-title">{doc.title}</h1>
            <p className="docs-desc">{doc.description}</p>
            <MarkdownDoc key={doc.slug} source={doc.markdown} />
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
          <Footer />
        </div>
        <aside className="docs-toc" aria-label="On this page">
          <h6>On this page</h6>
          {headings.map((h) => (
            <a key={h.id} href={`#${h.id}`} className={`d${h.depth}${active === h.id ? " active" : ""}`}>
              {h.text}
            </a>
          ))}
        </aside>
      </div>
    </>
  );
}
