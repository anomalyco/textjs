import { useMemo, useState, type ReactNode } from "react";
import { TX_PACKAGES, txMessage, type TxCode, type TxErrorDoc } from "@textjs/core";
import { rich } from "../i18n/rich";
import { t } from "../i18n/t";
import { A } from "../router";
import { CopyButton } from "../site/CodeBlock";
import { SearchIcon } from "../site/icons";
import { MarkdownDoc } from "../site/Markdown";
import { ERROR_DOCS as TX_ERRORS, getErrorPageDoc, TX000 } from "./tx000";

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
        <A href="/docs">{t("Docs")}</A>
        <span>/</span>
        <span>{t("Reference")}</span>
      </div>
      <h1 className="docs-title">{t("Error Codes")}</h1>
      <p className="docs-desc">{rich("Each <c>TX</c> code is stable and has a page with its cause and fix. Codes are never renumbered or reused.", { c: (c) => <code>{c}</code> })}</p>
      <label className="tx-errors-search">
        <SearchIcon size={16} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by code, message or package…")} aria-label={t("Search error codes")} spellCheck={false} autoComplete="off" />
        <span className="tx-errors-count" aria-live="polite">
          {t("{count} of {total}", { count: hits.length, total: TX_ERRORS.length })}
        </span>
      </label>
      {hits.length === 0 ? <p className="tx-errors-empty">{t("No error codes match “{query}”.", { query: query.trim() })}</p> : null}
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
                      {e.kind === "warning" ? <span className="badge tx-warning-badge">{t("Warning")}</span> : null}
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
    e.code === TX000.code ? `Text.js error ${e.code}: ${e.message}` : txMessage(e.code as TxCode).replace(/^Text\.js error/, e.kind === "warning" ? "Text.js warning" : "Text.js error");
  return (
    <article className="tx-errors">
      <div className="breadcrumbs">
        <A href="/errors">{t("Error Codes")}</A>
        <span>/</span>
        <span>{e.package}</span>
      </div>
      <p className="tx-error-code">
        <code className="tx-code">{e.code}</code>
        {e.kind === "warning" ? <span className="badge tx-warning-badge">{t("Warning")}</span> : null}
      </p>
      <h1 className="docs-title">{e.title}</h1>
      <div className={`tx-error-message${e.kind === "warning" ? " warning" : ""}`}>
        <div className="tx-error-message-head">
          <span>{t("Console")}</span>
          <CopyButton text={example} />
        </div>
        <p>
          <span className="tx-error-prefix">{e.kind === "warning" ? "Text.js warning" : "Text.js error"} {e.code}:</span> <Template text={e.message} />
        </p>
      </div>
      <section className="tx-error-section">
        <h2 id="why">{t("Why this happens")}</h2>
        <MarkdownDoc source={e.cause} />
      </section>
      <section className="tx-error-section">
        <h2 id="fix">{t("How to fix it")}</h2>
        <MarkdownDoc source={e.fix} />
      </section>
      <nav className="docs-nav" aria-label={t("Error codes")}>
        {prev ? (
          <A href={errorPath(prev.code)}>
            <small>{t("Previous")}</small>
            <span>
              <span className="rtl-flip">←</span>&nbsp;{prev.code} {prev.title}
            </span>
          </A>
        ) : (
          <A href="/errors">
            <small>{t("Index")}</small>
            <span>
              <span className="rtl-flip">←</span>&nbsp;{t("All error codes")}
            </span>
          </A>
        )}
        {next ? (
          <A href={errorPath(next.code)} className="next">
            <small>{t("Next")}</small>
            <span>
              {next.code} {next.title}&nbsp;<span className="rtl-flip">→</span>
            </span>
          </A>
        ) : null}
      </nav>
    </article>
  );
}
