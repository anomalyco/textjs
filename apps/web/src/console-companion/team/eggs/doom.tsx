import { useState, type ReactNode } from "react";
import { AsciiFont, Box, Image, Text, useInterval } from "@textjs/react";
import { EggFrame, Facts, sprite } from "../ui";

// A Doom status-bar face, in a rage.
const RAGE = sprite(
  [
    "......hhhhhhhhhhhh......",
    "....hhhhhhhhhhhhhhhh....",
    "...hhhhhhhhhhhhhhhhhh...",
    "..hhhsssssssssssssshhh..",
    "..hhssssssssssssssssshh.",
    "..hsbbbbbssssssbbbbbsh..",
    "..ssssbbbbssssbbbbsssS..",
    ".Ssseewwesssssewweesss..",
    ".SsseekkessssseekkeessS.",
    ".Sssssssssr..rssssssssS.",
    "..sssssssSSrrSSssssssS..",
    "..sssssssSSSSSSsssssS...",
    "..ssskkkkkkkkkkkkkssS...",
    "..ssskwkwkwkwkwkwkssS...",
    "...sskwkwkwkwkwkwkssS...",
    "...ssskkkkkkkkkkkksS....",
    "....sssssssssssssSS.....",
    ".....SSsssssssssSS......",
    ".......SSSSSSSSSS.......",
  ],
  { h: "#6a4a2a", s: "#c98a5c", S: "#9c6440", b: "#3a2414", e: "#e8e0d0", w: "#f4f0e6", k: "#2a1a10", r: "#a33a2a" },
);

const RED = "#d02a1e";
const PANEL = "#3c3c3c";

function Cell({ label, value, width }: { label: string; value: string; width: number }): ReactNode {
  return (
    <Box className="flex-col shrink-0 items-center" width={width} backgroundColor={PANEL} paddingTop={1}>
      <AsciiFont text={value} font="compact" color={RED} bg={PANEL} />
      <Text color="#b8b8b8" bg={PANEL} bold>
        {label}
      </Text>
    </Box>
  );
}

function DoomEgg({ emoji, line }: { emoji: string; line: readonly [string, string] }): ReactNode {
  return (
    <EggFrame crumb={`:${emoji}:`}>
      <Box className="flex-col grow items-center justify-center gap-1">
        <Box className="flex-row shrink-0 gap-1">
          <Cell label="AMMO" value="50" width={12} />
          <Cell label="HEALTH" value="100" width={16} />
          <Box className="flex-col shrink-0 items-center" backgroundColor={PANEL} paddingX={1}>
            <Image pixels={RAGE} />
          </Box>
          <Cell label="ARMOR" value="0" width={12} />
        </Box>
        <Facts rows={[line]} />
      </Box>
    </EggFrame>
  );
}

/** "21:04" in `zone`. */
export function clock(zone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(now);
}

function useClock(zone: string): string {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 15_000);
  return clock(zone, now);
}

export function AaravEgg(): ReactNode {
  const time = useClock("Asia/Kolkata");
  return <DoomEgg emoji="aarav_style_doom_rage_avatar" line={["Local time", `${time} IST`]} />;
}

export function KamilEgg(): ReactNode {
  const time = useClock("Europe/Warsaw");
  return <DoomEgg emoji="kamil_style_doom_rage_avatar" line={["Local time", `${time} in Warsaw`]} />;
}

export function WalterEgg(): ReactNode {
  return <DoomEgg emoji="walter_style_doom_rage" line={["Route to Costa Rica", "HKG → CDG → SJO"]} />;
}
