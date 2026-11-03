import type { ReactNode } from "react";
import changelog from "../../../../CHANGELOG.md?raw";
import { formatDate, t } from "../i18n/t";
import { A } from "../router";
import { Inline, MarkdownDoc } from "../site/Markdown";
import "./resources.css";

export interface ChangelogRelease {
  /** `1.0.0` or `Unreleased`. */
  version: string;
  /** ISO date, absent for Unreleased. */
  date?: string;
  id: string;
  body: string;
}

/** Split a Keep a Changelog file into its intro and `## [version] - date` sections. */
export function parseChangelog(source: string): { intro: string; releases: ChangelogRelease[] } {
  const [head = "", ...sections] = source.split(/^## /m);
  const intro = head.replace(/^# .*$/m, "").trim();
  const releases = sections.map((s) => {
    const nl = s.indexOf("\n");
    const title = (nl < 0 ? s : s.slice(0, nl)).trim();
    const m = /^\[?([^\]\s]+)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/.exec(title);
    const version = m?.[1] ?? title;
    return {
      version,
      date: m?.[2],
      id: version.toLowerCase() === "unreleased" ? "unreleased" : `v${version.replace(/\./g, "-")}`,
      body: nl < 0 ? "" : s.slice(nl + 1).trim(),
    };
  });
  // An empty section (e.g. `## [Unreleased]` between releases) isn't a release yet.
  return { intro, releases: releases.filter((r) => r.body !== "") };
}

const PARSED = parseChangelog(changelog);
export const CHANGELOG_RELEASES = PARSED.releases;

export function ChangelogPage(): ReactNode {
  return (
    <div className="container cl">
      <header className="rs-head">
        <h1>{t("What’s new in Text.js")}</h1>
        <div className="rs-lede prose">
          <p>
            <Inline text={PARSED.intro.split("\n\n")[0] ?? ""} />
          </p>
        </div>
        <div className="rs-head-links">
          <A href="/blog" className="text-link">
            <span>
              {t("Read the blog")} <span className="rtl-flip">→</span>
            </span>
          </A>
        </div>
      </header>
      <ol className="cl-list">
        {PARSED.releases.map((r) => (
          <li key={r.id} id={r.id} className="cl-release">
            <div className="cl-meta">
              <a href={`#${r.id}`} className="cl-version">
                {r.version === "Unreleased" ? t("Unreleased") : `v${r.version}`}
              </a>
              <time className="cl-date" dateTime={r.date}>
                {r.date ? formatDate(r.date) : t("In progress")}
              </time>
            </div>
            <div className="cl-body">
              <MarkdownDoc source={r.body} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
