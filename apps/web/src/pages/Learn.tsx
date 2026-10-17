import { useEffect, type ReactNode } from "react";
import { A } from "../router";
import { DevtoolsShortcut, Footer } from "../site/Chrome";
import { ArrowRight } from "../site/icons";
import { certificateLines, formatCertificateDate, NAME_PLACEHOLDER } from "../learn/certificate";
import { ChapterBody, chapterHeadings } from "../learn/ChapterBody";
import { CHAPTERS, chapterIndex, chapterNumber, COMPLETE_SLUG, COURSE_APP, getChapter, learnPath, OVERVIEW_HINTS, CERTIFICATE_HINTS, TOTAL_MINUTES, type Chapter } from "../learn/course";
import { LearnPad } from "../learn/LearnPad";
import { isCourseComplete, progressStore, useProgress, type Progress } from "../learn/progress";
import { Quiz } from "../learn/Quiz";

function doneCount(p: Progress): number {
  return CHAPTERS.filter((c) => p.done.includes(c.slug)).length;
}

/** Fixed-size progress readout: the bar scales instead of resizing, so nothing moves when progress loads. */
function ProgressMeter({ progress }: { progress: Progress }): ReactNode {
  const n = doneCount(progress);
  return (
    <div className="learn-meter">
      <div className="learn-meter-label">
        <span>Progress</span>
        <span className="mono">{`${n}/${CHAPTERS.length}`}</span>
      </div>
      <div className="learn-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={CHAPTERS.length} aria-valuenow={n} aria-label="Chapters completed">
        <span style={{ transform: `scaleX(${n / CHAPTERS.length})` }} />
      </div>
    </div>
  );
}

function Check({ done, n }: { done: boolean; n: string }): ReactNode {
  return (
    <span className={`learn-check${done ? " done" : ""}`} aria-label={done ? "Completed" : undefined}>
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
        <p className="learn-eyebrow">Learn Text.js</p>
        <h1>Build a deploy dashboard in your console.</h1>
        <p className="learn-lede">
          {`A free course in ${CHAPTERS.length} chapters. You'll build ${COURSE_APP} from an empty page to a routed, tested, shipped app, and every chapter runs live in DevTools as you read it.`}
        </p>
        <div className="learn-cta">
          {complete ? (
            <A href={learnPath(COMPLETE_SLUG)} className="btn btn-primary">
              View certificate <ArrowRight />
            </A>
          ) : (
            <A href={learnPath(next.slug)} className="btn btn-primary">
              {started ? `Resume: ${next.title}` : "Start learning"} <ArrowRight />
            </A>
          )}
        </div>
        <p className="learn-meta">{`${CHAPTERS.length} chapters · about ${TOTAL_MINUTES} minutes · Chrome, Edge or Arc`}</p>
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
                <span className="learn-chapter-min">{`${c.minutes} min`}</span>
              </A>
            </li>
          );
        })}
        <li>
          <A href={learnPath(COMPLETE_SLUG)} className="learn-chapter-card learn-chapter-cert">
            <Check done={complete} n="▼" />
            <span className="learn-chapter-text">
              <span className="learn-chapter-title">Certificate</span>
              <span className="learn-chapter-summary">Printed in the console, with your name on it.</span>
            </span>
          </A>
        </li>
      </ol>

      <section className="learn-section">
        <h2>The course runs in your console</h2>
        <p className="learn-section-lede">
          Open DevTools with <kbd><DevtoolsShortcut /></kbd>, click below and pick a chapter with the arrow keys.
        </p>
        <LearnPad title="learn" hints={OVERVIEW_HINTS.hints} action={OVERVIEW_HINTS.action} />
      </section>
    </div>
  );
}

/* ─────────────── /learn/<chapter> ─────────────── */

function ChapterNav({ current, progress }: { current: string; progress: Progress }): ReactNode {
  return (
    <nav className="learn-sidebar" aria-label="Chapters">
      <A href="/learn" className="learn-sidebar-head">
        Learn Text.js
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
            <span>Certificate</span>
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
            <A href="/learn">Learn</A>
            <span>/</span>
            <span>{`Chapter ${i + 1} of ${CHAPTERS.length}`}</span>
          </div>
          <h1 className="docs-title">{chapter.title}</h1>
          <p className="docs-desc">{chapter.summary}</p>
          <div className="learn-live-note">
            <span className="dot" aria-hidden="true" />
            <span>
              {"This chapter's app is running in your console. Open it with "}
              <kbd>
                <DevtoolsShortcut />
              </kbd>
              {", then "}
              <a href="#try-it">try it</a>.
            </span>
          </div>
          <div className="learn-outline">
            <h2>In this chapter</h2>
            <ul>
              {headings.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>

          <ChapterBody markdown={chapter.markdown} />

          <section className="learn-section" aria-labelledby="try-it">
            <h2 id="try-it">Try it</h2>
            <p className="learn-section-lede">{`${COURSE_APP} as it stands at the end of this chapter, live in DevTools. Click the pad, then use the keys below.`}</p>
            <LearnPad title={`${n} · ${chapter.title}`} hints={chapter.hints} action={chapter.action} />
          </section>

          <Quiz key={chapter.slug} chapter={chapter} />

          <nav className="docs-nav" aria-label="Chapters">
            {prev ? (
              <A href={learnPath(prev.slug)}>
                <small>Previous</small>
                <span>← {prev.title}</span>
              </A>
            ) : (
              <A href="/learn">
                <small>Course</small>
                <span>← Overview</span>
              </A>
            )}
            <A href={learnPath(next ? next.slug : COMPLETE_SLUG)} className="next">
              <small>{next ? `Chapter ${i + 2}` : "Finish"}</small>
              <span>{next ? next.title : "Certificate"} →</span>
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
            <A href="/learn">Learn</A>
            <span>/</span>
            <span>Certificate</span>
          </div>
          <h1 className="docs-title">Certificate</h1>
          <p className="docs-desc">{`Build ${COURSE_APP} in ${CHAPTERS.length} chapters and it's yours, printed on the page and in your console.`}</p>
          <p className={`learn-cert-status${complete ? " done" : ""}`}>
            {complete ? `✓ Course complete. ${formatCertificateDate(progress.completedAt)}` : `${n} of ${CHAPTERS.length} chapters complete. Finish the rest to make it official.`}
          </p>

          <label className="learn-name">
            <span>Name on certificate</span>
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
            <pre aria-label="Certificate">{lines.join("\n")}</pre>
          </div>

          <section className="learn-section" aria-labelledby="in-console">
            <h2 id="in-console">In your console</h2>
            <p className="learn-section-lede">The same certificate, rendered by Text.js. It updates as you type your name.</p>
            <LearnPad title="certificate" hints={CERTIFICATE_HINTS.hints} action={CERTIFICATE_HINTS.action} />
          </section>

          <p className="learn-reset">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                if (window.confirm("Reset your course progress?")) progressStore.reset();
              }}
            >
              Reset progress
            </button>
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
