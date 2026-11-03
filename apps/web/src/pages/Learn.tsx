import { useEffect, type ReactNode } from "react";
import { A } from "../router";
import { rich } from "../i18n/rich";
import { t } from "../i18n/t";
import { CONSOLE_TAGS, Footer } from "../site/Chrome";
import { ArrowRight } from "../site/icons";
import { certificateLines, formatCertificateDate, linkedInAddUrl, NAME_PLACEHOLDER } from "../learn/certificate";
import { ChapterBody, chapterHeadings } from "../learn/ChapterBody";
import { ChapterVideo } from "../learn/ChapterVideo";
import { CHAPTERS, chapterIndex, chapterNumber, COMPLETE_SLUG, COURSE_APP, getChapter, learnPath, OVERVIEW_HINTS, CERTIFICATE_HINTS, ABOUT_MINUTES, type Chapter } from "../learn/course";
import { LearnPad } from "../learn/LearnPad";
import { isCourseComplete, progressStore, useProgress, type Progress } from "../learn/progress";
import { Quiz } from "../learn/Quiz";
import "../learn/learn.css";

function doneCount(p: Progress): number {
  return CHAPTERS.filter((c) => p.done.includes(c.slug)).length;
}

/** Fixed-size progress readout: the bar scales instead of resizing, so nothing moves when progress loads. */
function ProgressMeter({ progress }: { progress: Progress }): ReactNode {
  const n = doneCount(progress);
  return (
    <div className="learn-meter">
      <div className="learn-meter-label">
        <span>{t("Progress")}</span>
        <span className="mono">{`${n}/${CHAPTERS.length}`}</span>
      </div>
      <div className="learn-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={CHAPTERS.length} aria-valuenow={n} aria-label={t("Chapters completed")}>
        <span style={{ transform: `scaleX(${n / CHAPTERS.length})` }} />
      </div>
    </div>
  );
}

function Check({ done, n }: { done: boolean; n: string }): ReactNode {
  return (
    <span className={`learn-check${done ? " done" : ""}`} aria-label={done ? t("Completed") : undefined}>
      {done ? "✓" : n}
    </span>
  );
}

function nextChapter(p: Progress): Chapter {
  const last = getChapter(p.last ?? "");
  if (last && !p.done.includes(last.slug)) return last;
  return CHAPTERS.find((c) => !p.done.includes(c.slug)) ?? last ?? (CHAPTERS[0] as Chapter);
}

/* ─────────────── /learn ─────────────── */

function Overview(): ReactNode {
  const progress = useProgress();
  const started = progress.done.length > 0 || progress.last !== null;
  const complete = isCourseComplete(progress);
  const next = nextChapter(progress);
  return (
    <div className="container learn-overview">
      <header className="learn-hero">
        <h1>{t("Build a deploy dashboard in your console")}</h1>
        <p className="learn-lede">{t("This free course has {chapters} chapters. You'll build {app} from an empty page to a deployed app with routes, data and tests. Each chapter runs live in DevTools as you read it.", { chapters: CHAPTERS.length, app: COURSE_APP })}</p>
        <div className="learn-cta">
          {complete ? (
            <A href={learnPath(COMPLETE_SLUG)} className="btn btn-primary">
              {t("View certificate")} <ArrowRight />
            </A>
          ) : (
            <A href={learnPath(next.slug)} className="btn btn-primary">
              {started ? t("Resume: {title}", { title: next.title }) : t("Start learning")} <ArrowRight />
            </A>
          )}
        </div>
        <p className="learn-meta">{t("{chapters} chapters · about {minutes} minutes · Chrome, Edge, Firefox or Safari", { chapters: CHAPTERS.length, minutes: ABOUT_MINUTES })}</p>
        <ProgressMeter progress={progress} />
      </header>

      <ol className="learn-chapters">
        {CHAPTERS.map((c) => {
          const done = progress.done.includes(c.slug);
          return (
            <li key={c.slug}>
              <A href={learnPath(c.slug)} className="learn-chapter-card">
                <Check done={done} n={chapterNumber(c.slug)} />
                <span className="learn-chapter-text">
                  <span className="learn-chapter-title">{c.title}</span>
                  <span className="learn-chapter-summary">{c.summary}</span>
                </span>
                <span className="learn-chapter-min">{t("{minutes} min", { minutes: c.minutes })}</span>
              </A>
            </li>
          );
        })}
        <li>
          <A href={learnPath(COMPLETE_SLUG)} className="learn-chapter-card learn-chapter-cert">
            <Check done={complete} n="▼" />
            <span className="learn-chapter-text">
              <span className="learn-chapter-title">{t("Certificate")}</span>
              <span className="learn-chapter-summary">{t("Get a certificate with your name, rendered in the console.")}</span>
            </span>
          </A>
        </li>
      </ol>

      <section className="learn-section">
        <h2>{t("The course runs in your console")}</h2>
        <p className="learn-section-lede">
          {rich("Open the console with <keys></keys><safari> (<link>turn on developer features</link> first)</safari>, click below and pick a chapter with the arrow keys.", CONSOLE_TAGS)}
        </p>
        <LearnPad title="learn" hints={OVERVIEW_HINTS.hints} action={OVERVIEW_HINTS.action} />
      </section>
    </div>
  );
}

/* ─────────────── /learn/<chapter> ─────────────── */

function ChapterNav({ current, progress }: { current: string; progress: Progress }): ReactNode {
  return (
    <nav className="learn-sidebar" aria-label={t("Chapters")}>
      <A href="/learn" className="learn-sidebar-head">
        {t("Learn Text.js")}
      </A>
      <ProgressMeter progress={progress} />
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.slug}>
            <A href={learnPath(c.slug)} aria-current={c.slug === current ? "page" : undefined}>
              <Check done={progress.done.includes(c.slug)} n={String(chapterIndex(c.slug) + 1)} />
              <span>{c.title}</span>
            </A>
          </li>
        ))}
        <li>
          <A href={learnPath(COMPLETE_SLUG)} aria-current={current === COMPLETE_SLUG ? "page" : undefined}>
            <Check done={isCourseComplete(progress)} n="▼" />
            <span>{t("Certificate")}</span>
          </A>
        </li>
      </ol>
    </nav>
  );
}

function ChapterPage({ chapter }: { chapter: Chapter }): ReactNode {
  const progress = useProgress();
  const i = chapterIndex(chapter.slug);
  const prev = CHAPTERS[i - 1];
  const next = CHAPTERS[i + 1];
  const n = chapterNumber(chapter.slug);
  const headings = chapterHeadings(chapter.markdown);

  useEffect(() => progressStore.visit(chapter.slug), [chapter.slug]);

  return (
    <div className="learn-layout">
      <ChapterNav current={chapter.slug} progress={progress} />
      <div className="learn-body">
        <article className="learn-main">
          <div className="breadcrumbs">
            <A href="/learn">{t("Learn")}</A>
            <span>/</span>
            <span>{t("Chapter {n} of {total}", { n: i + 1, total: CHAPTERS.length })}</span>
          </div>
          <h1 className="docs-title">{chapter.title}</h1>
          <p className="docs-desc">{chapter.summary}</p>
          <div className="learn-live-note">
            <span className="dot" aria-hidden="true" />
            <span>
              {rich("This chapter's app is running in your console. Open it with <keys></keys><safari> (<link>turn on developer features</link> first)</safari>, then <try>try it</try>.", {
                ...CONSOLE_TAGS,
                try: (c) => <a href="#try-it">{c}</a>,
              })}
            </span>
          </div>
          <ChapterVideo slug={chapter.slug} title={chapter.title} />
          <div className="learn-outline">
            <h2>{t("In this chapter")}</h2>
            <ul>
              {headings.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>

          <ChapterBody markdown={chapter.markdown} />

          <section className="learn-section" aria-labelledby="try-it">
            <h2 id="try-it">{t("Try it")}</h2>
            <p className="learn-section-lede">{t("This is {app} at the end of the chapter, running in DevTools. Click the pad, then use the keys below.", { app: COURSE_APP })}</p>
            <LearnPad title={`${n} · ${chapter.title}`} hints={chapter.hints} action={chapter.action} />
          </section>

          <Quiz key={chapter.slug} chapter={chapter} />

          <nav className="docs-nav" aria-label={t("Chapters")}>
            {prev ? (
              <A href={learnPath(prev.slug)}>
                <small>{t("Previous")}</small>
                <span>
                  <span className="rtl-flip">←</span> {prev.title}
                </span>
              </A>
            ) : (
              <A href="/learn">
                <small>{t("Course")}</small>
                <span>
                  <span className="rtl-flip">←</span> {t("Overview")}
                </span>
              </A>
            )}
            <A href={learnPath(next ? next.slug : COMPLETE_SLUG)} className="next">
              <small>{next ? t("Chapter {n}", { n: i + 2 }) : t("Finish")}</small>
              <span>
                {next ? next.title : t("Certificate")} <span className="rtl-flip">→</span>
              </span>
            </A>
          </nav>
        </article>
        <Footer />
      </div>
    </div>
  );
}

/* ─────────────── /learn/certificate ─────────────── */

function CertificatePage(): ReactNode {
  const progress = useProgress();
  const complete = isCourseComplete(progress);
  const n = doneCount(progress);
  const lines = certificateLines(progress.name, formatCertificateDate(progress.completedAt));
  return (
    <div className="learn-layout">
      <ChapterNav current={COMPLETE_SLUG} progress={progress} />
      <div className="learn-body">
        <article className="learn-main">
          <div className="breadcrumbs">
            <A href="/learn">{t("Learn")}</A>
            <span>/</span>
            <span>{t("Certificate")}</span>
          </div>
          <h1 className="docs-title">{t("Certificate")}</h1>
          <p className="docs-desc">{t("Complete all {chapters} chapters to get a certificate, printed on the page and in your console.", { chapters: CHAPTERS.length })}</p>
          <p className={`learn-cert-status${complete ? " done" : ""}`}>
            {complete ? t("✓ Course complete. {date}", { date: formatCertificateDate(progress.completedAt) }) : t("{done} of {chapters} chapters complete. Complete the rest to get your certificate.", { done: n, chapters: CHAPTERS.length })}
          </p>

          <label className="learn-name">
            <span>{t("Name on certificate")}</span>
            <input
              type="text"
              value={progress.name}
              placeholder={NAME_PLACEHOLDER}
              maxLength={48}
              autoComplete="name"
              spellCheck={false}
              onChange={(e) => progressStore.setName(e.target.value)}
            />
          </label>

          <div className={`learn-cert${complete ? "" : " pending"}`}>
            <pre aria-label={t("Certificate")}>{lines.join("\n")}</pre>
          </div>

          <section className="learn-section" aria-labelledby="in-console">
            <h2 id="in-console">{t("In your console")}</h2>
            <p className="learn-section-lede">{t("Text.js renders the same certificate in the console. It updates as you type your name.")}</p>
            <LearnPad title="certificate" hints={CERTIFICATE_HINTS.hints} action={CERTIFICATE_HINTS.action} />
          </section>

          <p className="learn-reset">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                if (window.confirm(t("Reset your course progress?"))) progressStore.reset();
              }}
            >
              {t("Reset progress")}
            </button>
            <a
              className="text-link"
              href={complete ? (linkedInAddUrl(progress.completedAt) ?? undefined) : undefined}
              target="_blank"
              rel="noreferrer"
              style={{ visibility: complete ? "visible" : "hidden" }}
            >
              {t("Add to LinkedIn")}
            </a>
          </p>
        </article>
        <Footer />
      </div>
    </div>
  );
}

export function LearnPage({ slug }: { slug: string }): ReactNode {
  if (slug === COMPLETE_SLUG) return <CertificatePage />;
  const chapter = getChapter(slug);
  return chapter ? <ChapterPage key={chapter.slug} chapter={chapter} /> : <Overview />;
}
