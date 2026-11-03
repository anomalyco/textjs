import { useEffect, useMemo, type ReactNode } from "react";
import { Box, KeyHint, Text, useFocusManager, useInput } from "@textjs/react";
import {
  EXAMPLE_HEADER_ROWS,
  exampleFrame,
  exampleGrid,
  exampleHeader,
  exampleSize,
  HOME_EXAMPLE_GRID,
  HOME_EXAMPLE_PREFIX,
  homeExampleHeader,
  isHomeExampleFrame,
  runsExamples,
} from "../../docs/preview-meta";
import { PREVIEWS } from "../../docs/previews";
import { siteStore } from "../store";
import { useSite } from "../useSite";

export {
  EXAMPLE_HEADER_ROWS,
  exampleFrame,
  exampleGrid,
  exampleHeader,
  exampleSize,
  HOME_EXAMPLE_GRID,
  HOME_EXAMPLE_PREFIX,
  homeExampleHeader,
  isHomeExampleFrame,
  runsExamples,
};

/** An example running full-size in the console, with one line of context. */
export function ExampleTab({ id }: { id: string }): ReactNode {
  const site = useSite();
  const focus = useFocusManager();
  const spec = PREVIEWS[id];
  const size = exampleSize(id, site.tab);
  const app = useMemo(() => spec?.render() ?? null, [spec]);
  const home = site.tab === "home";

  // Examples like forms and controls move focus with Tab, as they do in their own sandbox.
  useEffect(() => {
    focus.enableFocus();
    return () => focus.disableFocus();
  }, [focus]);

  // Last in line: only an Esc the example itself didn't use goes back to the page's view.
  useInput(
    (e) => {
      if (e.key !== "escape" || e.ctrl || e.meta || e.alt || e.shift) return;
      e.stopPropagation();
      siteStore.exitExample(id);
    },
    { priority: -100 },
  );

  if (!spec || !size) return null;
  return (
    <Box className="flex-col shrink-0" width={size.cols} height={size.rows + EXAMPLE_HEADER_ROWS}>
      <Box className="flex-row h-1 shrink-0 px-1 gap-2">
        <Box className="grow shrink overflow-hidden">
          <Text bold color="fg" wrap="truncate-end">
            {home ? homeExampleHeader(id) : exampleHeader(id)}
          </Text>
        </Box>
        <Box className="shrink-0">
          <KeyHint keys="Esc" label={home ? "back to counter" : "back to docs"} />
        </Box>
      </Box>
      <Box className="flex-col shrink-0" width={size.cols} height={size.rows}>
        {app}
      </Box>
    </Box>
  );
}
