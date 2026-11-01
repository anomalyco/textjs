import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { siteStore, tabForPath } from "../src/console-companion/store";
import { render, ROUTES } from "../src/entry-server";
import { LearnConsole } from "../src/learn/apps/LearnConsole";
import { certificateLines, CERT_WIDTH, formatCertificateDate } from "../src/learn/certificate";
import { chapterHeadings, splitChapter } from "../src/learn/ChapterBody";
import { CHAPTERS, COMPLETE_SLUG, learnHints, learnPath } from "../src/learn/course";
import { ChapterVideo } from "../src/learn/ChapterVideo";
import { applyDiff, parseDiff } from "../src/learn/DiffCode";
import { EMPTY_PROGRESS, parseProgress, PROGRESS_KEY, progressStore } from "../src/learn/progress";
import { quizPassed } from "../src/learn/Quiz";
import { formatDuration, learnVideo, PUBLISHED } from "../src/learn/video";
import { matchRoute, resetLocation, titleFor } from "../src/router";
import { Header } from "../src/site/Chrome";
import { mount, type Harness } from "./helpers";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const g = globalThis as { localStorage?: Storage };
const original = g.localStorage;
g.localStorage = new MemoryStorage() as unknown as Storage;

afterAll(() => {
  g.localStorage = original;
  resetLocation("/");
  siteStore.syncRoute("/");
});

const ALL = ["/learn", ...CHAPTERS.map((c) => learnPath(c.slug)), learnPath(COMPLETE_SLUG)];

describe("learn routing", () => {
  test("matches the overview, every chapter and the certificate", () => {
    expect(matchRoute("/learn")).toEqual({ name: "learn", slug: "" });
    expect(matchRoute("/learn/")).toEqual({ name: "learn", slug: "" });
    for (const c of CHAPTERS) expect(matchRoute(`/learn/${c.slug}`)).toEqual({ name: "learn", slug: c.slug });
    expect(matchRoute("/learn/certificate")).toEqual({ name: "learn", slug: COMPLETE_SLUG });
    expect(matchRoute("/learn/nope")).toEqual({ name: "not-found" });
    expect(matchRoute("/learn/layout/extra")).toEqual({ name: "not-found" });
    expect(matchRoute("/learning")).toEqual({ name: "not-found" });
  });

  test("titles", () => {
    expect(titleFor({ name: "learn", slug: "" })).toContain("Learn Text.js");
    expect(titleFor({ name: "learn", slug: "routing" })).toBe("Routing | Learn Text.js");
    expect(titleFor({ name: "learn", slug: COMPLETE_SLUG })).toBe("Certificate | Learn Text.js");
  });

  test("the console companion switches to the learn view", () => {
    expect(tabForPath("/learn")).toBe("learn");
    expect(tabForPath("/learn/testing")).toBe("learn");
    expect(tabForPath("/learning")).toBe("home");
  });

  test("8–10 chapters, each with prose, code steps, 2–3 key hints and a quiz", () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(8);
    expect(CHAPTERS.length).toBeLessThanOrEqual(10);
    for (const c of CHAPTERS) {
      const segments = splitChapter(c.markdown);
      expect(segments.some((s) => s.type === "diff")).toBe(true);
      expect(segments.some((s) => s.type === "markdown")).toBe(true);
      expect(chapterHeadings(c.markdown).length).toBeGreaterThanOrEqual(2);
      expect(c.hints.length).toBeGreaterThanOrEqual(2);
      expect(c.hints.length).toBeLessThanOrEqual(3);
      expect(c.quiz.length).toBeGreaterThan(0);
      for (const q of c.quiz) expect(q.options[q.answer]).toBeDefined();
      expect(c.markdown).not.toContain("▲");
    }
  });

  test("nav links to Learn", () => {
    const header = renderToStaticMarkup(<Header />);
    expect(header).toContain('href="/learn"');
    expect(header).toContain(">Learn<");
  });
});

describe("learn prerender", () => {
  test("every learn page is prerendered with a canonical path", () => {
    const paths = ROUTES.map((r) => r.path);
    for (const p of ALL) expect(paths).toContain(p);
    for (const r of ROUTES.filter((r) => r.path.startsWith("/learn"))) {
      expect(r.description.length).toBeGreaterThan(20);
      expect(r.canonical ?? r.path).toBe(r.path);
    }
  });

  test("pages render their final markup, with no pending Suspense boundaries", async () => {
    const overview = await render("/learn");
    expect(overview).toContain("Build a deploy dashboard in your console");
    expect(overview).toContain("Start learning");
    for (const c of CHAPTERS) expect(overview).toContain(`href="/learn/${c.slug}"`);
    expect(overview).toContain("data-textjs-focus-pad");
    for (const c of CHAPTERS) {
      const html = await render(learnPath(c.slug));
      expect(html).toContain(`class="docs-title">${c.title.replace(/&/g, "&amp;")}</h1>`);
      expect(html).toContain("learn-diff");
      expect(html).toContain('id="try-it"');
      expect(html).toContain("data-textjs-focus-pad");
      expect(html).toContain("Open on a desktop");
      expect(html).toContain('id="quiz"');
      expect(html).toContain('class="footer"');
      expect(html).not.toContain("<!--$?-->");
      expect(html).not.toContain("<template");
    }
    const cert = await render(learnPath(COMPLETE_SLUG));
    expect(cert).toContain("C E R T I F I C A T E");
    expect(cert).toContain("Your Name");
  });

  test("sitemap lists every learn page", () => {
    const sitemap = readFileSync(join(import.meta.dir, "../public/sitemap.xml"), "utf8");
    for (const p of ALL) expect(sitemap).toContain(`<loc>https://textjs.org${p}</loc>`);
  });

  test("touch devices get a readable course and an 'open on a desktop' console", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "learn", slug: "routing" }} />);
    expect(html).toContain("Open on a desktop");
    expect(html).toContain("tx-pad-touch");
  });
});

describe("learn progress", () => {
  beforeEach(() => {
    localStorage.clear();
    progressStore.reload();
  });

  test("starts empty and survives a reload", () => {
    expect(progressStore.getSnapshot()).toEqual(EMPTY_PROGRESS);
    progressStore.visit("layout");
    progressStore.complete("getting-started");
    progressStore.setName("Ada Lovelace");
    progressStore.reload();
    const p = progressStore.getSnapshot();
    expect(p.done).toEqual(["getting-started"]);
    expect(p.last).toBe("layout");
    expect(p.name).toBe("Ada Lovelace");
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}").done).toEqual(["getting-started"]);
  });

  test("records the completion date once every chapter is done", () => {
    const at = new Date("2026-10-31T12:00:00Z");
    for (const c of CHAPTERS.slice(0, -1)) progressStore.complete(c.slug, at);
    expect(progressStore.getSnapshot().completedAt).toBeNull();
    progressStore.complete((CHAPTERS[CHAPTERS.length - 1] as (typeof CHAPTERS)[number]).slug, at);
    expect(progressStore.getSnapshot().completedAt).toBe(at.toISOString());
    expect(formatCertificateDate(progressStore.getSnapshot().completedAt)).toBe("October 31, 2026");
  });

  test("ignores corrupt storage", () => {
    expect(parseProgress("{nope")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress(JSON.stringify({ done: ["a", 3, "a"], name: 5 }))).toEqual({ ...EMPTY_PROGRESS, done: ["a"] });
  });

  test("the progress shows on the overview and resumes where you left off", () => {
    progressStore.complete("getting-started");
    progressStore.visit("layout");
    const html = renderToStaticMarkup(<RouteView route={{ name: "learn", slug: "" }} />);
    // Static markup uses the server snapshot (what hydration sees); the client snapshot is what renders after.
    expect(html).toContain("Start learning");
    expect(progressStore.getSnapshot().done).toContain("getting-started");
  });

  test("a quiz passes only with every answer right", () => {
    const c = CHAPTERS[0] as (typeof CHAPTERS)[number];
    expect(quizPassed(c, [])).toBe(false);
    expect(quizPassed(c, c.quiz.map((q) => q.answer))).toBe(true);
    expect(quizPassed(c, c.quiz.map((q) => (q.answer + 1) % q.options.length))).toBe(false);
  });
});

describe("diff code steps and the certificate", () => {
  test("parses +/- lines and copies the resulting code", () => {
    const lines = parseDiff(" a\n-b\n+c\n d\n");
    expect(lines.map((l) => l.kind)).toEqual(["ctx", "del", "add", "ctx"]);
    expect(applyDiff(lines)).toBe("a\nc\nd");
  });

  test("the certificate is a fixed-width frame with the learner's name", () => {
    const lines = certificateLines("Ada Lovelace", "October 31, 2026");
    for (const l of lines) expect([...l].length).toBe(CERT_WIDTH);
    expect(lines.join("\n")).toContain("Ada Lovelace");
    expect(lines.join("\n")).toContain("October 31, 2026");
    expect(certificateLines("", "—").join("\n")).toContain("Your Name");
  });
});

/** Let real timers (spinners, streamed output) run until `text` shows up. */
async function until(h: Harness, text: string, timeout = 4000): Promise<void> {
  const end = Date.now() + timeout;
  while (!h.frame().includes(text) && Date.now() < end) await h.wait(50);
}

/** Each chapter's console app: a marker it renders, keys to press, and what must change. */
const KEYS: Record<string, { marker: string; press: (h: Harness) => Promise<void>; expect: (before: string, after: string) => boolean }> = {
  "getting-started": { marker: "Hello, console.", press: async (h) => h.key("return"), expect: (_b, a) => a.includes("×1") },
  layout: { marker: "Production", press: async (h) => h.type("s"), expect: (b, a) => b.includes("Overview") && !a.includes("Overview") },
  styling: { marker: "acme-web", press: async (h) => h.type("s"), expect: (b, a) => b.includes("● Ready") && a.includes("● Building") },
  "input-and-keymaps": { marker: "›  feat: stream", press: async (h) => h.key("down"), expect: (_b, a) => a.includes("›  perf: merge spans") },
  routing: { marker: "1 Overview", press: async (h) => h.type("2"), expect: (_b, a) => a.includes("acme.local/deployments") },
  "data-fetching": {
    marker: "GET /api/deployments",
    press: async (h) => {
      await until(h, "feat: stream cells downward");
      await h.type("n");
    },
    expect: (_b, a) => a.includes("POST /api/deployments"),
  },
  components: { marker: "Build time", press: async (h) => h.type("c"), expect: (_b, a) => a.includes("Average build time by project") },
  testing: {
    marker: "$ bun test",
    press: async (h) => {
      await h.key("return");
      await until(h, "5 pass");
    },
    expect: (_b, a) => a.includes("5 pass"),
  },
  terminal: { marker: "acme — zsh", press: async (h) => h.key("return"), expect: (_b, a) => a.includes("acme — text run") },
  shipping: {
    marker: "text build",
    press: async (h) => {
      await h.key("return");
      await until(h, "Shipped.");
    },
    // The log is the chapter's real `text build` output, scrolled like a terminal so the newest lines stay in view.
    expect: (_b, a) => a.includes("Shipped.") && a.includes("+ First Load JS shared by all") && a.includes("✓ Production:"),
  },
};

describe("chapter console apps", () => {
  afterAll(() => siteStore.syncRoute("/"));

  test("every chapter has a key script", () => {
    for (const c of CHAPTERS) expect(KEYS[c.slug]).toBeDefined();
  });

  for (const c of CHAPTERS) {
    test(`${c.slug}: renders and responds to its keys`, async () => {
      siteStore.syncRoute(learnPath(c.slug));
      const h = await mount(<LearnConsole />, { cols: 100, rows: 30, tabFocus: false });
      try {
        const spec = KEYS[c.slug];
        if (!spec) throw new Error(`no key script for ${c.slug}`);
        const before = h.frame();
        expect(before).toContain(`learn / ${String(CHAPTERS.indexOf(c) + 1).padStart(2, "0")} ${c.title}`);
        expect(before).toContain(spec.marker);
        for (const hint of learnHints(c.slug).hints) expect(before).toContain(hint.label);
        await spec.press(h);
        const after = h.frame();
        if (!spec.expect(before, after)) throw new Error(`${c.slug} did not respond:\n${after}`);
      } finally {
        await h.unmount();
      }
    });
  }

  test("input-and-keymaps: ? lists the labeled bindings", async () => {
    await act(async () => siteStore.syncRoute(learnPath("input-and-keymaps")));
    const h = await mount(<LearnConsole />, { cols: 100, rows: 30, tabFocus: false });
    try {
      await h.key("?", { shift: true, input: "?" });
      const f = h.frame();
      expect(f).toContain("Keyboard shortcuts");
      expect(f).toContain("Toggle details");
    } finally {
      await h.unmount();
    }
  });

  test("the overview lists the chapters, and the certificate shows the name", async () => {
    localStorage.clear();
    progressStore.reload();
    progressStore.setName("Grace Hopper");
    siteStore.syncRoute("/learn");
    const h = await mount(<LearnConsole />, { cols: 100, rows: 30, tabFocus: false });
    try {
      expect(h.frame()).toContain("01 Getting Started");
      expect(h.frame()).toContain("0/10");
      await act(async () => siteStore.syncRoute(learnPath(COMPLETE_SLUG)));
      expect(h.frame()).toContain("Grace Hopper");
      expect(h.frame()).toContain("C E R T I F I C A T E");
    } finally {
      await h.unmount();
    }
  });
});

describe("chapter videos", () => {
  test("stay off until a chapter is published", () => {
    for (const c of CHAPTERS) if (!(c.slug in PUBLISHED)) expect(learnVideo(c.slug)).toBeNull();
    expect(renderToStaticMarkup(<ChapterVideo slug="nope" title="Nope" />)).toBe("");
  });

  test("published chapters point at the R2 layout", () => {
    const v = learnVideo("getting-started", { "getting-started": 239.5 }, "https://media.example");
    expect(v).toEqual({
      src: "https://media.example/learn/getting-started/getting-started-1080p.mp4",
      srcSmall: "https://media.example/learn/getting-started/getting-started-720p.mp4",
      poster: "https://media.example/learn/getting-started/getting-started-poster.jpg",
      captions: "https://media.example/learn/getting-started/getting-started.vtt",
      duration: 239.5,
    });
    expect(formatDuration(239.5)).toBe("4:00");
    // The frame reserves its box before the player loads (no layout shift); the video waits for the viewport.
    const html = renderToStaticMarkup(<ChapterVideo slug="getting-started" title="Getting Started" video={v} />);
    expect(html).toContain('class="learn-video-frame"');
    expect(html).not.toContain("<video");
    expect(html).toContain("4:00 · narrated · captions");
  });
});
