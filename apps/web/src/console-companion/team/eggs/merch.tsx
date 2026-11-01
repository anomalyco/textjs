import { useMemo, useState, type ReactNode } from "react";
import { AsciiFont, Box, Image, Text, useInput, useInterval, useTheme } from "@textjs/react";
import { EggFrame, Facts, Pixels, Raster, sprite } from "../ui";

// ── Jay: the Frame Tank ──

const JAY_PALETTE = { h: "#3b2416", H: "#5a3722", s: "#d9a57f", S: "#b9845f", e: "#1e1e1e", b: "#2e1d14", t: "#121212", T: "#242424", w: "#f5f5f5" };
const JAY = [
  ".........hhhhhhhh.........",
  ".......hhHHHHHHHHhh.......",
  "......hhHHhhhhhhHHhh......",
  ".....hhHhhssssssshhHh.....",
  ".....hhhhsssssssssshh.....",
  "....hhhhsseessseesshhh....",
  "....hhhhsssssSsssssshh....",
  "....hhhhssssSSSssssshh....",
  "....hhhhsbbbbbbbbbbshh....",
  "....hhhhsbbbsssbbbbshh....",
  "....hhhhhbbbbbbbbbbhhh....",
  ".....hhhhhbbbbbbbbhhhh....",
  ".....hhhhh..ssss..hhhh....",
  "....hhhhhh.ssssss.hhhhh...",
  "...hhhhhtTt.ssss.tTthhhh..",
  "..sssshhtTtttttttttThhsss.",
  ".sssssstTttttttttttTtssss.",
  ".ssssss.TtttwwwwwttT.ssss.",
  ".sssss..TttttwwwttttT.sss.",
  ".ssss...TtttttwtttttT.sss.",
  ".ssss...TttttttttttttT.ss.",
  "..sss...TtttttttttttT..ss.",
  "..sss...TttttttttttttT.ss.",
  "...ss...TtttttttttttT.....",
];
// "Deal with it" glasses, two pixels high.
const SHADES = ["....eeeeeeeeeeeeeeeeee....", ".....eeewweeeeeeewweee...."];

export function jayPortrait(drop: number | null): Raster {
  const r = sprite(JAY, JAY_PALETTE);
  if (drop !== null) r.stamp(0, drop, SHADES, { e: "#050505", w: "#f5f5f5" });
  return r;
}

export function JayEgg(): ReactNode {
  // Glasses drop from the top to the eyes (row 5), one row per tick.
  const [drop, setDrop] = useState<number | null>(null);
  useInterval(() => setDrop((d) => (d === null ? null : Math.min(5, d + 1))), drop !== null && drop < 5 ? 120 : null);
  useInput((e) => {
    if (e.input !== "d") return;
    e.stopPropagation();
    setDrop((d) => (d === null ? -2 : null));
  });
  const art = useMemo(() => jayPortrait(drop), [drop]);
  const sizes = [
    ["XS", "17 in", "26.5 in", "0 in"],
    ["M", "21 in", "28.5 in", "0 in"],
    ["XL", "25 in", "30.5 in", "0 in"],
  ];
  return (
    <EggFrame crumb="merch / 001" hints={[{ keys: "d", label: "deal with it" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={art} besides={40} />
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-col shrink-0">
            <Text bold>Frame Tank</Text>
            <Text color="muted">Black · Sleeveless</Text>
          </Box>
          <Box className="flex-col shrink-0">
            {[["Size", "Chest", "Length", "Sleeve"], ...sizes].map((row, i) => (
              <Box key={row[0]} className="flex-row h-1 shrink-0">
                {row.map((cell, j) => (
                  <Text key={j} color={i === 0 ? "muted" : j === 3 ? "accent" : "fg"} width={j === 0 ? 6 : 10} wrap="nowrap">
                    {cell}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
          <Facts rows={[["Care", "Anomaly hair mask"]]} />
        </Box>
      </Box>
    </EggFrame>
  );
}

// ── Aiden: the flash sheet ──

interface Flash {
  art: readonly string[];
  caption: string;
  color: string;
}

export const FLASH: readonly Flash[] = [
  { art: ["▄▄▄▄▄▄▄", " ▀███▀ ", "   ▀   "], caption: "TEXT.JS", color: "#e8e8e8" },
  { art: [" ▄███▄ ", " █▀█▀█ ", "  ▀▀▀  "], caption: "TX003", color: "#e8e8e8" },
  { art: [" ▄▄ ▄▄ ", "▐█MOM█▌", "  ▀█▀  "], caption: "FOREVER", color: "#d8392b" },
  { art: ["    ▄█▄", "▄▄▄██▀ ", " ▀█▀█  "], caption: "DINO", color: "#3f9b5c" },
  { art: ["  ┬    ", " ─┼─   ", " ╰┴╯   "], caption: "ANCHOR", color: "#4a86c8" },
  { art: [" ╭───╮ ", " │%c │ ", " ╰───╯ "], caption: "STYLED", color: "#e2b33a" },
  { art: ["  ▲    ", " ███   ", "  █    "], caption: "DAGGER", color: "#d8392b" },
  { art: ["▄▀▀▀▀▄ ", "█⌘⌥J █ ", "▀▄▄▄▄▀ "], caption: "DEVTOOLS", color: "#e2b33a" },
  { art: ["▀▄  ▄▀ ", " ▀██▀  ", "  ▀▀   "], caption: "SWALLOW", color: "#4a86c8" },
];

export function AidenEgg(): ReactNode {
  const theme = useTheme();
  const [count, setCount] = useState(4);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setCount((c) => Math.min(FLASH.length, c + 1));
  });
  const rows = [FLASH.slice(0, 3), FLASH.slice(3, 6), FLASH.slice(6, 9)];
  return (
    <EggFrame crumb="flash sheet" hints={[{ keys: "Space", label: "add flash" }]}>
      <Box className="flex-col grow items-center justify-center gap-1">
        <Box className="flex-col shrink-0 px-2 py-1 gap-1" border borderStyle="rounded" borderColor={theme.border}>
          {rows.map((row, r) => (
            <Box key={r} className="flex-row shrink-0 gap-4">
              {row.map((f, i) => {
                const on = r * 3 + i < count;
                return (
                  <Box key={f.caption} className="flex-col shrink-0 items-center" width={10}>
                    {f.art.map((line, k) => (
                      <Text key={k} color={on ? f.color : theme.border} wrap="nowrap">
                        {on ? line : k === 1 ? "   ·   " : "       "}
                      </Text>
                    ))}
                    <Text color={on ? "muted" : theme.border} wrap="nowrap">
                      {on ? f.caption : ""}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
        <Facts
          rows={[
            ["Style", "Traditional flash"],
            ["Placement", `Full sleeve, ${count} of ${FLASH.length}`],
          ]}
        />
      </Box>
    </EggFrame>
  );
}

// ── Michelle: the Sunday puzzle, solved in pen ──

export const GRID = ["HALO", "AREA", "LENS", "OAST"];
const CLUES = ["1  Halo-___ (dessert)", "5  Region", "6  Camera part", "7  Hop kiln"];

export function MichelleEgg(): ReactNode {
  const theme = useTheme();
  const total = 16;
  const [filled, setFilled] = useState(0);
  useInterval(() => setFilled((n) => n + 1), filled < total ? 180 : null);
  const line = (l: string, m: string, r: string): string => l + Array.from({ length: 4 }, () => "───").join(m) + r;
  return (
    <EggFrame crumb="sunday puzzle">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Box className="flex-col shrink-0">
          <Text color={theme.border}>{line("┌", "┬", "┐")}</Text>
          {GRID.map((word, y) => (
            <Box key={word} className="flex-col shrink-0">
              <Box className="flex-row h-1 shrink-0">
                {word.split("").map((ch, x) => (
                  <Box key={x} className="flex-row shrink-0">
                    <Text color={theme.border}>│</Text>
                    <Text color="#5b8def" bold>{` ${y * 4 + x < filled ? ch : " "} `}</Text>
                  </Box>
                ))}
                <Text color={theme.border}>│</Text>
              </Box>
              <Text color={theme.border}>{y < 3 ? line("├", "┼", "┤") : line("└", "┴", "┘")}</Text>
            </Box>
          ))}
        </Box>
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-col shrink-0">
            <Text bold>Across</Text>
            {CLUES.map((c) => (
              <Text key={c} color="muted">
                {c}
              </Text>
            ))}
          </Box>
          <Box className="flex-col shrink-0">
            <Text bold>Down</Text>
            <Text color="muted">Same as Across</Text>
          </Box>
          <Facts
            rows={[
              ["Solved in", "Pen"],
              ["Hoodie print", "Hand-stenciled"],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}

// ── Juliana: #huli ──

export function JulianaEgg(): ReactNode {
  const theme = useTheme();
  return (
    <EggFrame crumb="#huli">
      <Box className="flex-col grow items-center justify-center gap-1">
        <AsciiFont text="NO GOOFY" font="compact" color={theme.danger} />
        <AsciiFont text="PEOPLE ALLOWED" font="compact" color={theme.danger} />
        <Box className="flex-col shrink-0 px-2" border borderStyle="rounded" borderColor={theme.border} marginTop={1}>
          <Facts
            rows={[
              ["Goofy people", "0 admitted"],
              ["Lululemon", "25% off"],
              ["Money", '"is money even real"'],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}
