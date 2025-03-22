import { DEPLOYMENTS } from "../../../lib/data";

export function GET(request: Request): Response {
  const status = new URL(request.url).searchParams.get("status");
  const list = status ? DEPLOYMENTS.filter((d) => d.status === status) : DEPLOYMENTS;
  return Response.json({ deployments: list, total: list.length });
}
