import { useState } from "react";
import { Box, Text, Image, useFocus, useInput, useViewport } from "@textjs/app";
import { useStore } from "../lib/store";
import { PickerPanel } from "./PickerPanel";
export function Images({ close }: { close: () => void }) {
  return (
    <PickerPanel width={88}>
      <Body close={close} />
    </PickerPanel>
  );
}
function Body({ close }: { close: () => void }) {
  useFocus({ id: "opencode-images", autoFocus: true });
  const store = useStore(),
    vp = useViewport(),
    [i, select] = useState(0);
  const files = store.promptImages,
    part = files[i];
  useInput(
    (e) => {
      if (e.key === "escape" || e.key === "q") close();
      else if (files.length && ["left", "right"].includes(e.key))
        select((i + (e.key === "left" ? -1 : 1) + files.length) % files.length);
      else return;
      e.stopPropagation();
    },
    { priority: 31 },
  );
  return (
    <Box paddingX={3} paddingBottom={1} gap={1} flexDirection="column">
      <Text bold>Image attachments</Text>
      {part?.kind === "file" && /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(part.uri) ? (
        <>
          <Text>
            {i + 1}/{files.length} {part.name}
          </Text>
          <Image
            key={i}
            src={part.uri}
            width={Math.min(78, vp.cols - 10)}
            height={Math.max(2, Math.floor(vp.rows / 2) - 5)}
            alt={part.name}
          />
        </>
      ) : (
        <Text>No image attachments</Text>
      )}
      <Text>←/→ select esc close</Text>
    </Box>
  );
}
