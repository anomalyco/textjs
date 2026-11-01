import type { ReactNode } from "react";
import { Box, Select, Text, themes, useAppTheme, useTheme, useViewport, type Metadata, type SelectOption, type ThemeName } from "@textjs/app";

export const metadata: Metadata = { title: "Settings" };

const VIEWPORTS: SelectOption<string>[] = [
  { value: "80x24", label: "80×24", description: "VT100 classic" },
  { value: "100x32", label: "100×32", description: "Default" },
  { value: "120x38", label: "120×38", description: "Wide console" },
  { value: "responsive", label: "Responsive", description: "Follow the docked DevTools size" },
];

export default function SettingsPage(): ReactNode {
  const theme = useTheme();
  const shell = useAppTheme();
  const viewport = useViewport();

  const themeOptions: SelectOption<ThemeName>[] = (Object.keys(themes) as ThemeName[]).map((name) => ({
    value: name,
    label: themes[name].name,
    description: themes[name].appearance,
  }));
  const currentViewport = viewport.responsive ? "responsive" : `${viewport.cols}x${viewport.rows}`;

  const applyViewport = (value: string): void => {
    if (value === "responsive") {
      viewport.setResponsive(true);
      return;
    }
    const [cols, rows] = value.split("x").map(Number);
    viewport.setResponsive(false);
    viewport.resize(cols ?? 100, rows ?? 32);
  };

  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row h-1 shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          Settings
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {"  tab switch panel · ↑/↓ choose · enter apply"}
        </Text>
      </Box>
      <Box className="flex-row gap-2 shrink-0">
        <Box className="flex-col grow basis-0 border rounded px-1" borderColor={theme.border} title=" Theme " titleColor={theme.muted}>
          <Select options={themeOptions} value={shell.themeName as ThemeName} onChange={(name) => shell.setTheme(name)} autoFocus />
        </Box>
        <Box className="flex-col grow basis-0 border rounded px-1" borderColor={theme.border} title=" Viewport " titleColor={theme.muted}>
          <Select options={VIEWPORTS} value={currentViewport} onChange={applyViewport} />
        </Box>
      </Box>
      <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title=" Preview " titleColor={theme.muted}>
        <Box className="flex-row gap-1 h-1">
          {(["accent", "success", "warning", "danger", "info"] as const).map((token) => (
            <Text key={token} bg={theme[token]} color={theme.bg} wrap="nowrap">{` ${token} `}</Text>
          ))}
        </Box>
        <Text color={theme.muted} wrap="truncate-end">{`${shell.theme.name} · ${viewport.cols}×${viewport.rows} · ${viewport.responsive ? "responsive" : "fixed"} · dock ${viewport.dock}`}</Text>
      </Box>
    </Box>
  );
}
