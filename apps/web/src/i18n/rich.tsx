import { Fragment, type ReactNode } from "react";
import { interpolate, type Params } from "./t";

export type Tags = Readonly<Record<string, (children: ReactNode) => ReactNode>>;

const TAG = /<(\w+)>([\s\S]*?)<\/\1>/;

function parse(source: string, tags: Tags): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = source;
  for (let m = TAG.exec(rest); m; m = TAG.exec(rest)) {
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const render = tags[m[1] as string];
    const inner = parse(m[2] as string, tags);
    out.push(<Fragment key={out.length}>{render ? render(inner.length === 1 ? inner[0] : inner) : inner}</Fragment>);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * A translated string with elements: `rich("Read the <link>docs</link>", { link: (c) => <A href="/docs">{c}</A> })`.
 * Tags nest (`<safari> (<link>…</link>)</safari>`); an empty tag (`<keys></keys>`) places an element that ignores
 * its children.
 */
export function rich(text: string, tags: Tags, params?: Params): ReactNode {
  return parse(interpolate(text, params), tags);
}

/** A rich string the build found no translation for: English, marked up as English (`vite-plugin.ts`). */
rich.en = (text: string, tags: Tags, params?: Params): ReactNode => (
  <span lang="en" dir="ltr">
    {rich(text, tags, params)}
  </span>
);
