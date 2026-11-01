/**
 * Team-only console views. Loaded only after `team-gate.ts` matched a hashed
 * `page:name`, so none of this (names included) is in the main bundle.
 */

import type { ComponentType, ReactNode } from "react";
import { useInput } from "@textjs/react";
import { siteStore } from "../store";
import { AlanEgg } from "./eggs/alan";
import { AidenEgg, JayEgg, JulianaEgg, MichelleEgg } from "./eggs/merch";
import { BaileyEgg } from "./eggs/bailey";
import { BobEgg } from "./eggs/bob";
import { BrendanEgg } from "./eggs/brendan";
import { DanEgg } from "./eggs/dan";
import { DanielEgg } from "./eggs/daniel";
import { DavidEgg } from "./eggs/david";
import { DaxEgg } from "./eggs/dax";
import { AaravEgg, KamilEgg, WalterEgg } from "./eggs/doom";
import { FilipEgg } from "./eggs/filip";
import { FrankEgg } from "./eggs/frank";
import { JackEgg } from "./eggs/jack";
import { JamesEgg } from "./eggs/james";
import { JamieEgg } from "./eggs/jamie";
import { KitEgg } from "./eggs/kit";
import { LudvigEgg } from "./eggs/ludvig";
import { LukeEgg } from "./eggs/luke";
import { RyanEgg } from "./eggs/ryan";
import { SebastianEgg } from "./eggs/sebastian";
import { SimonEgg } from "./eggs/simon";
import { StefanEgg } from "./eggs/stefan";
import { TasEgg } from "./eggs/tas";
import { VictorEgg } from "./eggs/victor";

export interface TeamEggSpec {
  id: string;
  person: string;
  /** `gatePath()` of the page it lives on. */
  path: string;
  /** Lowercase names that open it. */
  names: readonly string[];
  View: ComponentType<{ word: string }>;
}

export const TEAM_EGGS: readonly TeamEggSpec[] = [
  { id: "dax", person: "dax", path: "/", names: ["dax"], View: DaxEgg },
  { id: "stefan", person: "Stefan Avram", path: "/enterprise", names: ["stefan"], View: StefanEgg },
  { id: "tas", person: "Tas", path: "/enterprise", names: ["tas"], View: TasEgg },
  { id: "jay", person: "Jay", path: "/merch", names: ["jay", "jayair"], View: JayEgg },
  { id: "aiden", person: "Aiden Cline", path: "/merch", names: ["aiden", "alden"], View: AidenEgg },
  { id: "michelle", person: "Michelle Bakels", path: "/merch", names: ["michelle"], View: MichelleEgg },
  { id: "juliana", person: "Juliana Ardila", path: "/merch", names: ["juliana", "huli"], View: JulianaEgg },
  { id: "daniel", person: "Daniel Chen", path: "/status", names: ["daniel"], View: DanielEgg },
  { id: "filip", person: "Filip Hejmowski", path: "/changelog", names: ["filip"], View: FilipEgg },
  { id: "bob", person: "Bob", path: "/blog", names: ["bob"], View: BobEgg },
  { id: "alan", person: "Alan Rice", path: "/learn", names: ["alan", "bigal"], View: AlanEgg },
  { id: "kit", person: "Kit Langton", path: "/playground", names: ["kit"], View: KitEgg },
  { id: "frank", person: "Frank Wang", path: "/playground", names: ["frank"], View: FrankEgg },
  { id: "david", person: "David Hill", path: "/docs/styling", names: ["david"], View: DavidEgg },
  { id: "sebastian", person: "Sebastian", path: "/docs/terminal", names: ["sebastian", "kommander"], View: SebastianEgg },
  { id: "ryan", person: "Ryan Vogel", path: "/docs/devtools-extension", names: ["ryan", "vogel"], View: RyanEgg },
  { id: "bailey", person: "bailey", path: "/docs/support-policy", names: ["bailey"], View: BaileyEgg },
  { id: "victor", person: "Victor Navarro", path: "/docs/internationalization", names: ["victor", "vimtor"], View: VictorEgg },
  { id: "luke", person: 'Luke "Hona" Parker', path: "/docs/turbolog-engine", names: ["hona", "luke"], View: LukeEgg },
  { id: "brendan", person: "Brendan Allan", path: "/docs/keyboard", names: ["brendan"], View: BrendanEgg },
  { id: "james", person: "James Long", path: "/docs/components-content", names: ["james", "jlongster"], View: JamesEgg },
  { id: "dan", person: "dan", path: "/docs/components-charts", names: ["dan"], View: DanEgg },
  { id: "jamie", person: "jamie", path: "/docs/fonts", names: ["jamie"], View: JamieEgg },
  { id: "simon", person: "Simon", path: "/docs/hooks-and-repl", names: ["simon"], View: SimonEgg },
  { id: "jack", person: "Jack", path: "/docs/caching", names: ["jack"], View: JackEgg },
  { id: "ludvig", person: "Ludvig", path: "/docs/components-forms", names: ["ludvig"], View: LudvigEgg },
  { id: "aarav", person: "Aarav Sareen", path: "/docs/components-layout", names: ["aarav"], View: AaravEgg },
  { id: "kamil", person: "kamil", path: "/docs/components-interactive", names: ["kamil"], View: KamilEgg },
  { id: "walter", person: "Walter", path: "/docs/middleware", names: ["walter"], View: WalterEgg },
];

let openedWith = "";

/** The egg for `word` on `path`, or `null`. Remembers the word (Alan has two). */
export async function prepare(path: string, word: string): Promise<string | null> {
  const egg = TEAM_EGGS.find((e) => e.path === path && e.names.includes(word));
  if (!egg) return null;
  openedWith = word;
  return egg.id;
}

/** Shows an egg until Esc. */
export function TeamEgg({ id }: { id: string }): ReactNode {
  useInput(
    (e) => {
      if (e.key !== "escape") return;
      e.stopPropagation();
      siteStore.set({ teamEgg: null });
    },
    { priority: 50 },
  );
  const egg = TEAM_EGGS.find((e) => e.id === id);
  return egg ? <egg.View key={id} word={openedWith} /> : null;
}
