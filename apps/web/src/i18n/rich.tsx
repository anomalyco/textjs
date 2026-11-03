import { Fragment, type ReactNode } from "react";
import { interpolate, type Params } from "./t";

export type Tags = Readonly<Record<string, (children: ReactNode) => ReactNode>>;

/**
 * A translated string with elements: `rich("Read the <link>docs</link>", { link: (c) => <A href="/docs">{c}</A> })`.
 * Tags don't nest; text outside known tags is kept as written.
 */
export function rich(text: string, tags: Tags, params?: Params): ReactNode {
  const source = interpolate(text, params);
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const render = tags[m[1] as string];
    if (!render) continue;
    if (m.index > last) out.push(source.slice(last, m.index));
    out.push(<Fragment key={out.length}>{render(m[2] as string)}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}
