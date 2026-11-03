import type { ReactNode } from "react";
import { rich } from "../i18n/rich";
import { t } from "../i18n/t";
import { A } from "../router";
import "./resources.css";

export const SALES_EMAIL = "enterprise@textjs.org";
const SALES_BODY = ["Company:", "Team size:", "DevTools dock position (bottom, left, right or undocked):", "%c spans per frame (text.stats().spanCount):", ""].join("\r\n");
export const SALES_HREF = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Text.js Enterprise")}&body=${encodeURIComponent(SALES_BODY)}`;

export const STATS = [
  { value: "99.99%", label: t("of console.log calls return") },
  { value: "1", label: t("console.log per changed frame") },
  { value: "0", label: t("calls per idle frame") },
  { value: "66ms", label: t("minimum time between frames") },
];

const COMPLIANCE = [
  {
    title: t("Console visibility"),
    body: t("Every frame is a console message that anyone with DevTools open can read and copy."),
  },
  {
    title: t("Data residency"),
    body: t("Frames stay in the user’s DevTools and do not leave the tab."),
  },
  {
    title: t("Audit logging"),
    body: t("Scroll up in the console to review earlier frames, up to 300."),
  },
  {
    title: t("Least privilege"),
    body: t("Rendering needs no browser permissions. Frames are written with console.log, and the page hosts only a focus pad and a hidden input."),
  },
];

const SECURITY = [
  { title: t("Link hijacking defense"), body: t("Turbolog inserts a word joiner after :// and in path:line text, so DevTools doesn’t restyle it as a link.") },
  { title: t("Format string isolation"), body: t("Every literal % is escaped as %%. User input can’t consume a %c style argument.") },
  { title: t("Order confirmation"), body: t("Real orders on /coffee need a confirmation key that appears only in the console frame, so a key script can’t place one.") },
  { title: t("Local by default"), body: t("The OpenCode bridge is a loopback server that rejects unknown origins. It keeps the daemon password in memory and never logs it or sends it to the browser.") },
];

const SUPPORT = [
  { title: t("Named console engineer"), body: t("One engineer works with your team from evaluation to production.") },
  { title: t("Frame reviews"), body: t("Every quarter we review your %c span counts, changed rows and idle CPU.") },
  { title: t("Migration assistance"), body: t("We help move React DOM apps and terminal UIs to Text.js.") },
  { title: t("Private Slack channel"), body: t("Your team gets a shared Slack channel with Text.js engineers.") },
];

type Cell = string | boolean;

const PLANS = [t("Open Source"), t("Enterprise")];

const FEATURES: ReadonlyArray<{ group: string; rows: ReadonlyArray<[string, Cell, Cell]> }> = [
  {
    group: t("Framework"),
    rows: [
      [t("App Router, components and hooks"), true, true],
      [t("Turbolog engine"), true, true],
      [t("Appended frames"), true, true],
      [t("text run (terminal)"), true, true],
    ],
  },
  {
    group: t("Operations"),
    rows: [
      [t("Console uptime SLA"), false, "99.99%"],
      [t("Throttler-aware frame pacing"), true, true],
      [t("Frame reviews"), false, t("Quarterly")],
      [t("Security questionnaire"), false, true],
    ],
  },
  {
    group: t("Support"),
    rows: [
      [t("Community"), true, true],
      [t("Named console engineer"), false, true],
      [t("Response time"), t("Best effort"), t("1 business hour")],
    ],
  },
];

const FAQ: ReadonlyArray<{ q: string; a: ReactNode }> = [
  {
    q: t("Is Enterprise a different framework?"),
    a: t("No. Enterprise customers run the same MIT-licensed Text.js as everyone else, with support and an SLA."),
  },
  {
    q: t("What does the 99.99% SLA cover?"),
    a: t("The share of console.log calls that return to your application."),
  },
  {
    q: t("Which browsers are supported?"),
    a: t("Text.js runs in desktop Chrome, Edge, Arc, Brave, Firefox and Safari. Turbolog is tuned against the Chromium DevTools frontend and its 50ms viewport throttler, and adjusts its CSS for the Firefox and Safari consoles."),
  },
  {
    q: t("Do our users need DevTools open?"),
    a: t("Yes. The application renders in the DevTools console. The page shows the keyboard shortcut that opens it."),
  },
  {
    q: t("Can we self-host?"),
    a: t("Yes. text build produces static files, and text start or the bun adapter serves them with route handlers, middleware and server-rendered routes."),
  },
  {
    q: t("Is there a procurement-friendly invoice?"),
    a: rich("Yes. <link>Sample invoice (PDF)</link>", { link: (c) => <a href="/enterprise/sample-invoice.pdf">{c}</a> }),
  },
];

function Check({ value }: { value: Cell }): ReactNode {
  if (value === true)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-label={t("Included")} role="img">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (value === false)
    return (
      <span className="ent-none" aria-label={t("Not included")}>
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
          <h1>{t("The enterprise platform for console applications")}</h1>
          <p className="rs-lede">{t("Text.js Enterprise adds a 99.99% SLA and a named engineer for teams that ship their product in DevTools.")}</p>
          <div className="hero-ctas">
            <a href={SALES_HREF} className="btn btn-primary btn-lg">
              {t("Contact sales")}
            </a>
            <A href="/status" className="btn btn-secondary btn-lg">
              {t("View status")}
            </A>
          </div>
        </div>
      </section>

      <section className="container ent-stats" aria-label={t("Commitments")}>
        {STATS.map((s) => (
          <div key={s.label} className="ent-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section className="container ent-section">
        <div className="section-head">
          <h2>{t("Console compliance")}</h2>
          <p>{t("Text.js renders the entire interface in the DevTools console, where your auditors can already inspect it.")}</p>
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
          <h2>{t("Security")}</h2>
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
          <h2>{t("Dedicated support")}</h2>
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
          <h2>{t("Pricing")}</h2>
          <p>{t("The framework is free and MIT licensed.")}</p>
        </div>
        <div className="ent-plans">
          <div className="ent-plan">
            <h3>{t("Open Source")}</h3>
            <p className="ent-price">
              $0<small> {t("forever")}</small>
            </p>
            <p className="ent-plan-desc">{t("The full framework, MIT licensed.")}</p>
            <A href="/docs" className="btn btn-secondary">
              {t("Get started")}
            </A>
          </div>
          <div className="ent-plan ent-plan-featured">
            <h3>{t("Enterprise")}</h3>
            <p className="ent-price">{t("Custom")}</p>
            <p className="ent-plan-desc">{t("An SLA, a named engineer and a security questionnaire.")}</p>
            <a href={SALES_HREF} className="btn btn-primary">
              {t("Contact sales")}
            </a>
          </div>
        </div>
        <div className="ent-table-wrap">
          <table className="ent-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{t("Feature")}</span>
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
          <h2>{t("Frequently asked questions")}</h2>
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
        <h2>{t("Talk to a console engineer")}</h2>
        <a href={SALES_HREF} className="btn btn-primary btn-lg">
          {t("Contact sales")}
        </a>
      </section>
    </div>
  );
}
