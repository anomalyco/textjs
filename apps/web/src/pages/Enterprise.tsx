import type { ReactNode } from "react";
import { A } from "../router";

export const SALES_EMAIL = "enterprise@textjs.org";
const SALES_BODY = ["Company:", "Team size:", "DevTools dock position (bottom, left, right or undocked):", "%c spans per frame (text.stats().spanCount):", ""].join("\r\n");
export const SALES_HREF = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Text.js Enterprise")}&body=${encodeURIComponent(SALES_BODY)}`;

const STATS = [
  { value: "99.99%", label: "of console.log calls return" },
  { value: "1", label: "console.log per dirty frame" },
  { value: "0", label: "calls per idle frame" },
  { value: "50ms", label: "DevTools throttle, respected" },
];

const COMPLIANCE = [
  {
    title: "SOC 2 Console Compliance",
    body: "Every frame is written to a console you can see, scroll and copy. Nothing renders that DevTools can’t show you.",
  },
  {
    title: "Data residency",
    body: "Frames reside in the user’s DevTools. They do not leave the tab, and they are cleared after 300.",
  },
  {
    title: "Audit logging",
    body: "Your application is the audit log. Scroll up in the console to review previous frames.",
  },
  {
    title: "Least privilege",
    body: "Text.js needs one permission: console.log. The page itself can stay empty.",
  },
];

const SECURITY = [
  { title: "Link hijacking defense", body: "A word joiner after :// and in path:line text, so DevTools never restyles your text as a link." },
  { title: "Format string isolation", body: "Every literal % is escaped as %%. User input can’t consume a %c style argument." },
  { title: "Production double lock", body: "Examples that reach real APIs default to a sandbox and need two explicit switches for production." },
  { title: "Local by default", body: "The OpenCode bridge is a loopback server that rejects unknown origins. Its daemon password stays in memory: never logged, never returned to the browser." },
];

const SUPPORT = [
  { title: "Named console engineer", body: "One engineer who knows your DevTools dock position by heart." },
  { title: "Frame reviews", body: "Quarterly review of your %c span counts, dirty rows and idle CPU." },
  { title: "Migration assistance", body: "From the DOM, from the terminal, or from console.table." },
  { title: "Private Slack channel", body: "Replies in one message, appended. Never cleared." },
];

type Cell = string | boolean;

const PLANS = ["Open Source", "Enterprise"] as const;

const FEATURES: ReadonlyArray<{ group: string; rows: ReadonlyArray<[string, Cell, Cell]> }> = [
  {
    group: "Framework",
    rows: [
      ["App Router, components and hooks", true, true],
      ["Turbolog engine", true, true],
      ["Zero-flash frames", true, true],
      ["text run (terminal)", true, true],
    ],
  },
  {
    group: "Operations",
    rows: [
      ["Console uptime SLA", false, "99.99%"],
      ["Throttler-aware frame pacing", true, true],
      ["Frame reviews", false, "Quarterly"],
      ["Security questionnaire", false, true],
    ],
  },
  {
    group: "Support",
    rows: [
      ["Community", true, true],
      ["Named console engineer", false, true],
      ["Response time", "Best effort", "1 business hour"],
    ],
  },
];

const FAQ: ReadonlyArray<{ q: string; a: ReactNode }> = [
  {
    q: "Is Enterprise a different framework?",
    a: "No. Enterprise customers run the same MIT-licensed Text.js as everyone else. You are paying for the people, the paperwork and the SLA.",
  },
  {
    q: "What does the 99.99% SLA cover?",
    a: "The share of console.log calls that return to your application. The remaining 0.01% is reserved for the user closing the tab mid-frame.",
  },
  {
    q: "Which browsers are supported?",
    a: "Chromium-based browsers with DevTools: Chrome, Edge, Arc and Brave. Turbolog is tuned against the Chromium DevTools frontend, down to its 50ms viewport throttler.",
  },
  {
    q: "Do our users need DevTools open?",
    a: "To see the application, yes. Text.js renders nothing until there is a console to render into, which keeps infrastructure costs low.",
  },
  {
    q: "Can we self-host?",
    a: "Text.js runs entirely in your users’ browsers. text build produces static files, and text start serves them with your route handlers.",
  },
  {
    q: "Is there a procurement-friendly invoice?",
    a: (
      <>
        Yes. It is rendered in a PDF, not the console. <a href="/enterprise/sample-invoice.pdf">Sample invoice (PDF)</a>
      </>
    ),
  },
];

function Check({ value }: { value: Cell }): ReactNode {
  if (value === true)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-label="Included" role="img">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (value === false)
    return (
      <span className="ent-none" aria-label="Not included">
        —
      </span>
    );
  return <span>{value}</span>;
}

export function EnterprisePage(): ReactNode {
  return (
    <div className="ent">
      <section className="ent-hero">
        <div className="grid-bg" />
        <div className="container ent-hero-body">
          <p className="eyebrow">Text.js Enterprise</p>
          <h1>The console, at enterprise scale.</h1>
          <p className="rs-lede">Compliance, uptime and a named engineer for teams that ship their product in DevTools.</p>
          <div className="hero-ctas">
            <a href={SALES_HREF} className="btn btn-primary btn-lg">
              Contact sales
            </a>
            <A href="/status" className="btn btn-secondary btn-lg">
              View status
            </A>
          </div>
        </div>
      </section>

      <section className="container ent-stats" aria-label="Commitments">
        {STATS.map((s) => (
          <div key={s.label} className="ent-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section className="container ent-section">
        <div className="section-head">
          <p className="eyebrow">Compliance</p>
          <h2>Console compliance, built in.</h2>
          <p>Text.js keeps your entire user interface where your auditors can already see it.</p>
        </div>
        <div className="ent-grid">
          {COMPLIANCE.map((c) => (
            <div key={c.title} className="ent-card">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container ent-section">
        <div className="section-head">
          <p className="eyebrow">Security</p>
          <h2>A small attack surface. It is one function.</h2>
          <p>Turbolog defends against the Chromium console’s own behavior, and nothing else runs in your page.</p>
        </div>
        <div className="ent-grid">
          {SECURITY.map((c) => (
            <div key={c.title} className="ent-card">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container ent-section">
        <div className="section-head">
          <p className="eyebrow">Support</p>
          <h2>Dedicated support, in your timezone and your dock position.</h2>
        </div>
        <div className="ent-grid">
          {SUPPORT.map((c) => (
            <div key={c.title} className="ent-card">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container ent-section" id="pricing">
        <div className="section-head">
          <p className="eyebrow">Pricing</p>
          <h2>Simple pricing.</h2>
          <p>The framework is free. Enterprise adds people and promises.</p>
        </div>
        <div className="ent-plans">
          <div className="ent-plan">
            <h3>Open Source</h3>
            <p className="ent-price">
              $0<small> forever</small>
            </p>
            <p className="ent-plan-desc">The full framework, MIT licensed.</p>
            <A href="/docs" className="btn btn-secondary">
              Get started
            </A>
          </div>
          <div className="ent-plan ent-plan-featured">
            <h3>Enterprise</h3>
            <p className="ent-price">Custom</p>
            <p className="ent-plan-desc">An SLA, a named engineer and the paperwork.</p>
            <a href={SALES_HREF} className="btn btn-primary">
              Contact sales
            </a>
          </div>
        </div>
        <div className="ent-table-wrap">
          <table className="ent-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {PLANS.map((p) => (
                  <th key={p} scope="col">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            {FEATURES.map((g) => (
              <tbody key={g.group}>
                <tr className="ent-group">
                  <th scope="colgroup" colSpan={3}>
                    {g.group}
                  </th>
                </tr>
                {g.rows.map(([label, oss, ent]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>
                      <Check value={oss} />
                    </td>
                    <td>
                      <Check value={ent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="container ent-section">
        <div className="section-head">
          <p className="eyebrow">FAQ</p>
          <h2>Questions, answered.</h2>
        </div>
        <div className="ent-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container ent-cta">
        <h2>Talk to a console engineer.</h2>
        <p>We’ll reply in one message.</p>
        <a href={SALES_HREF} className="btn btn-primary btn-lg">
          Contact sales
        </a>
      </section>
    </div>
  );
}
