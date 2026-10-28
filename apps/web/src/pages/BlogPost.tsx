import type { ReactNode } from "react";
import { formatPostDate, getPost, POSTS, postPath } from "../blog";
import { A } from "../router";
import { MarkdownDoc } from "../site/Markdown";

export function BlogPostPage({ slug }: { slug: string }): ReactNode {
  const post = getPost(slug);
  if (!post) return null;
  const i = POSTS.indexOf(post);
  const newer = POSTS[i - 1];
  const older = POSTS[i + 1];
  return (
    <article className="container blog-post">
      <A href="/blog" className="blog-back">
        ← Blog
      </A>
      <header className="blog-post-head">
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
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
      <nav className="docs-nav blog-nav" aria-label="More posts">
        {older ? (
          <A href={postPath(older.slug)}>
            <small>Older</small>
            <span>{older.title}</span>
          </A>
        ) : null}
        {newer ? (
          <A href={postPath(newer.slug)} className="next">
            <small>Newer</small>
            <span>{newer.title}</span>
          </A>
        ) : null}
      </nav>
    </article>
  );
}
