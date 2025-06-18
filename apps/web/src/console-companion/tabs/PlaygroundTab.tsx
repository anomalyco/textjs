import type { ReactNode } from "react";
import { Box, Tabs, Text, useInput, useTheme } from "@textjs/react";
import { PresetView } from "../../demos/presets";
import { PRESETS, siteStore, type PresetId } from "../store";
import { useSite } from "../useSite";

export function PlaygroundTab(): ReactNode {
  const theme = useTheme();
  const site = useSite();
  const preset = PRESETS.find((p) => p.id === site.preset) ?? PRESETS[0];

  useInput((e) => {
    if (e.input === "[" || e.input === "]") {
      e.stopPropagation();
      siteStore.cyclePreset(e.input === "]" ? 1 : -1);
    }
  });

  return (
    <Box className="flex-col grow px-1">
      <Box className="flex-row h-1 shrink-0 gap-1">
        <Text color="subtle" wrap="nowrap">
          preset
        </Text>
        <Tabs
          tabs={PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          activeTab={site.preset}
          onChange={(id) => siteStore.set({ preset: id as PresetId })}
          shortcuts={false}
        />
      </Box>
      <Text color="subtle" wrap="truncate-end">
        {`${preset?.description ?? ""}  · synced with textjs.org/playground`}
      </Text>
      <Box className="flex-col grow border rounded mt-1" borderColor={theme.border} title={` ${site.playgroundTitle} `} titleColor={theme.muted} overflow="hidden">
        <PresetView preset={site.preset} title={site.playgroundTitle} reserveRows={9} />
      </Box>
    </Box>
  );
}
