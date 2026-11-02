import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startProxy, type StartedBridge } from "../../../packages/opencode/src/proxy";
import { bridgeToken, discoverServer, pairBridge, PairingRequired, rememberBridgeToken } from "../src/demos/opencode/live";

const storage = new Map<string, string>();
const hadStorage = "localStorage" in globalThis;
let upstream: ReturnType<typeof Bun.serve>;
let bridge: StartedBridge;

beforeAll(async () => {
  if (!hadStorage) {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    };
  }
  upstream = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => Response.json({ version: "2.0.0-mock" }) });
  bridge = await startProxy({ port: 0, log: false, pairingCode: "K7F2QM", discover: async () => ({ url: `http://127.0.0.1:${upstream.port}`, source: "flag" }) });
});

afterAll(async () => {
  await bridge.close();
  upstream.stop(true);
  if (!hadStorage) delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("/opencode and the bridge's pairing code", () => {
  test("a bridge asks for its code before anything else", async () => {
    const err = await discoverServer(bridge.url).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PairingRequired);
    expect((err as PairingRequired).apiBase).toBe(bridge.url);
  });

  test("a wrong code says so; the right one pairs and connects", async () => {
    await expect(pairBridge(bridge.url, "AAA-BBB")).rejects.toThrow("Wrong code");
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

  test("only loopback servers, which the site's CSP allows", async () => {
    for (const url of ["http://192.168.1.10:4096", "https://opencode.example.com", "http://127.0.0.1.nip.io:4096"]) {
      await expect(discoverServer(url)).rejects.toThrow("Connect to the bridge on this computer");
    }
  });
});
