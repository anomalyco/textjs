import componentsMd from "./content/components.md?raw";
import dataFetchingMd from "./content/data-fetching.md?raw";
import gettingStartedMd from "./content/getting-started.md?raw";
import inputMd from "./content/input-and-keymaps.md?raw";
import layoutMd from "./content/layout.md?raw";
import routingMd from "./content/routing.md?raw";
import shippingMd from "./content/shipping.md?raw";
import stylingMd from "./content/styling.md?raw";
import terminalMd from "./content/terminal.md?raw";
import testingMd from "./content/testing.md?raw";
import {
  ABOUT_MINUTES,
  CERTIFICATE_HINTS,
  chapterIndex,
  chapterNumber,
  CHAPTERS_META,
  COMPLETE_SLUG,
  COURSE_APP,
  COURSE_TITLE,
  getChapterMeta,
  learnHints,
  learnPath,
  learnSlugForPath,
  OVERVIEW_HINTS,
  TOTAL_MINUTES,
  type ChapterMeta,
} from "./meta";
import { QUIZZES, type QuizQuestion } from "./quizzes";

export {
  ABOUT_MINUTES,
  CERTIFICATE_HINTS,
  chapterIndex,
  chapterNumber,
  CHAPTERS_META,
  COMPLETE_SLUG,
  COURSE_APP,
  COURSE_TITLE,
  getChapterMeta,
  learnHints,
  learnPath,
  learnSlugForPath,
  OVERVIEW_HINTS,
  TOTAL_MINUTES,
  type ChapterMeta,
  type QuizQuestion,
};

export interface Chapter extends ChapterMeta {
  markdown: string;
  quiz: readonly QuizQuestion[];
}

const CHAPTER_MARKDOWN: Record<string, string> = {
  "getting-started": gettingStartedMd,
  layout: layoutMd,
  styling: stylingMd,
  "input-and-keymaps": inputMd,
  routing: routingMd,
  "data-fetching": dataFetchingMd,
  components: componentsMd,
  testing: testingMd,
  terminal: terminalMd,
  shipping: shippingMd,
};

export const CHAPTERS: readonly Chapter[] = CHAPTERS_META.map((m) => ({
  ...m,
  markdown: CHAPTER_MARKDOWN[m.slug] ?? "",
  quiz: QUIZZES[m.slug] ?? [],
}));

export function getChapter(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}
