/**
 * Regenerates `lib/themes.json` from OpenCode's own theme resolver. The
 * checkout stays read-only: copy its theme sources into a scratch directory
 * whose node_modules provide `@opencode/theme`, `@opentui/core` and `effect`:
 *
 *   T=$TMPDIR/ocref; mkdir -p $T/node_modules/@opencode $T/tui/src
 *   cp -R ~/code/opencode/packages/theme $T/node_modules/@opencode/theme
 *   cp -R ~/code/opencode/packages/tui/src/theme $T/tui/src/theme
 *   ln -s ~/code/opencode/packages/tui/node_modules/{@opentui,effect} $T/node_modules/
 *   bun apps/opencode-console/scripts/dump-themes.ts $T
 *
 * Resolves every built-in theme (both modes) and keeps the tokens the console renders.
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const themes = await import(`${root}/tui/src/theme/index.ts`);
const tui = await import(`${root}/node_modules/@opencode/theme/src/tui/index.ts`);

type RGBA = { toHex?: () => string; r: number; g: number; b: number; a: number };
const hex = (c: RGBA): string => {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return c.a === 0 ? "transparent" : `#${h(c.r)}${h(c.g)}${h(c.b)}`;
};

const out: Record<string, Record<string, Record<string, string | string[]>>> = {};
const all = themes.allThemes() as Record<string, unknown>;
for (const [name, source] of Object.entries(all)) {
  if (name === "system") continue;
  const document = themes.parseTheme(source, name);
  for (const mode of tui.themeModes(document) as ("dark" | "light")[]) {
    const t = tui.resolveThemeDocument(document, mode);
    const flat: Record<string, string | string[]> = {
      bg: hex(t.background.base),
      raised: hex(t.background.raised.base),
      raisedDown: hex(t.decrease(t.background.raised.base)),
      high: hex(t.background.raised.high),
      max: hex(t.background.raised.max),
      text: hex(t.text.base),
      muted: hex(t.text.muted),
      mutedDown: hex(t.decrease(t.text.muted)),
      faint: hex(t.text.faint),
      border: hex(t.border.base),
      scrollbar: hex(t.scrollbar.base),
      primaryText: hex(t.text.action.primary.base),
      primaryTextFocused: hex(t.text.action.primary.focused),
      primaryTextSelected: hex(t.text.action.primary.selected),
      secondaryText: hex(t.text.action.secondary.base),
      secondaryTextHovered: hex(t.text.action.secondary.hovered),
      primaryBg: hex(t.background.action.primary.base),
      primaryBgFocused: hex(t.background.action.primary.focused),
      primaryBgHovered: hex(t.background.action.primary.hovered),
      formfield: hex(t.text.formfield.base),
      formfieldFocused: hex(t.text.formfield.focused),
      formfieldSelected: hex(t.text.formfield.selected),
      error: hex(t.text.feedback.error.base),
      warning: hex(t.text.feedback.warning.base),
      warningMuted: hex(t.text.feedback.warning.muted),
      success: hex(t.text.feedback.success.base),
      info: hex(t.text.feedback.info.base),
      accent: hex(t.hue.accent[mode === "light" ? 300 : 200]),
      diffAdded: hex(t.diff.text.added),
      diffRemoved: hex(t.diff.text.removed),
      diffContext: hex(t.diff.text.context),
      diffHunk: hex(t.diff.text.hunkHeader),
      diffAddedBg: hex(t.diff.background.added),
      diffRemovedBg: hex(t.diff.background.removed),
      diffContextBg: hex(t.diff.background.context),
      diffAddedSign: hex(t.diff.highlight.added),
      diffRemovedSign: hex(t.diff.highlight.removed),
      diffLineNumber: hex(t.diff.lineNumber.text),
      diffAddedLineNumberBg: hex(t.diff.lineNumber.background.added),
      diffRemovedLineNumberBg: hex(t.diff.lineNumber.background.removed),
      agents: (t.categorical as Record<number, RGBA>[]).map((scale) => hex(scale[200]!)),
    };
    for (const [k, v] of Object.entries(t.syntax as Record<string, RGBA>)) flat[`syntax.${k}`] = hex(v);
    for (const [k, v] of Object.entries(t.markdown as Record<string, RGBA>)) flat[`markdown.${k}`] = hex(v);
    (out[name] ??= {})[mode] = flat;
  }
}
const target = resolve(import.meta.dir, "../lib/themes.json");
await writeFile(target, JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} themes → ${target}`);
