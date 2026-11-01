import { expect, test } from "bun:test";
import { createDemoClient } from "../lib/demo";
import { OpenCodeStore, pendingPermissions } from "../lib/store";
import type { PermissionRequest } from "../lib/types";

test("a stale permission list cannot resurrect a replied request or drop a new child request", async () => {
  const client = createDemoClient();
  const root = "ses_root",
    child = "ses_child";
  const first: PermissionRequest = { id: "per_1", sessionID: child, action: "read", resources: ["a.ts"] };
  client.children = async () => [{ id: child, parentID: root, time: { created: 0, updated: 0 } }];
  let release!: (r: PermissionRequest[]) => void;
  let loading!: () => void;
  const started = new Promise<void>((r) => {
    loading = r;
  });
  client.permissions = (sid) =>
    sid === child
      ? new Promise((r) => {
          release = r;
          loading();
        })
      : Promise.resolve([]);
  const s = new OpenCodeStore({ client });
  try {
    await s.connect();
    const read = s.syncRequests(root);
    await started;
    s.handle({ type: "permission.replied", sessionID: child, requestID: first.id });
    s.handle({ type: "permission.asked", request: { ...first, id: "per_2" } });
    release([first]);
    await read;
    expect(pendingPermissions(s.getSnapshot(), root).map((p) => p.id)).toEqual(["per_2"]);
  } finally {
    s.dispose();
  }
});
