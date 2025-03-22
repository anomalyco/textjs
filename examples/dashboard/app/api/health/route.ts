export function GET(): Response {
  return Response.json({ status: "ok", engine: "Turbolog", region: "iad1", time: new Date().toISOString() });
}
