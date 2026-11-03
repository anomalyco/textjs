import type { ReactNode } from "react";
import { POSTS_META as POSTS, postPath } from "../blog/meta";
import { LOCALE, localePath } from "../i18n/locales";
import { formatDate, t } from "../i18n/t";
import { A } from "../router";
import "./resources.css";

export function BlogPage(): ReactNode {
  return (
    <div className="container blog">
      <header className="rs-head">
        <h1>{t("The latest from Text.js")}</h1>
        <p className="rs-lede">{t("Releases and engineering notes from the Text.js team.")}</p>
        <div className="rs-head-links">
          <a href={localePath(LOCALE, "/blog/rss.xml")} className="text-link">
            {t("RSS feed")}
          </a>
          <A href="/changelog" className="text-link">
            <span>
              {t("Changelog")}&nbsp;<span className="rtl-flip">→</span>
            </span>
          </A>
        </div>
      </header>
      <ul className="blog-list">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <A href={postPath(p.slug)} className="blog-card">
              <time dateTime={p.date}>{formatDate(p.date)}</time>
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
              <span className="blog-by">{p.author}</span>
            </A>
          </li>
        ))}
      </ul>
    </div>
  );
}
