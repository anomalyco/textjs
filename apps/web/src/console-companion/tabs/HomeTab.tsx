import { useState, type ReactNode } from "react";
import { AsciiFont, Badge, Box, Text, themes, useInput, useTheme } from "@textjs/react";
import { siteStore, THEME_ORDER } from "../store";
import { useFrameStats } from "../useFrameStats";
import { useSite } from "../useSite";

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/docs", label: "Docs" },
  { path: "/playground", label: "Playground" },
  { path: "/opencode", label: "OpenCode" },
  { path: "/showcase", label: "Showcase" },
] as const;

function Card({ title, children, grow = true }: { title: string; children: ReactNode; grow?: boolean }): ReactNode {
  const theme = useTheme();
  return (
    <Box className={`flex-col border rounded px-1 ${grow ? "grow basis-0" : "shrink-0"}`} borderColor={theme.border} title={` ${title} `} titleColor={theme.muted}>
      {children}
    </Box>
  );
}

export function HomeTab(): ReactNode {
  const theme = useTheme();
  const site = useSite();
  const stats = useFrameStats();
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    else if (e.key === "down") setCount((c) => c - 1);
    else if (e.key === "space") setCount((c) => c + 10);
    else if (e.input === "r") setCount(0);
    else return;
    e.stopPropagation();
  });

  const current = ROUTES.find((r) => (r.path === "/" ? site.pathname === "/" : site.pathname.startsWith(r.path)));

  return (
    <Box className="flex-col grow px-2 pt-1 gap-1">
      <Box className="flex-row shrink-0 gap-3" alignItems="center">
        <AsciiFont text="▼ TEXT.JS" color={theme.fg} />
        <Box className="flex-col grow">
          <Text bold color="fg">
            The Console Framework for the Web.
          </Text>
          <Text color="muted">React 19 · App Router · Yoga WASM · Turbolog %c RLE</Text>
          <Text color="subtle">You are looking at a real React app inside console.log.</Text>
          <Box className="flex-row gap-1 mt-1">
            <Badge variant="accent">LIVE</Badge>
            <Badge variant="outline">0 DOM nodes</Badge>
            <Badge variant="outline">1 log/frame</Badge>
          </Box>
        </Box>
      </Box>

      <Box className="flex-row gap-1 shrink-0">
        <Card title="useState">
          <Box className="flex-row gap-2" alignItems="center">
            <AsciiFont text={String(count)} font="compact" color={count < 0 ? theme.danger : count > 0 ? theme.success : theme.fg} />
            <Box className="flex-col">
              <Text color="muted">count</Text>
              <Text color="subtle">↑ ↓ space r</Text>
            </Box>
          </Box>
        </Card>
        <Card title="ThemeProvider">
          {THEME_ORDER.map((id) => {
            const on = id === site.theme;
            return (
              <Text key={id} color={on ? "accent" : "subtle"} bold={on} wrap="nowrap">
                {`${on ? "●" : "○"} ${themes[id].name}`}
              </Text>
            );
          })}
        </Card>
        <Card title="usePathname">
          {ROUTES.map((r) => {
            const on = r === current;
            return (
              <Text key={r.path} color={on ? "fg" : "subtle"} bold={on} bg={on ? theme.selection : undefined} wrap="truncate-end">
                {`${on ? "▸" : " "} ${r.path}`}
              </Text>
            );
          })}
        </Card>
        <Card title="renderer.stats()">
          <Text color="fg" wrap="nowrap">{`${stats.cols}×${stats.rows} cells`}</Text>
          <Text color="muted" wrap="nowrap">{`${stats.totalMs.toFixed(2)}ms frame`}</Text>
          <Text color="muted" wrap="nowrap">{`${stats.spanCount} %c spans`}</Text>
          <Text color="muted" wrap="nowrap">{`${stats.yogaNodes} yoga nodes`}</Text>
          <Text color="success" wrap="nowrap">{`${stats.skippedFrames} noop gated`}</Text>
        </Card>
      </Box>

      <Card title="Turbolog pipeline · live" grow={false}>
        <Box className="flex-row">
          {[
            ["React 19", `#${stats.frameCount}`],
            ["SceneNode", `${stats.yogaNodes} nodes`],
            ["Yoga WASM", `${stats.layoutMs.toFixed(2)}ms`],
            ["CellBuffer", `${stats.cols * stats.rows} cells`],
            ["Row gate", `${stats.dirtyRows}/${stats.rows} dirty`],
            ["RLE %c", `${stats.spanCount} spans`],
            ["console.log", "1× / frame"],
          ].map(([name, metric], i) => (
            <Box key={name} className="flex-col grow basis-0">
              <Text color={i === 6 ? "accent" : "fg"} bold wrap="nowrap">
                {`${name}${i < 6 ? " ▸" : ""}`}
              </Text>
              <Text color="subtle" wrap="nowrap">
                {metric}
              </Text>
            </Box>
          ))}
        </Box>
      </Card>

      <Box className="flex-col shrink-0">
        <Text color="muted">
          Keep this console open and navigate textjs.org — this app follows along. Press <Text color="fg">2</Text>–<Text color="fg">5</Text> for the
          Playground, OpenCode, Docs and Snake.
        </Text>
        <Text color="subtle">
          Type <Text color="accent">text.help()</Text> in this console for the REPL. Press <Text color="fg">t</Text> to cycle themes ({themes[site.theme].name}).
        </Text>
      </Box>
      <Box className="grow" />
      <Text color="subtle" wrap="nowrap">
        {`▼ Inverted Architecture: frames stream down into DevTools. Theme: ${site.theme} · Preset: ${siteStore.getSnapshot().preset}`}
      </Text>
    </Box>
  );
}
