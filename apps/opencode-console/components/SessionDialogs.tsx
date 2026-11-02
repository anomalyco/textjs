import { Palette, HelpDialog, type PaletteKind } from "./Palette";
import { KeySettingsDialog } from "./KeySettings";
import { Connections } from "./Connections";
import { Workspaces } from "./Workspaces";
import { SessionTasks } from "./SessionTasks";
import { History } from "./History";
import { Images } from "./Images";
import { DiffReview } from "./DiffReview";
import { useStoreState } from "../lib/store";

/** Loaded on the first dialog, not when the website mounts its console. */
export default function SessionDialogs({
  kind,
  id,
  ids,
  focus,
  focused,
  onKind,
  close,
}: {
  kind: PaletteKind | "help";
  id: string | null;
  ids: string[];
  focused: boolean;
  focus: (v: boolean) => void;
  onKind: (v: PaletteKind) => void;
  close: () => void;
}) {
  const dir = useStoreState((s) => (id && s.sessions.find((p) => p.id === id)?.directory) || s.connection.directory);
  switch (kind) {
    case "help":
      return <HelpDialog onClose={close} />;
    case "diff":
      return <DiffReview id={id ?? undefined} close={close} focused={focused} focus={focus} />;
    case "images":
      return <Images close={close} />;
    case "shells":
    case "children":
      return id ? <SessionTasks id={id} shell={kind === "shells"} close={close} /> : null;
    case "workspaces":
      return <Workspaces id={id} close={close} />;
    case "integrations":
    case "plugins":
    case "mcps":
      return <Connections key={kind} kind={kind} dir={dir} close={close} />;
    case "history":
      return <History id={id ?? undefined} close={close} />;
    case "keys":
      return <KeySettingsDialog ids={ids} close={close} />;
    default:
      return <Palette kind={kind} onKind={onKind} onClose={close} />;
  }
}
