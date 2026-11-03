import type { ReactNode } from "react";
import { rich } from "../../i18n/rich";
import { t } from "../../i18n/t";
import { A } from "../../router";
import { HighlightedCode } from "../../site/highlight";
import { ArrowRight } from "../../site/icons";
import { useInView } from "../../site/useInView";
import { Crosses } from "./Crosses";

const CODE = `import { Suspense } from "react";
import { Box, Text } from "@textjs/app";
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

const code = { c: (c: ReactNode) => <code>{c}</code> };

const ITEMS: Array<{ title: string; body: ReactNode; href: string }> = [
  {
    title: t("Partial Prerendering"),
    body: t("Every static route’s first frame ships inside its HTML. The console paints before JavaScript loads."),
    href: "/docs/server-rendering",
  },
  {
    title: t("Middleware"),
    body: rich("<c>middleware.ts</c> runs before matched requests, with <c>NextRequest</c>, <c>NextResponse</c> and <c>config.matcher</c>.", code),
    href: "/docs/middleware",
  },
  {
    title: t("Caching"),
    body: rich("<c>revalidate</c>, <c>unstable_cache</c> and <c>revalidateTag</c> cache route handlers and data, with stale-while-revalidate.", code),
    href: "/docs/caching",
  },
  {
    title: t("Deploy adapters"),
    body: rich("<c>text build --adapter</c> targets <c>static</c>, <c>bun</c>, <c>vercel</c> or <c>cloudflare</c>. Server-rendered routes need <c>bun</c> or <c>text start</c>.", code),
    href: "/docs/deploying",
  },
];

/** Server → SSE row deltas → frame player → console.log. */
function Stream({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`sv-flow${play ? " play" : ""}`} dir="ltr" aria-hidden="true">
      <div className="sv-node">
        <span className="sv-node-k">{t("Server")}</span>
        <span className="sv-node-v">React + Yoga</span>
      </div>
      <div className="sv-wire">
        <span className="sv-wire-label">
          SSE<span className="sv-wire-more"> · {t("row deltas")}</span>
        </span>
        <span className="sv-bit" style={{ ["--d" as string]: "0s" }} />
        <span className="sv-bit" style={{ ["--d" as string]: "-0.6s" }} />
        <span className="sv-bit" style={{ ["--d" as string]: "-1.2s" }} />
      </div>
      <div className="sv-node">
        <span className="sv-node-k">{t("Frame player")}</span>
        <span className="sv-node-v">21 kB gzip</span>
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
          <h2>{t("Render routes on the server")}</h2>
          <p>{rich("Export <c>runtime = \"server\"</c> to render a route and its async components on the server. The browser loads a 21 kB (gzip) frame player instead of your app.", code)}</p>
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
