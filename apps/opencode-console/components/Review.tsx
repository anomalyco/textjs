import { useRef } from "react";
import { Box, ScrollBox, Text, useClipboard, useFocus, useInput, useViewport, type ScrollBoxHandle } from "@textjs/app";
import { useStore } from "../lib/store";
import { useTokens } from "../lib/native-theme";
import { PickerPanel } from "./PickerPanel";
import { TranscriptMarkdown } from "./TranscriptMarkdown";
type Props = { answer: string; title?: string; plain?: boolean; onClose: () => void };
export function Review(props: Props) {
  return (
    <PickerPanel width={88}>
      <Body {...props} />
    </PickerPanel>
  );
}
function Body({ answer, title = "/btw", plain, onClose }: Props) {
  const store = useStore(),
    t = useTokens(),
    rows = Math.max(1, Math.floor(useViewport().rows / 2) - 3),
    scroll = useRef<ScrollBoxHandle>(null),
    { copy } = useClipboard();
  useFocus({ id: "opencode-review", autoFocus: true });
  useInput(
    (e) => {
      if (e.key === "escape" || e.key === "q") onClose();
      else if (e.key === "c") void copy(answer).then((ok) => store.notify(ok ? "Copied to clipboard" : "Clipboard unavailable"));
      else if (e.key === "home") scroll.current?.scrollToTop();
      else if (e.key === "end") scroll.current?.scrollToBottom();
      else if (["up", "down", "j", "k", "pageup", "pagedown"].includes(e.key))
        scroll.current?.scrollBy((e.key.includes("page") ? rows : 1) * (["up", "k", "pageup"].includes(e.key) ? -1 : 1));
      else return;
      e.stopPropagation();
    },
    { priority: 30 },
  );
  return (
    <Box paddingX={3} paddingBottom={1} gap={1} flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{title}</Text>
        <Text color={t.muted}>esc</Text>
      </Box>
      <ScrollBox ref={scroll} height={rows} showScrollbar={false}>
        {plain ? <Text>{answer}</Text> : <TranscriptMarkdown content={answer} expanded />}
      </ScrollBox>
      <Text color={t.muted}>c copy</Text>
    </Box>
  );
}
