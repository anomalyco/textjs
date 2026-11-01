import { useEffect, useRef, useState } from "react";
import { Box, Text, ScrollBox, useInput, useFocus, useClipboard, useViewport, type ScrollBoxHandle } from "@textjs/app";
import { useStore } from "../lib/store";
import { useTokens } from "../lib/native-theme";
import type { FilePatch } from "../lib/types";
import { PickerPanel } from "./PickerPanel";
import { PatchLines } from "./PatchLines";
import { TranscriptMarkdown } from "./TranscriptMarkdown";

export function Review(props: { answer?: string; id?: string; onClose: () => void }) {
  return (
    <PickerPanel width={88}>
      <Body {...props} />
    </PickerPanel>
  );
}
function Body({ answer, id, onClose }: { answer?: string; id?: string; onClose: () => void }) {
  const store = useStore(),
    t = useTokens(),
    vp = useViewport(),
    scroll = useRef<ScrollBoxHandle>(null),
    { copy } = useClipboard();
  const [files, setFiles] = useState<FilePatch[]>(),
    [index, select] = useState(0),
    [error, fail] = useState("");
  const { directory } = store.getSnapshot().connection;
  const dir = (id && store.session(id)?.directory) || directory;
  useEffect(() => {
    if (answer !== undefined) return;
    let live = true;
    if (!store.api?.diff) fail("Diff unavailable on this server");
    else
      void store.api.diff(id, dir).then(
        (v) => {
          if (live) setFiles(v);
        },
        (e) => {
          if (live) fail(String(e));
        },
      );
    return () => {
      live = false;
    };
  }, [answer, id, dir, store]);
  useFocus({ id: "opencode-review", autoFocus: true });
  const size = Math.max(1, Math.floor(vp.rows / 2) - 3),
    file = files?.[index];
  useInput(
    (e) => {
      if (e.key === "escape" || e.key === "q") onClose();
      else if (e.key === "c" && answer !== undefined)
        void copy(answer).then((ok) => store.notify(ok ? "Copied to clipboard" : "Clipboard unavailable"));
      else if (!answer && files?.length && (e.key === "n" || e.key === "p" || (e.alt && ["up", "down"].includes(e.key)))) {
        select(Math.max(0, Math.min(files.length - 1, index + (["p", "up"].includes(e.key) ? -1 : 1))));
        scroll.current?.scrollToTop();
      } else if (e.key === "home") scroll.current?.scrollToTop();
      else if (e.key === "end" || (e.shift && e.key.toLowerCase() === "g")) scroll.current?.scrollToBottom();
      else if (e.key === "pageup" || (e.ctrl && e.key === "b")) scroll.current?.scrollBy(-size);
      else if (e.key === "pagedown" || (e.ctrl && e.key === "f")) scroll.current?.scrollBy(size);
      else if (e.ctrl && ["u", "d"].includes(e.key)) scroll.current?.scrollBy((e.key === "u" ? -1 : 1) * Math.ceil(size / 2));
      else if (["j", "k", "up", "down"].includes(e.key)) scroll.current?.scrollBy(["up", "k"].includes(e.key) ? -1 : 1);
      else return;
      e.stopPropagation();
    },
    { priority: 30 },
  );
  return (
    <Box flexDirection="column" paddingX={3} paddingBottom={1} gap={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{answer !== undefined ? "/btw" : "Diff"}</Text>
        <Text color={t.muted}>esc</Text>
      </Box>
      {file && (
        <Text>
          {file.file} <Text color={t.success}>+{file.additions}</Text> <Text color={t.error}>-{file.deletions}</Text>
        </Text>
      )}
      <ScrollBox ref={scroll} height={size} showScrollbar={false}>
        {answer !== undefined ? (
          <TranscriptMarkdown content={answer} expanded />
        ) : file ? (
          <PatchLines file={file.file} patch={file.patch} limit={2000} />
        ) : (
          <Text color={t.muted}>{error || (files ? "No changes" : "Loading…")}</Text>
        )}
      </ScrollBox>
      <Text color={t.muted}>
        {answer !== undefined ? "c copy" : `p previous file  n next file${files?.length ? `  ${index + 1}/${files.length}` : ""}`}
      </Text>
    </Box>
  );
}
