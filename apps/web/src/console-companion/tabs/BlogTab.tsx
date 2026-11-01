import { useMemo, type ReactNode } from "react";
import { Markdown, ScrollBox, Text } from "@textjs/react";
import { formatPostDate, getPost } from "../../blog";
import { toConsoleMarkdown } from "../../docs/registry";

/** A blog post, readable and scrollable in the console. */
export function BlogTab({ slug }: { slug: string }): ReactNode {
  const post = getPost(slug);
  const markdown = useMemo(() => (post ? toConsoleMarkdown(post.markdown) : ""), [post]);
  if (!post) return null;
  return (
    <ScrollBox key={slug} focused className="grow" paddingX={2}>
      <Text bold color="fg">
        {post.title}
      </Text>
      <Text color="muted" marginBottom={1}>
        {formatPostDate(post.date)}
      </Text>
      <Markdown codeMaxHeight={16}>{markdown}</Markdown>
    </ScrollBox>
  );
}
