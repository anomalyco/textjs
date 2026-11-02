import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PAIRING_LOCKED as BRIDGE_LOCKED, PAIRING_PROMPT as BRIDGE_PROMPT, startProxy, type StartedBridge } from "../../../packages/opencode/src/proxy";
import { BRIDGE_COMMAND, bridgeToken, discoverServer, OUTDATED_BRIDGE, pairBridge, PAIRING_LOCKED, PAIRING_PROMPT, PairingRequired, rememberBridgeToken, WrongCode } from "../src/demos/opencode/live";

const storage = new Map<string, string>();
const g = globalThis as { localStorage?: unknown };
const previousStorage = Object.getOwnPropertyDescriptor(g, "localStorage");
let upstream: ReturnType<typeof Bun.serve>;
let bridge: StartedBridge;

beforeAll(async () => {
  // Other suites install their own storage; this one needs a working one.
  Object.defineProperty(g, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
  });
  upstream = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => Response.json({ version: "2.0.0-mock" }) });
  bridge = await startProxy({ port: 0, log: false, pairingCode: "K7F2QM", discover: async () => ({ url: `http://127.0.0.1:${upstream.port}`, source: "flag" }) });
});

afterAll(async () => {
  await bridge.close();
  upstream.stop(true);
  if (previousStorage) Object.defineProperty(g, "localStorage", previousStorage);
  else delete g.localStorage;
});

describe("/opencode and the bridge's pairing code", () => {
  test("a bridge asks for its code before anything else", async () => {
    const err = await discoverServer(bridge.url).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PairingRequired);
    expect((err as PairingRequired).apiBase).toBe(bridge.url);
  });

  test("the page and the bridge use the same words", () => {
    expect(PAIRING_PROMPT).toBe(BRIDGE_PROMPT);
    expect(PAIRING_LOCKED).toBe(BRIDGE_LOCKED);
    expect(BRIDGE_COMMAND).toBe("bunx @textjs/opencode@latest proxy");
    expect(new WrongCode(1).message).toBe("Wrong code. 1 try left.");
    expect(new WrongCode(9).message).toBe("Wrong code. 9 tries left.");
  });

  test("connecting and pairing make no request the browser would log as failed", async () => {
    const statuses: number[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await real(input, init);
      statuses.push(res.status);
      return res;
    }) as typeof fetch;
    try {
      const other = await startProxy({ port: 0, log: false, pairingCode: "K7F2QM", discover: async () => ({ url: `http://127.0.0.1:${upstream.port}`, source: "flag" }) });
      try {
        await expect(discoverServer(other.url)).rejects.toBeInstanceOf(PairingRequired);
        await expect(pairBridge(other.url, "AAAAAA")).rejects.toBeInstanceOf(WrongCode);
        const token = await pairBridge(other.url, "k7f2qm");
        expect(await discoverServer(other.url, 3000, token)).toMatchObject({ bridge: true, token });
      } finally {
        await other.close();
      }
    } finally {
      globalThis.fetch = real;
    }
    expect(statuses.every((s) => s >= 200 && s < 300)).toBe(true);
  });

  test("a wrong code says how many tries are left; the right one pairs and connects", async () => {
    await expect(pairBridge(bridge.url, "AAA-BBB")).rejects.toThrow("Wrong code. 9 tries left.");
    expect(bridgeToken(bridge.url)).toBeNull();
    const token = await pairBridge(bridge.url, "k7f-2qm");
    expect(bridgeToken(bridge.url)).toBe(token);
    expect(await discoverServer(bridge.url)).toEqual({ apiBase: bridge.url, protocol: "v2", bridge: true, version: "2.0.0-mock", token });
  });

  test("a token from an earlier bridge run is dropped and the code asked again", async () => {
    rememberBridgeToken(bridge.url, "from-a-previous-run");
    await expect(discoverServer(bridge.url)).rejects.toBeInstanceOf(PairingRequired);
    expect(bridgeToken(bridge.url)).toBeNull();
  });

  test("a bridge from before pairing (1.0.x) is refused with how to update", async () => {
    // What @textjs/opencode 1.0.4 answers: it forwards with the daemon password and no code.
    const old = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => Response.json({ version: "2.0.0-mock" }, { headers: { "x-textjs-bridge": "1", "access-control-expose-headers": "x-textjs-bridge" } }),
    });
    try {
      await expect(discoverServer(`http://127.0.0.1:${old.port}`)).rejects.toThrow(OUTDATED_BRIDGE);
    } finally {
      old.stop(true);
    }
    // The page shows the copyable bridge command right below it.
    expect(OUTDATED_BRIDGE).toBe("This bridge is out of date. Stop it and run:");
  });

  test("a direct OpenCode server still connects without pairing", async () => {
    const direct = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => Response.json({ version: "2.0.0-direct" }) });
    try {
      expect(await discoverServer(`http://127.0.0.1:${direct.port}`)).toEqual({ apiBase: `http://127.0.0.1:${direct.port}`, protocol: "v2", bridge: false, version: "2.0.0-direct", token: undefined });
    } finally {
      direct.stop(true);
    }
  });

  test("with storage off or full, the token from pairing still connects", async () => {
    const working = g.localStorage;
    g.localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    try {
      const token = await pairBridge(bridge.url, "K7F2QM");
      expect(bridgeToken(bridge.url)).toBeNull();
      expect(await discoverServer(bridge.url, 3000, token)).toMatchObject({ bridge: true, token });
    } finally {
      g.localStorage = working;
    }
  });

  test("only loopback servers, which the site's CSP allows", async () => {
    for (const url of ["http://192.168.1.10:4096", "https://opencode.example.com", "http://127.0.0.1.nip.io:4096"]) {
      await expect(discoverServer(url)).rejects.toThrow("Connect to the bridge on this computer");
    }
  });
});
