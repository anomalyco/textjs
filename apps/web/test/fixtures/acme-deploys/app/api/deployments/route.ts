import { DEPLOYMENTS, createDeployment } from "../../../lib/deployments";

export function GET(): Response {
  return Response.json(DEPLOYMENTS);
}

export async function POST(req: Request): Promise<Response> {
  const deployment = createDeployment(await req.json());
  return Response.json(deployment, { status: 201 });
}
