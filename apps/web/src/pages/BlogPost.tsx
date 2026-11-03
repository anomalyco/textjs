import type { ReactNode } from "react";
import { getPost, POSTS, postPath } from "../blog";
import { formatDate, t } from "../i18n/t";
import { A } from "../router";
import { TurbologLockup } from "../site/brand-marks";
import { MarkdownDoc } from "../site/Markdown";
import "./resources.css";

export function BlogPostPage({ slug }: { slug: string }): ReactNode {
  const post = getPost(slug);
  if (!post) return null;
  const i = POSTS.indexOf(post);
  const newer = POSTS[i - 1];
  const older = POSTS[i + 1];
  return (
    <article className="container blog-post">
      <A href="/blog" className="blog-back">
        <span className="rtl-flip">←</span> {t("Blog")}
      </A>
      <header className="blog-post-head">
        {post.brand === "turbolog" ? <TurbologLockup className="blog-brand" /> : null}
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <h1>{post.title}</h1>
        <p className="rs-lede">{post.summary}</p>
        <div className="blog-author">
          <span className="blog-avatar" aria-hidden="true">
            ▼
          </span>
          <span>{post.author}</span>
        </div>
      </header>
      <MarkdownDoc source={post.markdown} />
      <nav className="docs-nav blog-nav" aria-label={t("More posts")}>
        {older ? (
          <A href={postPath(older.slug)}>
            <small>{t("Older")}</small>
            <span>{older.title}</span>
          </A>
        ) : null}
        {newer ? (
          <A href={postPath(newer.slug)} className="next">
            <small>{t("Newer")}</small>
            <span>{newer.title}</span>
          </A>
        ) : null}
      </nav>
    </article>
  );
}
