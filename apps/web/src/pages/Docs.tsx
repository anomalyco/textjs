import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { CATEGORY_LABELS, hasTranslatedHeading } from "../docs/meta";
import { LOCALE, SOURCE_LOCALE } from "../i18n/locales";
import { DOC_CATEGORIES, DOCS, docPath, getDoc, headingsOf, neighbors } from "../docs/registry";
import { t } from "../i18n/t";
import { A, useLocation } from "../router";
import { TurbologLockup } from "../site/brand-marks";
import { Footer } from "../site/Chrome";
import { ChevronDown, CloseIcon, GitHubIcon, MenuIcon } from "../site/icons";
import { docEditUrl } from "../site/links";
import { MarkdownDoc } from "../site/Markdown";
import { Sheet, useCloseOnMedia } from "../site/Sheet";

function DocLinks({ slug }: { slug: string }): ReactNode {
  return (
    <>
      {DOC_CATEGORIES.map((cat) => (
        <div key={cat}>
          <h5>{CATEGORY_LABELS[cat]}</h5>
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
    <aside className="docs-sidebar" aria-label={t("Documentation")}>
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
  const { path: pathname } = useLocation();
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
        <button type="button" onClick={() => setMenu(true)} aria-label={t("Open docs navigation")} aria-expanded={menu} aria-controls="docs-drawer">
          <MenuIcon size={16} />
          <span key={doc.slug} className="docs-mobile-crumb">
            {CATEGORY_LABELS[doc.category]} <span className="subtle">/</span> <span className="docs-mobile-current">{doc.nav ?? doc.title}</span>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
      <Sheet open={menu} onClose={close} id="docs-drawer" label={t("Documentation")} side="left" className="docs-drawer">
        <div className="docs-drawer-head">
          <span>{t("Documentation")}</span>
          <button type="button" className="icon-btn" onClick={close} aria-label={t("Close docs navigation")}>
            <CloseIcon />
          </button>
        </div>
        <nav className="docs-drawer-body" aria-label={t("Documentation")} onClick={(e) => (e.target as Element).closest("a") && close()}>
          <DocLinks slug={doc.slug} />
        </nav>
      </Sheet>
      <div className="docs">
        <Sidebar slug={doc.slug} />
        {/* The footer lives in the content column, so the sticky sidebar and TOC stay pinned to the very bottom. */}
        <div className="docs-body">
          <article className="docs-main">
            <div className="breadcrumbs">
              <A href="/docs">{t("Docs")}</A>
              <span>/</span>
              <span>{CATEGORY_LABELS[doc.category]}</span>
            </div>
            {/* Keyed so a page with a lockup mounts a new title instead of shifting the previous one down.
                The key must differ from MarkdownDoc's: duplicate sibling keys left old titles stacked up. */}
            <Fragment key={`head:${doc.slug}`}>
              {doc.brand === "turbolog" ? <TurbologLockup className="docs-brand" /> : null}
              <h1 className="docs-title">{doc.title}</h1>
              <p className="docs-desc">{doc.description}</p>
            </Fragment>
            <MarkdownDoc key={doc.slug} source={doc.markdown} />
            <A href={docEditUrl(doc.slug, hasTranslatedHeading(doc.markdown) ? LOCALE : SOURCE_LOCALE)} className="docs-edit">
              <GitHubIcon size={14} />
              {t("Edit this page on GitHub")}
            </A>
            <nav className="docs-nav" aria-label={t("Pagination")}>
              {prev ? (
                <A href={docPath(prev.slug)}>
                  <small>{t("Previous")}</small>
                  <span>
                    <span className="rtl-flip">←</span>&nbsp;{prev.title}
                  </span>
                </A>
              ) : null}
              {next ? (
                <A href={docPath(next.slug)} className="next">
                  <small>{t("Next")}</small>
                  <span>
                    {next.title}&nbsp;<span className="rtl-flip">→</span>
                  </span>
                </A>
              ) : null}
            </nav>
          </article>
          <Footer />
        </div>
        <aside className="docs-toc" aria-label={t("On this page")}>
          <h6>{t("On this page")}</h6>
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
