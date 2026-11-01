# Copy style for textjs.org

General rules (banned patterns, register, humour) live in the `writing-copy` skill (`~/.config/opencode/skills/writing-copy/SKILL.md`). This file covers what is specific to Text.js.

1. **Sources of truth.** Check every claim against the code, `ARCHITECTURE.md`, `CHANGELOG.md` and `src/pages/status-history.json`. When copy and code disagree, fix the copy.
2. **Numbers.** Performance figures come from the latest run in `status-history.json` (today: 0.163ms full repaint, 0.011ms one-row edit, 0.000ms idle, 149 `%c` spans for 3,200 cells, Apple M5 Pro · Bun 1.4.4, mean of 1,000 frames). Import them in TSX instead of retyping them. DevTools figures (70.6% → 1.0% blank paints, 10.4ms lag) come from the same file. Frames are at least 66ms apart; there is no 16.6ms budget.
3. **Facts that drift.** The package is `@textjs/next`. Requirements are Bun 1.2+ or Node.js 22+. Frames are appended, and the console is cleared only on the first frame, after `invalidate()`, at idle once 100 frames are stacked, and at 300. The page is never empty: it hosts a `<FocusPad>` and a hidden `<textarea>`. Line charts use quadrant dots; braille is opt-in for terminals.
4. **Keys and commands.** Copy them from the source: `apps/opencode-console/components/Shell.tsx` for OpenCode, `console-companion/store.ts` for site hints, `packages/text/src/cli` for CLI output.
5. **Headings.** A feature name or one plain statement, no trailing period (`test/routes.test.tsx` enforces this on the landing page). Vary the form between sections; not every section needs a subhead.
6. **Brand.** Always `▼`, never `▲`. The parody is the premise (an SLA for `console.log`, a status page for Turbolog), stated with a straight face. Marketing pages may carry it; docs, error pages and READMEs stay instructional.
7. **Say it once.** A fact lives in the docs. Landing, blog and Learn copy link to it instead of repeating a tagline.
8. **Asserted strings.** `apps/web/test/*` asserts headings, pad captions and titles. Update the assertion with the copy, and keep the test's intent. Docs pages must stay over 800 characters with at least three headings.
