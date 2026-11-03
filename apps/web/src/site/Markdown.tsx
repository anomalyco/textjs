import { Fragment, useMemo, type ReactNode } from "react";
import { parseInline, parseMarkdown, type ListItem, type MarkdownBlock } from "@textjs/react";
import { sentinelFlag, slugify, splitHeadingId } from "../docs/meta";
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

type TableAlign = Extract<MarkdownBlock, { type: "table" }>["align"][number];

/** Markdown's left and right alignment map to start and end, so tables mirror in RTL. */
const cellAlign = (a: TableAlign = "left"): "start" | "center" | "end" => (a === "center" ? a : a === "right" ? "end" : "start");

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

function List({ nodes, attrs }: { nodes: ListNode[]; attrs?: { lang?: string; dir?: "ltr" } }): ReactNode {
  const ordered = nodes[0]?.item.ordered ?? false;
  const items = nodes.map((n, i) => (
    <li key={i}>
      {n.item.checked !== undefined ? <input type="checkbox" name="task" checked={n.item.checked} readOnly disabled style={{ marginInlineEnd: 8 }} /> : null}
      <Inline text={n.item.text} />
      {n.children.length > 0 ? <List nodes={n.children} /> : null}
    </li>
  ));
  return ordered ? <ol {...attrs}>{items}</ol> : <ul {...attrs}>{items}</ul>;
}

/** Parse a fence info token: `tsx`, `tsx@app/page.tsx` (filename) or `tsx#counter` (live preview). */
export function parseFence(info: string): { language: string; file?: string; preview?: string } {
  const at = info.indexOf("@");
  const hash = info.indexOf("#");
  if (at > 0) return { language: info.slice(0, at), file: info.slice(at + 1) };
  if (hash > 0) return { language: info.slice(0, hash), preview: info.slice(hash + 1) };
  return { language: info };
}

/** Flags from the `<!-- i18n:… -->` lines before a block: `en` (not translated yet) and `warning`. */
type Flags = ReadonlySet<string>;

const NO_FLAGS: Flags = new Set();

/** A block still in English on a translated page. */
function englishAttrs(flags: Flags): { lang?: string; dir?: "ltr" } {
  return flags.has("en") ? { lang: "en", dir: "ltr" } : {};
}

function Block({ block, flags = NO_FLAGS }: { block: MarkdownBlock; flags?: Flags }): ReactNode {
  const attrs = englishAttrs(flags);
  switch (block.type) {
    case "heading": {
      const heading = splitHeadingId(block.text);
      const id = heading.id ?? slugify(heading.text);
      const content = (
        <>
          <a className="anchor" href={`#${id}`} aria-hidden="true" tabIndex={-1}>
            #
          </a>
          <Inline text={heading.text} />
        </>
      );
      if (block.level <= 2)
        return (
          <h2 id={id} {...attrs}>
            {content}
          </h2>
        );
      if (block.level === 3)
        return (
          <h3 id={id} {...attrs}>
            {content}
          </h3>
        );
      return (
        <h4 id={id} {...attrs}>
          <Inline text={heading.text} />
        </h4>
      );
    }
    case "paragraph":
      return (
        <p {...attrs}>
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
      const warning = flags.has("warning") || (first?.type === "paragraph" && /^\*\*(Warning|Caution)/.test(first.text));
      return (
        <div className={`callout${warning ? " warning" : ""}`} {...attrs}>
          {block.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      );
    }
    case "list":
      return <List nodes={nestList(block.items)} attrs={attrs} />;
    case "table":
      return (
        <div className="table-wrap" {...attrs}>
          <table>
            <thead>
              <tr>
                {block.header.map((h, i) => (
                  <th key={i} style={{ textAlign: cellAlign(block.align[i]) }}>
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {block.header.map((_, c) => (
                    <td key={c} style={{ textAlign: cellAlign(block.align[c]) }}>
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

/** Parsed blocks, each with the `<!-- i18n:… -->` flags written before it. */
function flaggedBlocks(source: string): { block: MarkdownBlock; flags: Flags }[] {
  const out: { block: MarkdownBlock; flags: Flags }[] = [];
  let pending: Set<string> | null = null;
  for (const block of parseMarkdown(source)) {
    const flag = block.type === "paragraph" ? sentinelFlag(block.text) : null;
    if (flag) (pending ??= new Set()).add(flag);
    else {
      out.push({ block, flags: pending ?? NO_FLAGS });
      pending = null;
    }
  }
  return out;
}

export function MarkdownDoc({ source }: { source: string }): ReactNode {
  const blocks = useMemo(() => flaggedBlocks(source), [source]);
  return (
    <div className="prose">
      {blocks.map((b, i) => (
        <Block key={i} block={b.block} flags={b.flags} />
      ))}
    </div>
  );
}
