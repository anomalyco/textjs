import type { ReactNode } from "react";
import { A } from "../../router";
import { HighlightedCode } from "../../site/highlight";
import { ArrowRight } from "../../site/icons";
import { useInView } from "../../site/useInView";
import { Crosses } from "./Crosses";

const CODE = `import { Suspense } from "react";
import { Box, Text } from "@textjs/next";
import { db } from "@/lib/db";

export const runtime = "server";

async function Deploys() {
  const rows = await db.deploys.latest(5);
  return rows.map((d) => (
    <Text key={d.id}>{\`\${d.state}  \${d.branch}\`}</Text>
  ));
}

export default function Page() {
  return (
    <Box className="flex-col p-1">
      <Text bold>Deployments</Text>
      <Suspense fallback={<Text color="muted">Loading…</Text>}>
        <Deploys />
      </Suspense>
    </Box>
  );
}
`;

const ITEMS: Array<{ title: string; body: ReactNode; href: string }> = [
  {
    title: "Partial Prerendering",
    body: <>Every static route’s first frame ships inside its HTML. The console paints before JavaScript loads.</>,
    href: "/docs/server-rendering",
  },
  {
    title: "Middleware",
    body: (
      <>
        <code>middleware.ts</code> with <code>NextRequest</code>, <code>NextResponse</code> and <code>config.matcher</code>.
      </>
    ),
    href: "/docs/middleware",
  },
  {
    title: "Caching",
    body: (
      <>
        <code>revalidate</code>, <code>unstable_cache</code> and <code>revalidateTag</code>. Stale while revalidating.
      </>
    ),
    href: "/docs/caching",
  },
  {
    title: "Deploy adapters",
    body: (
      <>
        <code>text build --adapter</code> <code>static</code>, <code>bun</code>, <code>vercel</code> or <code>cloudflare</code>.
      </>
    ),
    href: "/docs/deploying",
  },
];

/** Server → SSE row deltas → frame player → console.log. */
function Stream({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`sv-flow${play ? " play" : ""}`} aria-hidden="true">
      <div className="sv-node">
        <span className="sv-node-k">Server</span>
        <span className="sv-node-v">React + Yoga</span>
      </div>
      <div className="sv-wire">
        <span className="sv-wire-label">
          SSE<span className="sv-wire-more"> · row deltas</span>
        </span>
        <span className="sv-bit" style={{ ["--d" as string]: "0s" }} />
        <span className="sv-bit" style={{ ["--d" as string]: "-0.6s" }} />
        <span className="sv-bit" style={{ ["--d" as string]: "-1.2s" }} />
      </div>
      <div className="sv-node">
        <span className="sv-node-k">Frame player</span>
        <span className="sv-node-v">19 kB gzip</span>
      </div>
      <div className="sv-wire short">
        <span className="sv-bit" style={{ ["--d" as string]: "-0.3s" }} />
        <span className="sv-bit" style={{ ["--d" as string]: "-0.9s" }} />
      </div>
      <div className="sv-node">
        <span className="sv-node-k">DevTools</span>
        <span className="sv-node-v">console.log</span>
      </div>
    </div>
  );
}

export function ServerSection(): ReactNode {
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Server Rendering</p>
          <h2>Render where your data lives.</h2>
          <p>
            Export <code>runtime = "server"</code> and the route renders on the server, async components and all. The browser downloads a 19 kB frame player instead of your app.
          </p>
        </div>
        <div className="frame sv-frame" ref={ref}>
          <Crosses />
          <div className="sv-code">
            <div className="file-tabs" aria-hidden="true">
              <button type="button" tabIndex={-1} aria-selected="true">
                app/deploys/page.tsx
              </button>
            </div>
            <HighlightedCode code={CODE} language="tsx" lineNumbers highlight={[5, 7, 8]} />
          </div>
          <div className="sv-side">
            <Stream play={inView} />
            <ul className="sv-list">
              {ITEMS.map((it) => (
                <li key={it.title}>
                  <A href={it.href}>
                    <span className="sv-list-title">
                      {it.title}
                      <ArrowRight size={13} />
                    </span>
                    <span className="sv-list-body">{it.body}</span>
                  </A>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
