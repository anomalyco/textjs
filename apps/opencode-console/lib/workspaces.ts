import type { Transport } from "./client";
export interface WorkspaceApi {
  projects: () => Promise<{ id: string; canonical: string; name?: string }[]>;
  location: (directory?: string) => Promise<{ directory: string; project: { id: string; directory: string } }>;
  list: (projectID: string) => Promise<{ directory: string; strategy: string }[]>;
  create: (projectID: string, from: string, name: string) => Promise<{ directory: string }>;
  remove: (projectID: string, directory: string) => Promise<void>;
  refresh: (projectID: string) => Promise<void>;
  move: (id: string, directory: string) => Promise<void>;
}
export function workspaceApi(t: Transport): WorkspaceApi {
  return {
    async projects() {
      const res = await t.json<{ id: string; canonical: string; name?: string }[]>("GET", "/api/project");
      return res.map(({ id, canonical, name }) => ({ id, canonical, name }));
    },
    location: (d) => t.json("GET", "/api/location" + (d ? `?${new URLSearchParams({ "location[directory]": d })}` : "")),
    list: (projectID) => t.json("GET", `/api/worktree?${new URLSearchParams({ projectID })}`),
    create: (projectID, from, name) => t.json("POST", "/api/worktree", { projectID, from, name }),
    remove: (projectID, directory) => t.json("DELETE", "/api/worktree", { projectID, directory, force: false }),
    refresh: (projectID) => t.json("POST", "/api/worktree/refresh", { projectID }),
    move: (id, directory) => t.json("POST", `/api/session/${encodeURIComponent(id)}/move`, { directory }),
  };
}
/** Resolve only a server-relative pathname; never use the page URL or the browser user's home. */
export function directoryPath(base: string, path: string) {
  if (/^[a-z]+:|\0/i.test(path)) throw Error("Expected a directory path");
  if (path.startsWith("~") && !base.startsWith("~/")) throw Error("Use an absolute server path");
  const root = path.startsWith("/") ? "/" : base.startsWith("~") ? "~/" : "/";
  const bits = (path.startsWith("/") || path.startsWith("~") ? path : base + "/" + path).replace(/^~\/?/, "").split("/");
  const out: string[] = [];
  for (const bit of bits) {
    if (bit === "..") out.pop();
    else if (bit && bit !== ".") out.push(bit);
  }
  return root + out.join("/");
}
