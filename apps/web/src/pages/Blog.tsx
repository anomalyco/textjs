import type { ReactNode } from "react";
import { formatPostDate, POSTS_META as POSTS, postPath } from "../blog/meta";
import { A } from "../router";
import "./resources.css";

export function BlogPage(): ReactNode {
  return (
    <div className="container blog">
      <header className="rs-head">
        <p className="eyebrow">Blog</p>
        <h1>The latest from Text.js</h1>
        <p className="rs-lede">Releases and engineering notes from the Text.js team.</p>
        <div className="rs-head-links">
          <a href="/blog/rss.xml" className="text-link">
            RSS feed
          </a>
          <A href="/changelog" className="text-link">
            Changelog →
          </A>
        </div>
      </header>
      <ul className="blog-list">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <A href={postPath(p.slug)} className="blog-card">
              <time dateTime={p.date}>{formatPostDate(p.date)}</time>
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
