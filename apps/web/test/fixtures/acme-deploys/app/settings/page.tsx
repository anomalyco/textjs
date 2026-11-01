import { Box, Text } from "@textjs/app";

export default function SettingsPage() {
  return (
    <Box className="flex-col gap-1">
      <Text bold>Settings</Text>
      <Text color="muted">Team: Acme · Region: iad1 · Plan: Console</Text>
    </Box>
  );
}
