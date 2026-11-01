import type { ReactNode } from "react";
import { Box, Text, useInput, useTheme, type Metadata } from "@textjs/app";
import { notFound, useParams, useRouter } from "@textjs/app/navigation";
import { DEPLOYMENTS, STATUS_COLOR } from "../../../lib/data";

export function generateMetadata({ params }: { params: Record<string, string | string[]> }): Metadata {
  return { title: String(params.id) };
}

export default function DeploymentPage(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const deployment = DEPLOYMENTS.find((d) => d.id === id);
  useInput((e) => {
    if (e.key === "escape") router.back();
  });
  if (!deployment) notFound();
  return (
    <Box className="flex-col gap-1">
      <Box className="flex-row gap-2 h-1">
        <Text bold color={theme.fg}>
          {deployment.id}
        </Text>
        <Text color={STATUS_COLOR[deployment.status]}>{`● ${deployment.status}`}</Text>
      </Box>
      <Text color={theme.muted}>{`${deployment.branch} · ${deployment.commit}`}</Text>
      <Box className="flex-col border rounded px-1" borderColor={theme.border} title=" Build " titleColor={theme.muted}>
        <Text color={theme.subtle}>Running "text build"</Text>
        <Text color={theme.success}>✓ Compiled successfully</Text>
        <Text color={deployment.status === "error" ? theme.danger : theme.success}>{deployment.status === "error" ? "⨯ Failed to compile." : "✓ Generating static console cells"}</Text>
      </Box>
      <Text color={theme.subtle}>Esc back</Text>
    </Box>
  );
}
