import { useMemo, useState, type ReactNode } from "react";
import { TX_ERRORS, TX_PACKAGES, txMessage, type TxCode, type TxErrorDoc } from "@textjs/core";
import { A } from "../router";
import { CopyButton } from "../site/CodeBlock";
import { SearchIcon } from "../site/icons";
import { MarkdownDoc } from "../site/Markdown";
import { getErrorPageDoc, TX000 } from "./tx000";

export function errorPath(code: string): string {
  return `/errors/${code}`;
}

/** `%s` placeholders as `<var>…</var>`. */
function Template({ text }: { text: string }): ReactNode {
  const parts = text.split("%s");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 ? <var className="tx-arg">…</var> : null}
        </span>
      ))}
    </>
  );
}

export function matchesErrorQuery(e: TxErrorDoc, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/^tx/, "");
  if (/^\d+$/.test(digits) && (Number(digits) === Number(e.code.slice(2)) || e.code.slice(2).includes(digits))) return true;
  return [e.code, e.title, e.message, e.package, e.cause].some((s) => s.toLowerCase().includes(q));
}

export function ErrorsIndexPage(): ReactNode {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => TX_ERRORS.filter((e) => matchesErrorQuery(e, query)), [query]);
  return (
    <div className="tx-errors">
      <div className="breadcrumbs">
        <A href="/docs">Docs</A>
        <span>/</span>
        <span>Reference</span>
      </div>
      <h1 className="docs-title">Error Codes</h1>
      <p className="docs-desc">
        Each <code>TX</code> code is stable and has a page with its cause and fix. Codes are never renumbered or reused.
      </p>
      <label className="tx-errors-search">
        <SearchIcon size={16} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, message or package…" aria-label="Search error codes" spellCheck={false} autoComplete="off" />
        <span className="tx-errors-count" aria-live="polite">
          {hits.length} of {TX_ERRORS.length}
        </span>
      </label>
      {hits.length === 0 ? <p className="tx-errors-empty">No error codes match “{query.trim()}”.</p> : null}
      {TX_PACKAGES.map((pkg) => {
        const rows = hits.filter((e) => e.package === pkg);
        if (rows.length === 0) return null;
        return (
          <section key={pkg} className="tx-errors-group" aria-labelledby={`pkg-${pkg.replace(/\W+/g, "-")}`}>
            <h2 id={`pkg-${pkg.replace(/\W+/g, "-")}`}>{pkg}</h2>
            <ul>
              {rows.map((e) => (
                <li key={e.code}>
                  <A href={errorPath(e.code)}>
                    <code className="tx-code">{e.code}</code>
                    <span className="tx-errors-title">
                      {e.title}
                      {e.kind === "warning" ? <span className="badge tx-warning-badge">Warning</span> : null}
                    </span>
                    <span className="tx-errors-msg">
                      <Template text={e.message} />
                    </span>
                  </A>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function ErrorPage({ code }: { code: string }): ReactNode {
  const e = getErrorPageDoc(code);
  if (!e) return null;
  const i = TX_ERRORS.findIndex((x) => x.code === e.code);
  const prev = i > 0 ? TX_ERRORS[i - 1] : undefined;
  const next = TX_ERRORS[i + 1];
  const example =
    e === TX000 ? `Text.js error ${e.code}: ${e.message}` : txMessage(e.code as TxCode).replace(/^Text\.js error/, e.kind === "warning" ? "Text.js warning" : "Text.js error");
  return (
    <article className="tx-errors">
      <div className="breadcrumbs">
        <A href="/errors">Error Codes</A>
        <span>/</span>
        <span>{e.package}</span>
      </div>
      <p className="tx-error-code">
        <code className="tx-code">{e.code}</code>
        {e.kind === "warning" ? <span className="badge tx-warning-badge">Warning</span> : null}
      </p>
      <h1 className="docs-title">{e.title}</h1>
      <div className={`tx-error-message${e.kind === "warning" ? " warning" : ""}`}>
        <div className="tx-error-message-head">
          <span>Console</span>
          <CopyButton text={example} />
        </div>
        <p>
          <span className="tx-error-prefix">{e.kind === "warning" ? "Text.js warning" : "Text.js error"} {e.code}:</span> <Template text={e.message} />
        </p>
      </div>
      <section className="tx-error-section">
        <h2 id="why">Why this happens</h2>
        <MarkdownDoc source={e.cause} />
      </section>
      <section className="tx-error-section">
        <h2 id="fix">How to fix it</h2>
        <MarkdownDoc source={e.fix} />
      </section>
      <nav className="docs-nav" aria-label="Error codes">
        {prev ? (
          <A href={errorPath(prev.code)}>
            <small>Previous</small>
            <span>
              <span className="rtl-flip">←</span> {prev.code} {prev.title}
            </span>
          </A>
        ) : (
          <A href="/errors">
            <small>Index</small>
            <span>
              <span className="rtl-flip">←</span> All error codes
            </span>
          </A>
        )}
        {next ? (
          <A href={errorPath(next.code)} className="next">
            <small>Next</small>
            <span>
              {next.code} {next.title} <span className="rtl-flip">→</span>
            </span>
          </A>
        ) : null}
      </nav>
    </article>
  );
}
