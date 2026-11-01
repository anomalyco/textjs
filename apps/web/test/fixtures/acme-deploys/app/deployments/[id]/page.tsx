import { Text, type PageProps } from "@textjs/next";

export default function DeploymentPage({ params }: PageProps<{ id: string }>) {
  return <Text bold>{params.id}</Text>;
}
