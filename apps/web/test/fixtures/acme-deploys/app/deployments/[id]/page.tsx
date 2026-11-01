import { Text, type PageProps } from "@textjs/app";

export default function DeploymentPage({ params }: PageProps<{ id: string }>) {
  return <Text bold>{params.id}</Text>;
}
