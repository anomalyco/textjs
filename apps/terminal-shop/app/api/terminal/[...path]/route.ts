import { getTerminalProxy } from "../../../../server/terminal-proxy";

type Context = { params: Record<string, string | string[]> };

/** `text start`: the same proxy the dev server mounts at `/__terminal`. */
function forward(request: Request, { params }: Context): Promise<Response> {
  const path = params.path;
  const subpath = `/${(Array.isArray(path) ? path : [path ?? ""]).map(encodeURIComponent).join("/")}`;
  return getTerminalProxy().handle(request, subpath);
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
