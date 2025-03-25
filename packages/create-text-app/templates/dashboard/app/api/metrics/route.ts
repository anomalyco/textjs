export function GET(): Response {
  return Response.json({ cpu: Math.random(), memory: Math.random(), at: new Date().toISOString() });
}
