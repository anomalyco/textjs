import { useEffect, useState, type ReactNode } from "react";
import {
  AsciiFont,
  Box,
  Diff,
  KeyHint,
  Modal,
  ScrollBox,
  Select,
  Spinner,
  Text,
  ThemeProvider,
  useInput,
  type SelectOption,
  type ThemeName,
} from "@textjs/react";
import type { Hint } from "../console-companion/store";
import { CounterDemo } from "../demos/Counter";
import { DashboardDemo } from "../demos/Dashboard";
import { FormDemo } from "../demos/Form";
import { SnakeDemo } from "../demos/Snake";
import { StreamingDemo } from "../demos/Streaming";
import { ChartsPreview, ControlsPreview, KeymapPreview, TablePreview, TreePreview } from "../demos/Kit";
import { FontGalleryPreview } from "../demos/FontGallery";

function LayoutPreview(): ReactNode {
  return (
    <Box className="flex-col grow p-1 gap-1">
      <Box className="flex-row gap-2 p-1 border rounded grow">
        <Box className="flex-col grow basis-0 border rounded px-1 bg-surface">
          <Text bold>Sidebar</Text>
          <Text color="muted">flex-col grow</Text>
          <Text color="subtle">p-1 · gap-2</Text>
        </Box>
        <Box className="flex-col grow basis-0 border rounded px-1 border-accent">
          <Text color="accent">Content</Text>
          <Text className="text-subtle">grow basis-0</Text>
          <Text color="muted">1 unit = 1 cell</Text>
        </Box>
      </Box>
      <Box className="flex-row gap-2">
        <KeyHint keys="0" label="stylesheets" />
        <KeyHint keys="1" label="console.log per frame" />
      </Box>
    </Box>
  );
}

function SpinnerPreview(): ReactNode {
  return (
    <Box className="flex-col gap-1 p-1">
      <Spinner variant="dots" label="Loading session…" />
      <Spinner variant="pulse" label="Streaming frames downward" />
      <Spinner variant="matrix" label="Encoding %c spans" />
      <Spinner variant="line" label="Resolving Yoga layout" />
    </Box>
  );
}

const LOG_LINES = [
  "GET /api/health 200 in 3ms",
  "▼ compiled app/page.tsx in 41ms",
  "GET /sessions/42 200 in 12ms",
  "POST /api/sessions 201 in 18ms",
  "frame #1288 · 1 dirty row · 0.011ms",
  "GET /api/deployments 200 in 9ms",
  "idle · 0 noop logs",
];

function ScrollBoxPreview(): ReactNode {
  const [lines, setLines] = useState<string[]>(() => LOG_LINES.slice(0, 4).map((l, i) => `${String(i + 1).padStart(3, "0")}  ${l}`));
  useEffect(() => {
    let n = lines.length;
    const id = setInterval(() => {
      n++;
      setLines((prev) => [...prev.slice(-200), `${String(n).padStart(3, "0")}  ${LOG_LINES[n % LOG_LINES.length]}`]);
    }, 700);
    return () => clearInterval(id);
  }, []);
  return (
    <Box className="flex-col grow p-1">
      <ScrollBox stickyScroll focusable autoFocus className="border rounded px-1 grow">
        {lines.map((l) => (
          <Text key={l} color={l.includes("▼") ? "accent" : "muted"} wrap="nowrap">
            {l}
          </Text>
        ))}
      </ScrollBox>
      <Box className="flex-row gap-2">
        <KeyHint keys="↑/↓" label="scroll (releases sticky)" />
        <KeyHint keys="G" label="bottom" />
      </Box>
    </Box>
  );
}

const COMMANDS: ReadonlyArray<SelectOption> = [
  { value: "new", label: "New session", hint: "ctrl+n" },
  { value: "theme", label: "Switch theme", hint: "t" },
  { value: "model", label: "Switch model", hint: "ctrl+x" },
  { value: "share", label: "Share session", hint: "s" },
  { value: "exit", label: "Exit", hint: "ctrl+c" },
];

function ModalPreview(): ReactNode {
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState<string | null>(null);
  useInput((e) => {
    if (!open && (e.key === "return" || e.input === "o" || e.key === "space")) {
      e.stopPropagation();
      setOpen(true);
    }
  });
  return (
    <Box className="flex-col grow p-1">
      <Text bold>Dashboard</Text>
      <Text color="muted">Everything behind the modal is dimmed per cell.</Text>
      <Text color="subtle">{last ? `ran: ${last}` : "Press enter to reopen the palette."}</Text>
      <Text color="success">● 3 deployments ready</Text>
      <Text color="warning">● 1 building</Text>
      <Modal open={open} title=" Commands " onClose={() => setOpen(false)} width={44}>
        <Select
          options={COMMANDS}
          searchable
          autoFocus
          onChange={(v) => {
            setLast(String(v));
            setOpen(false);
          }}
        />
      </Modal>
    </Box>
  );
}

const DIFF_BEFORE = `export default function Page() {
  return <div className="hero">Hello</div>;
}
`;
const DIFF_AFTER = `export default function Page() {
  return <Text bold color="accent">Hello</Text>;
}
`;

function DiffPreview(): ReactNode {
  return (
    <Box className="flex-col p-1">
      <Box className="flex-col border rounded" title=" ✎ app/page.tsx " titleColor="muted">
        <Diff patch={{ before: DIFF_BEFORE, after: DIFF_AFTER, filename: "app/page.tsx" }} />
      </Box>
    </Box>
  );
}

function AsciiPreview(): ReactNode {
  return (
    <Box className="flex-col p-1 gap-1">
      <AsciiFont text="▼ TEXT.JS" color="accent" />
      <AsciiFont text="CONSOLE" font="compact" color="muted" />
    </Box>
  );
}

function BidiPreview(): ReactNode {
  return (
    <Box flexDirection="column" padding={1}>
      <Text>שלום עולם! זהו טקסט בעברית.</Text>
      <Text>مرحبا بالعالم! هذا نص عربي.</Text>
      <Text>
        Order #1234 (<Text color="accent">שלום</Text>) total: 25.50 ₪
      </Text>
      <Text>
        user <Text dir="auto" color="success">שלום!</Text> replied 3 times
      </Text>
    </Box>
  );
}

const THEMES: ThemeName[] = ["geistDark", "opencodeDark", "tokyoNight", "amberCrt", "geistLight"];

function ThemePreview(): ReactNode {
  return (
    <Box className="flex-row p-1 gap-1 grow">
      {THEMES.map((t) => (
        <ThemeProvider key={t} theme={t}>
          <ThemedCard name={t} />
        </ThemeProvider>
      ))}
    </Box>
  );
}

function ThemedCard({ name }: { name: string }): ReactNode {
  return (
    <Box className="flex-col grow basis-0 border rounded px-1 bg-bg">
      <Text color="accent" bold wrap="truncate-end">
        {name}
      </Text>
      <Text color="fg">fg</Text>
      <Text color="muted">muted</Text>
      <Text color="success">success</Text>
      <Text color="danger">danger</Text>
    </Box>
  );
}

export interface PreviewSpec {
  cols: number;
  rows: number;
  render: () => ReactNode;
  /** Display name (defaults to the capitalized id). */
  label?: string;
  /** Keys shown in the preview header (Playground demos use their picker hints). */
  hints?: readonly Hint[];
}

export const PREVIEWS: Record<string, PreviewSpec> = {
  counter: { cols: 72, rows: 16, render: () => <CounterDemo />, hints: [{ keys: "↑ ↓", label: "count" }, { keys: "r", label: "reset" }] },
  layout: { cols: 64, rows: 14, render: () => <LayoutPreview /> },
  spinner: { cols: 56, rows: 10, render: () => <SpinnerPreview /> },
  form: { cols: 84, rows: 19, render: () => <FormDemo />, hints: [{ keys: "Tab", label: "next field" }, { keys: "Enter", label: "submit" }] },
  scrollbox: { label: "ScrollBox", cols: 60, rows: 12, render: () => <ScrollBoxPreview /> },
  modal: { cols: 72, rows: 14, render: () => <ModalPreview /> },
  streaming: { cols: 80, rows: 24, render: () => <StreamingDemo /> },
  diff: { cols: 72, rows: 12, render: () => <DiffPreview /> },
  ascii: { label: "AsciiFont", cols: 64, rows: 11, render: () => <AsciiPreview /> },
  fonts: { label: "Font gallery", cols: 100, rows: 19, render: () => <FontGalleryPreview /> },
  theme: { cols: 96, rows: 9, render: () => <ThemePreview /> },
  dashboard: { cols: 100, rows: 26, render: () => <DashboardDemo /> },
  snake: { cols: 96, rows: 24, render: () => <SnakeDemo reserveRows={2} /> },
  table: { cols: 72, rows: 13, render: () => <TablePreview /> },
  tree: { cols: 56, rows: 11, render: () => <TreePreview /> },
  charts: { cols: 72, rows: 14, render: () => <ChartsPreview /> },
  controls: { cols: 72, rows: 14, render: () => <ControlsPreview /> },
  keymap: { cols: 80, rows: 18, render: () => <KeymapPreview /> },
  bidi: { label: "Bidirectional text", cols: 48, rows: 6, render: () => <BidiPreview /> },
};

export function previewLabel(id: string): string {
  return PREVIEWS[id]?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}
