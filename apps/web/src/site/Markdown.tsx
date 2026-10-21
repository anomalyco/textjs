import { Fragment, useMemo, type ReactNode } from "react";
import { parseInline, parseMarkdown, type ListItem, type MarkdownBlock } from "@textjs/react";
import { slugify } from "../docs/registry";
import { A } from "../router";
import { CodeBlock } from "./CodeBlock";
// Eager (not lazy): a Suspense fallback swapping to the taller preview would shift the page.
import { LivePreview } from "./LivePreview";

export function Inline({ text }: { text: string }): ReactNode {
  const spans = parseInline(text);
  return (
    <>
      {spans.map((s, i) => {
        let node: ReactNode = s.code ? <code>{s.text}</code> : s.text;
        if (s.bold) node = <strong>{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.strike) node = <del>{node}</del>;
        if (s.href !== undefined) node = <A href={s.href}>{node}</A>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

interface ListNode {
  item: ListItem;
  children: ListNode[];
}

function nestList(items: readonly ListItem[]): ListNode[] {
  const root: ListNode[] = [];
  const stack: ListNode[] = [];
  for (const item of items) {
    const node: ListNode = { item, children: [] };
    while (stack.length > 0 && (stack[stack.length - 1] as ListNode).item.depth >= item.depth) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else root.push(node);
    stack.push(node);
  }
  return root;
}

function List({ nodes }: { nodes: ListNode[] }): ReactNode {
  const ordered = nodes[0]?.item.ordered ?? false;
  const items = nodes.map((n, i) => (
    <li key={i}>
      {n.item.checked !== undefined ? <input type="checkbox" checked={n.item.checked} readOnly disabled style={{ marginRight: 8 }} /> : null}
      <Inline text={n.item.text} />
      {n.children.length > 0 ? <List nodes={n.children} /> : null}
    </li>
  ));
  return ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
}

/** Parse a fence info token: `tsx`, `tsx@app/page.tsx` (filename) or `tsx#counter` (live preview). */
export function parseFence(info: string): { language: string; file?: string; preview?: string } {
  const at = info.indexOf("@");
  const hash = info.indexOf("#");
  if (at > 0) return { language: info.slice(0, at), file: info.slice(at + 1) };
  if (hash > 0) return { language: info.slice(0, hash), preview: info.slice(hash + 1) };
  return { language: info };
}

function Block({ block }: { block: MarkdownBlock }): ReactNode {
  switch (block.type) {
    case "heading": {
      const id = slugify(block.text);
      const content = (
        <>
          <a className="anchor" href={`#${id}`} aria-hidden="true" tabIndex={-1}>
            #
          </a>
          <Inline text={block.text} />
        </>
      );
      if (block.level <= 2) return <h2 id={id}>{content}</h2>;
      if (block.level === 3) return <h3 id={id}>{content}</h3>;
      return (
        <h4 id={id}>
          <Inline text={block.text} />
        </h4>
      );
    }
    case "paragraph":
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
    case "code": {
      const fence = parseFence(block.language);
      if (fence.preview) {
        return <LivePreview id={fence.preview} code={block.code} language={fence.language} />;
      }
      return <CodeBlock code={block.code} language={fence.language} file={fence.file} />;
    }
    case "quote": {
      const first = block.blocks[0];
      const warning = first?.type === "paragraph" && /^\*\*(Warning|Caution)/.test(first.text);
      return (
        <div className={`callout${warning ? " warning" : ""}`}>
          {block.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      );
    }
    case "list":
      return <List nodes={nestList(block.items)} />;
    case "table":
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.header.map((h, i) => (
                  <th key={i} style={{ textAlign: block.align[i] ?? "left" }}>
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {block.header.map((_, c) => (
                    <td key={c} style={{ textAlign: block.align[c] ?? "left" }}>
                      <Inline text={row[c] ?? ""} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "hr":
      return <hr />;
  }
}

export function MarkdownDoc({ source }: { source: string }): ReactNode {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className="prose">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}
