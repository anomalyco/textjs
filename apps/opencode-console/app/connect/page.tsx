import { useState, type ReactNode } from "react";
import { Box, Input, KeyHint, Spinner, Text, useInput, useTheme, type Metadata } from "textjs";
import { useRouter } from "textjs/navigation";
import { savedEndpoint } from "../../lib/client";
import { useStore, useStoreState } from "../../lib/store";

export const metadata: Metadata = { title: "Connect" };

export default function ConnectPage(): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const connection = useStoreState((s) => s.connection);
  const [value, setValue] = useState(() => savedEndpoint() ?? "");
  const [pending, setPending] = useState(false);

  useInput((e) => {
    if (e.key === "escape") {
      e.stopPropagation();
      router.back();
    }
  });

  const connect = (raw: string): void => {
    const endpoint = raw.trim() === "" ? null : raw.trim();
    setPending(true);
    void store.connect(endpoint, true).then((c) => {
      setPending(false);
      if (c.kind !== "demo" || endpoint === "demo") router.push("/");
    });
  };

  const status =
    connection.status === "connecting"
      ? null
      : connection.kind === "demo"
        ? { color: theme.warning, text: `◆ demo${connection.reason ? ` — ${connection.reason}` : ""}` }
        : { color: theme.success, text: `● ${connection.kind} · ${connection.label} · ${connection.mode}${connection.version ? ` · opencode ${connection.version}` : ""}` };

  return (
    <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" paddingX={4}>
      <Box flexDirection="column" width={72} maxWidth="100%" border="rounded" borderColor={theme.borderFocus} bg={theme.panel} paddingX={2} paddingY={1} gap={1} title=" Connect to OpenCode " titleColor={theme.fg}>
        <Text color={theme.muted} wrap="wrap">
          Leave empty to auto-discover the local daemon (`opencode service status`). Enter a URL such as http://localhost:4096 for a V2 or V1 server, or type demo for the offline simulator.
        </Text>
        <Box flexDirection="row" border="single" borderColor={theme.border} paddingX={1}>
          <Text color={theme.accent} wrap="nowrap">
            {"url "}
          </Text>
          <Input value={value} onChange={setValue} onSubmit={connect} focused placeholder="auto-discover" />
        </Box>
        <Box height={1} flexDirection="row">
          {pending || connection.status === "connecting" ? <Spinner variant="dots" label="connecting…" /> : status ? <Text color={status.color} wrap="truncate-end">{status.text}</Text> : null}
        </Box>
        <Box flexDirection="row" gap={2}>
          <KeyHint keys="enter" label="connect" />
          <KeyHint keys="esc" label="back" />
        </Box>
      </Box>
    </Box>
  );
}
