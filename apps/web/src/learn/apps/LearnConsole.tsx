import { useState, type ReactNode } from "react";
import { Box, KeyHint, Spacer, Text, useInput } from "@textjs/react";
import { siteStore } from "../../console-companion/store";
import { useSite } from "../../console-companion/useSite";
import { navigate } from "../../router";
import { certificateLines, formatCertificateDate } from "../certificate";
import { CHAPTERS, chapterNumber, COMPLETE_SLUG, getChapter, learnHints, learnPath, learnSlugForPath } from "../course";
import { isCourseComplete, useProgress } from "../progress";
import { CHAPTER_APPS } from "./chapters";

function Header({ crumb }: { crumb: string }): ReactNode {
  const progress = useProgress();
  const done = CHAPTERS.filter((c) => progress.done.includes(c.slug)).length;
  return (
    <Box className="flex-row h-1 shrink-0 px-2 gap-1">
      <Text bold color="fg" wrap="nowrap">
        ▼ Text.js
      </Text>
      <Text color="subtle" wrap="truncate-end">{` / learn${crumb ? ` / ${crumb}` : ""}`}</Text>
      <Spacer />
      <Text color={done === CHAPTERS.length ? "success" : "subtle"} wrap="nowrap">{`${done}/${CHAPTERS.length}`}</Text>
    </Box>
  );
}

function Overview(): ReactNode {
  const progress = useProgress();
  const resume = Math.max(0, CHAPTERS.findIndex((c) => c.slug === progress.last));
  const [index, setIndex] = useState(resume);
  useInput((e) => {
    if (e.key === "up" || e.key === "down") setIndex((i) => Math.max(0, Math.min(CHAPTERS.length - 1, i + (e.key === "down" ? 1 : -1))));
    else if (e.key === "return") {
      const c = CHAPTERS[index];
      if (!c) return;
      navigate(learnPath(c.slug));
      // Keep typing into the chapter's app.
      siteStore.set({ consoleInput: true });
    } else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow px-2">
      <Text bold>Learn Text.js</Text>
      <Text color="muted" wrap="truncate-end">
        Build Acme Deploys, a deploy dashboard, in ten chapters.
      </Text>
      <Box className="flex-col shrink-0" marginTop={1}>
        {CHAPTERS.map((c, i) => {
          const done = progress.done.includes(c.slug);
          const on = i === index;
          return (
            <Box key={c.slug} className="flex-row h-1 gap-1 px-1" backgroundColor={on ? "selection" : undefined}>
              <Text color={done ? "success" : "subtle"} wrap="nowrap">
                {done ? "✓" : "○"}
              </Text>
              <Text color="subtle" wrap="nowrap">
                {chapterNumber(c.slug)}
              </Text>
              <Text color={on ? "fg" : "muted"} bold={on} wrap="truncate-end">
                {c.title}
              </Text>
              <Spacer />
              <Text color="subtle" wrap="nowrap">{`${c.minutes} min`}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function Certificate(): ReactNode {
  const progress = useProgress();
  const complete = isCourseComplete(progress);
  useInput((e) => {
    if (e.input !== "t") return;
    e.stopPropagation();
    siteStore.cycleTheme();
  });
  const lines = certificateLines(progress.name, formatCertificateDate(progress.completedAt));
  return (
    <Box className="flex-col grow items-center">
      <Box className="flex-col shrink-0">
        {lines.map((l, i) => (
          <Text key={i} color={i === 8 || i === 4 ? "fg" : complete ? "muted" : "subtle"} wrap="nowrap">
            {l}
          </Text>
        ))}
      </Box>
      {complete ? null : (
        <Text color="subtle" marginTop={1}>
          {`Finish all ${CHAPTERS.length} chapters to make it official.`}
        </Text>
      )}
    </Box>
  );
}

/** The console view for every /learn page: the course, a chapter's app, or the certificate. */
export function LearnConsole(): ReactNode {
  const site = useSite();
  const slug = learnSlugForPath(site.pathname) ?? "";
  const chapter = getChapter(slug);
  const App = chapter ? CHAPTER_APPS[chapter.slug] : undefined;
  const { hints } = learnHints(slug);
  const crumb = chapter ? `${chapterNumber(chapter.slug)} ${chapter.title}` : slug === COMPLETE_SLUG ? "certificate" : "";
  return (
    <Box className="flex-col grow pt-1">
      <Header crumb={crumb} />
      <Box className="flex-col grow overflow-hidden" paddingTop={1}>
        {App ? (
          <Box className="flex-col grow border rounded mx-2 overflow-hidden">
            <App key={slug} />
          </Box>
        ) : slug === COMPLETE_SLUG ? (
          <Certificate />
        ) : (
          <Overview />
        )}
      </Box>
      <Box className="flex-row h-1 shrink-0 px-2 gap-3" marginTop={App ? 1 : 0}>
        {hints.map((h) => (
          <KeyHint key={h.keys} keys={h.keys} label={h.label} />
        ))}
      </Box>
    </Box>
  );
}
