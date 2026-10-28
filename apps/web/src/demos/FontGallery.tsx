/** Live docs preview for `@textjs/font`: every bundled FIGfont, cell-exact. */

import { useEffect, useState, type ReactNode } from "react";
import { Box, KeyHint, Spinner, Text, useInput } from "@textjs/react";
import { FigletText } from "@textjs/font/react";
import type { BundledFont } from "@textjs/font/all";
import type { FigletLayout } from "@textjs/font";

const LAYOUTS: Array<{ layout: FigletLayout; label: string }> = [
  { layout: "default", label: "default" },
  { layout: "fitted", label: "fitted" },
  { layout: "full", label: "full width" },
  { layout: "universal", label: "universal" },
];

/** Columns left for lettering: preview width minus the list, gap and padding. */
const STAGE_COLS = 82;

export function FontGalleryPreview({ text = "Text.js" }: { text?: string }): ReactNode {
  const [fonts, setFonts] = useState<readonly BundledFont[] | null>(null);
  const [index, setIndex] = useState(0);
  const [layoutIndex, setLayoutIndex] = useState(0);
  // All 17 fonts are ~300 kB of source: load them with the preview, not the docs bundle.
  useEffect(() => {
    let live = true;
    void import("@textjs/font/all").then((m) => live && setFonts(m.BUNDLED_FONTS));
    return () => {
      live = false;
    };
  }, []);
  const count = fonts?.length ?? 1;
  useInput((e) => {
    if (e.key === "down" || e.input === "j") setIndex((i) => (i + 1) % count);
    else if (e.key === "up" || e.input === "k") setIndex((i) => (i - 1 + count) % count);
    else if (e.key === "right" || e.input === "l") setLayoutIndex((i) => (i + 1) % LAYOUTS.length);
    else if (e.key === "left" || e.input === "h") setLayoutIndex((i) => (i - 1 + LAYOUTS.length) % LAYOUTS.length);
    else return;
    e.stopPropagation();
  });
  const layout = LAYOUTS[layoutIndex] ?? LAYOUTS[0]!;
  const current = fonts?.[index];
  if (!fonts || !current) {
    return (
      <Box className="p-1">
        <Spinner label="Loading fonts…" />
      </Box>
    );
  }

  return (
    <Box className="flex-row grow p-1 gap-1">
      <Box flexDirection="column" width={15} flexShrink={0}>
        {fonts.map((f, i) => (
          <Text key={f.id} color={i === index ? "accent" : "muted"} bold={i === index} wrap="truncate-end">
            {`${i === index ? "▸" : " "} ${f.font.name}`}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" flexGrow={1} gap={1}>
        <Text color="subtle" wrap="truncate-end">
          {`import { ${current.exportName} } from "@textjs/font/${current.id}"`}
        </Text>
        <Box flexGrow={1} flexDirection="column">
          <FigletText font={current.font} layout={layout.layout} columns={STAGE_COLS} color="accent">
            {text}
          </FigletText>
        </Box>
        <Text color="muted" wrap="truncate-end">{`${layout.label} layout · ${current.description}`}</Text>
        <Box className="flex-row gap-2">
          <KeyHint keys="↑↓" label="font" />
          <KeyHint keys="←→" label="layout" />
        </Box>
      </Box>
    </Box>
  );
}
