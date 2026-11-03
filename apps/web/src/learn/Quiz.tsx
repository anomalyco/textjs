import { useState, type ReactNode } from "react";
import { plural, t } from "../i18n/t";
import type { Chapter } from "./course";
import { progressStore, useProgress } from "./progress";

/** Whether every question has its correct answer picked. */
export function quizPassed(chapter: Chapter, picks: ReadonlyArray<number | undefined>): boolean {
  return chapter.quiz.every((q, i) => picks[i] === q.answer);
}

export function Quiz({ chapter }: { chapter: Chapter }): ReactNode {
  const progress = useProgress();
  const done = progress.done.includes(chapter.slug);
  const [picks, setPicks] = useState<Array<number | undefined>>([]);

  const pick = (qi: number, oi: number): void => {
    const next = [...picks];
    next[qi] = oi;
    setPicks(next);
    if (quizPassed(chapter, next)) progressStore.complete(chapter.slug);
  };

  return (
    <section className="learn-quiz" aria-labelledby="quiz">
      <div className="learn-quiz-head">
        <h2 id="quiz">{t("Quiz")}</h2>
        <span className={`learn-status${done ? " done" : ""}`}>{done ? t("✓ Chapter complete") : plural(chapter.quiz.length, { one: "{count} question", other: "{count} questions" })}</span>
      </div>
      <p className="learn-quiz-lede">{t("Answer every question to complete the chapter.")}</p>
      {chapter.quiz.map((q, qi) => {
        const picked = picks[qi];
        const answered = picked !== undefined;
        const right = picked === q.answer;
        return (
          <fieldset key={q.question} className="learn-question">
            <legend>{q.question}</legend>
            <div className="learn-options" role="radiogroup" aria-label={q.question}>
              {q.options.map((o, oi) => {
                const state = picked === oi ? (oi === q.answer ? "right" : "wrong") : "";
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={picked === oi}
                    className={`learn-option ${state}`}
                    onClick={() => pick(qi, oi)}
                  >
                    <span className="learn-option-key" aria-hidden="true">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
            <p className={`learn-feedback${answered ? (right ? " right" : " wrong") : ""}`} aria-live="polite">
              {answered ? (right ? t("Correct. {explanation}", { explanation: q.explanation }) : t("Incorrect. Try another answer.")) : "\u00a0"}
            </p>
          </fieldset>
        );
      })}
    </section>
  );
}
