import { getOpencodeProxy } from "../../../../server/opencode-proxy";

type Context = { params: Record<string, string | string[]> };

function forward(request: Request, { params }: Context): Promise<Response> {
  const path = params.path;
  const subpath = `/${(Array.isArray(path) ? path : [path ?? ""]).map(encodeURIComponent).join("/")}`;
  return getOpencodeProxy().handle(request, subpath);
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
