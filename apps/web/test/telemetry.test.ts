import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { allow, dataPoint, handleReport, resetLimits, type AnalyticsEngineDataset } from "../server/reports";
import { claimReload, isChunkLoadError, RELOAD_KEY, RELOAD_WINDOW_MS } from "../src/telemetry/capture";
import { createSink, ReportQueue, routeOf, toReport, type ReportContext } from "../src/telemetry/reporter";
import { browserOf, fingerprint, printable, MAX_BODY_BYTES, MAX_REPORTS_PER_PAGE, ownFrames, scrub, validateReport, viewportBucket, type Report } from "../src/telemetry/shared";

const ORIGIN = "https://textjs.org";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.59 Safari/537.36";

const ctx = (over: Partial<ReportContext> = {}): ReportContext => ({ origin: ORIGIN, pathname: "/docs/routing", release: "042604f", userAgent: CHROME, width: 1280, ...over });

function report(over: Partial<Report> = {}): Report {
  return {
    v: 1,
    kind: "error",
    message: "TypeError: x is not a function",
    stack: ["Ab (/assets/Docs-AbC12_-9.js:1:234)"],
    route: "/docs/routing",
    release: "042604f",
    browser: "Chrome 142",
    os: "macOS",
    viewport: "md",
    code: "",
    ...over,
  };
}

function v8Error(message: string, frames: string[]): Error {
  const e = new TypeError(message);
  e.stack = [`TypeError: ${message}`, ...frames.map((f) => `    at ${f}`)].join("\n");
  return e;
}

describe("payload validation", () => {
  test("accepts a well-formed report and returns it unchanged", () => {
    expect(validateReport(report())).toEqual(report());
  });

  test("rejects malformed payloads", () => {
    const bad: unknown[] = [
      null,
      "string",
      [],
      { ...report(), v: 2 },
      { ...report(), kind: "warning" },
      { ...report(), viewport: "1280x800" },
      { ...report(), message: "" },
      { ...report(), message: 42 },
      { ...report(), route: "docs" },
      { ...report(), route: "/docs\nrouting" },
      { ...report(), release: "a b" },
      { ...report(), browser: "Mozilla/5.0 (Macintosh)" },
      { ...report(), code: "E123" },
      { ...report(), stack: "at x" },
      { ...report(), stack: [1] },
      { ...report(), stack: Array.from({ length: 21 }, () => "f (/a.js:1:1)") },
      { ...report(), message: "x".repeat(1001) },
    ];
    for (const b of bad) expect(validateReport(b)).toBeNull();
  });

  test("clips long fields and keeps at most 10 frames", () => {
    const r = validateReport({ ...report(), message: "m".repeat(900), stack: Array.from({ length: 15 }, (_, i) => `f${i} (/assets/a.js:1:${i})`) });
    expect(r?.message.length).toBe(500);
    expect(r?.stack.length).toBe(10);
  });

  test("structured fields between max and twice max are clipped, not rejected", () => {
    const r = validateReport({ ...report(), route: `/docs/${"a".repeat(150)}`, browser: `Chrome ${"1".repeat(40)}` });
    expect(r?.route.length).toBe(120);
    expect(r?.browser.length).toBe(32);
    expect(validateReport({ ...report(), route: `/${"a".repeat(300)}` })).toBeNull();
  });

  test("control characters are removed from the message and stack", () => {
    const r = validateReport({ ...report(), message: "boom\u001b[2J\r\nnext\u0085line\u2028x", stack: ["f\u0007 (/assets/a.js:1:2)"] });
    expect(r?.message).toBe("boom [2J next line x");
    expect(r?.stack).toEqual(["f  (/assets/a.js:1:2)"]);
  });

  test("re-scrubs on the server: a client can't store emails or query strings", () => {
    const r = validateReport({ ...report(), message: "failed for jane@example.com at https://textjs.org/coffee?token=abc#x", stack: ["f (https://textjs.org/assets/a.js?v=1:1:2)"] });
    expect(r?.message).toBe("failed for <email> at https://textjs.org/coffee");
    expect(JSON.stringify(r)).not.toContain("jane");
    expect(JSON.stringify(r)).not.toContain("token=");
  });
});

describe("PII stripping", () => {
  test("scrub removes query strings, fragments, emails, long numbers and tokens", () => {
    expect(scrub("GET https://api.terminal.shop/card?id=crd_1&x=2 failed")).toBe("GET https://api.terminal.shop/card failed");
    expect(scrub("see https://textjs.org/docs#routing")).toBe("see https://textjs.org/docs");
    expect(scrub("user a.b+c@mail.example.co.uk")).toBe("user <email>");
    expect(scrub("card 4242 4242 4242 4242 declined")).toBe("card <number> declined");
    expect(scrub("session 9f8e7d6c5b4a39281706f5e4d3c2b1a0 expired")).toBe("session <token> expired");
    // Long identifiers without digits are code, not secrets.
    expect(scrub("useSyncExternalStoreWithSelector is not a function")).toBe("useSyncExternalStoreWithSelector is not a function");
    expect(scrub("Text.js error TX004: <Box> cannot be nested inside <Text>. https://textjs.org/errors/TX004")).toBe("Text.js error TX004: <Box> cannot be nested inside <Text>. https://textjs.org/errors/TX004");
  });

  test("scrub stays linear on adversarial input (8 KB in under 5 ms)", () => {
    const N = 8 * 1024;
    const inputs = ["/", "/a", "a/b?", "a", "a-", "a.", "a@", "a.a@", "1 ", "1.", "a:", "ab:", "?a", "a://", "x/", "@/", "%"].map((u) => u.repeat(Math.ceil(N / u.length)).slice(0, N));
    inputs.push(`${"a".repeat(N - 1)}1`, `https://x/${"/".repeat(N)}`, `${"a".repeat(60)}@${"b.".repeat(N / 2)}`);
    scrub("warm up");
    for (const input of inputs) {
      const t = performance.now();
      scrub(input);
      const ms = performance.now() - t;
      if (ms >= 5) throw new Error(`scrub took ${ms.toFixed(1)} ms on ${JSON.stringify(input.slice(0, 12))}…`);
    }
  });

  test("a worst-case 8 KB report validates in under 5 ms", () => {
    for (const unit of ["/", "a", "a-", "a@", "a.", "/a"]) {
      const message = unit.repeat(1000).slice(0, 1000);
      const stack = Array.from({ length: 10 }, () => unit.repeat(400).slice(0, 400));
      const body = JSON.stringify({ ...report(), message, stack });
      expect(body.length).toBeLessThanOrEqual(MAX_BODY_BYTES);
      const t = performance.now();
      const r = validateReport(JSON.parse(body));
      if (r) fingerprint(r);
      const ms = performance.now() - t;
      if (ms >= 5) throw new Error(`validateReport took ${ms.toFixed(1)} ms for ${JSON.stringify(unit)}`);
    }
  });

  test("scrub keeps absolute and relative URLs and strips only their queries and fragments", () => {
    expect(scrub("at https://textjs.org/docs/routing?x=1#y and http://a.b:8080/p/q?z")).toBe("at https://textjs.org/docs/routing and http://a.b:8080/p/q");
    expect(scrub("(see ./lib/a.ts?raw)")).toBe("(see ./lib/a.ts)");
    expect(scrub("open file:///tmp/x#L1")).toBe("open file:///tmp/x");
  });

  test("scrub strips relative URLs' queries and fragments, stray parameters and IP addresses", () => {
    expect(scrub("GET /orders?customer=Alice#details failed for 192.0.2.1")).toBe("GET /orders failed for <ip>");
    expect(scrub("fetch(api/cart#line-3) failed")).toBe("fetch(api/cart) failed");
    expect(scrub("bad input ?email=a&name=Alice")).toBe("bad input ");
    expect(scrub("peer 2001:db8:85a3:0:0:8a2e:370:7334 reset")).toBe("peer <ip> reset");
    // Questions and plain prose survive.
    expect(scrub("Did you mean <Box>? See /docs/box.")).toBe("Did you mean <Box>? See /docs/box.");
    expect(scrub("Expected 3 children, got 4")).toBe("Expected 3 children, got 4");
  });

  test("stackless values that aren't Errors report their type only", () => {
    expect(toReport("customer Alice owes $40", "rejection", ctx())?.message).toBe("Non-Error rejection: string");
    expect(toReport({ message: "Alice's order failed" }, "rejection", ctx())?.message).toBe("Non-Error rejection: Object");
    expect(toReport("Alice", "error", ctx())?.message).toBe("Non-Error throw: string");
    // Error-likes from another realm keep their message when they carry a stack.
    expect(toReport({ name: "TypeError", message: "x is not a function", stack: "TypeError: x\n    at f (https://textjs.org/assets/a-AbC12_-9.js:1:2)" }, "rejection", ctx())?.message).toBe("TypeError: x is not a function");
    // The reload marker capture.ts writes is ours.
    expect(toReport("Reloaded after a chunk failed to load: x", "chunk", ctx())?.message).toBe("Reloaded after a chunk failed to load: x");
  });

  test("a report carries the route, not the URL, user agent or window size", () => {
    const r = toReport(new Error("boom for jane@example.com"), "error", ctx({ pathname: "/docs/routing" }));
    const json = JSON.stringify(r);
    expect(r?.route).toBe("/docs/routing");
    expect(r?.browser).toBe("Chrome 142");
    expect(r?.os).toBe("macOS");
    expect(r?.viewport).toBe("md");
    expect(json).not.toContain("Mozilla");
    expect(json).not.toContain("AppleWebKit");
    expect(json).not.toContain("1280");
    expect(json).not.toContain("jane");
  });

  test("unknown paths are reported as /404", () => {
    expect(routeOf("/")).toBe("/");
    expect(routeOf("/docs/routing/")).toBe("/docs/routing");
    expect(routeOf("/jane@example.com")).toBe("/404");
    expect(routeOf("/docs/not-a-doc")).toBe("/404");
  });

  test("browser family and version only", () => {
    expect(browserOf(CHROME)).toEqual({ browser: "Chrome 142", os: "macOS" });
    expect(browserOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1")).toEqual({ browser: "Safari 18.4", os: "iOS" });
    expect(browserOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0")).toEqual({ browser: "Firefox 144", os: "Windows" });
    expect(browserOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0")).toEqual({ browser: "Edge 142", os: "Windows" });
    expect(browserOf("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36")).toEqual({ browser: "Chrome 142", os: "Android" });
    expect(browserOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0 Mobile/15E148 Safari/604.1")).toEqual({ browser: "Chrome 142", os: "iOS" });
    expect(browserOf("something odd")).toEqual({ browser: "Other", os: "Other" });
  });

  test("viewport buckets", () => {
    expect([320, 639, 640, 1023, 1024, 1439, 1440, 2560].map(viewportBucket)).toEqual(["xs", "xs", "sm", "sm", "md", "md", "lg", "lg"]);
  });
});

describe("stack trimming", () => {
  test("keeps our frames (V8), strips origin and query", () => {
    const stack = [
      "TypeError: x is not a function",
      "    at Ab (https://textjs.org/assets/Docs-AbC12_-9.js:1:234)",
      "    at async https://textjs.org/assets/index-Zz99Yy88.js?v=3:2:10",
      "    at chrome-extension://abcdef/content.js:5:5",
    ].join("\n");
    expect(ownFrames(stack, ORIGIN)).toEqual(["Ab (/assets/Docs-AbC12_-9.js:1:234)", "/assets/index-Zz99Yy88.js:2:10"]);
  });

  test("Firefox and Safari stack format", () => {
    const stack = ["Ab@https://textjs.org/assets/Docs-AbC12_-9.js:1:234", "@https://textjs.org/assets/index-Zz99Yy88.js:2:10", "x@https://static.cloudflareinsights.com/beacon.min.js:1:1"].join("\n");
    expect(ownFrames(stack, ORIGIN)).toEqual(["Ab (/assets/Docs-AbC12_-9.js:1:234)", "/assets/index-Zz99Yy88.js:2:10"]);
  });

  test("a stack with only foreign frames means the error isn't ours", () => {
    expect(ownFrames("Error\n    at moz-extension://x/inject.js:1:1\n    at https://evil.example/a.js:1:1", ORIGIN)).toBeNull();
    expect(toReport(v8Error("nope", ["chrome-extension://abc/content.js:1:1"]), "error", ctx())).toBeNull();
    // No stack at all (a thrown string) is still reported.
    expect(ownFrames("", ORIGIN)).toEqual([]);
  });

  test("Text.js error codes are kept", () => {
    const e = Object.assign(new Error("Text.js error TX004: <Box> cannot be nested inside <Text>. https://textjs.org/errors/TX004"), { code: "TX004" });
    expect(toReport(e, "console", ctx())?.code).toBe("TX004");
    expect(toReport(Object.assign(new Error("x"), { code: "ECONNRESET" }), "error", ctx())?.code).toBe("");
  });

  test("non-Error values don't throw", () => {
    expect(toReport(undefined, "rejection", ctx())?.message).toBe("Non-Error rejection: Undefined");
    expect(toReport(null, "rejection", ctx())?.message).toBe("Non-Error rejection: Null");
    expect(toReport(Object.create(null), "rejection", ctx())?.message).toBe("Non-Error rejection: Object");
    expect(toReport(42, "error", ctx())?.message).toBe("Non-Error throw: number");
  });
});

describe("scripts/errors.ts output", () => {
  test("control characters are escaped before printing", () => {
    expect(printable("boom\u001b[2J\u001b]0;pwned\u0007\r\nnext")).toBe("boom\\u001b[2J\\u001b]0;pwned\\u0007\\u000d\\u000anext");
    expect(printable("TypeError: x is not a function")).toBe("TypeError: x is not a function");
  });
});

describe("fingerprint", () => {
  test("stable across releases (chunk hashes, minified names, columns and numbers)", () => {
    const a = report({ message: "Failed to fetch dynamically imported module: https://textjs.org/assets/Docs-AbC12_-9.js", stack: ["Ab (/assets/index-AAAAAAAA.js:1:234)"] });
    const b = report({ message: "Failed to fetch dynamically imported module: https://textjs.org/assets/Docs-ZZZZZZZZ.js", stack: ["Qx (/assets/index-BBBBBBBB.js:1:9999)"] });
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(report({ message: "Expected 3 items" }))).toBe(fingerprint(report({ message: "Expected 7 items" })));
  });

  test("differs by message, top chunk and kind", () => {
    const base = fingerprint(report());
    expect(fingerprint(report({ message: "TypeError: y is not a function" }))).not.toBe(base);
    expect(fingerprint(report({ stack: ["Ab (/assets/Learn-AbC12_-9.js:1:234)"] }))).not.toBe(base);
    expect(fingerprint(report({ kind: "rejection" }))).not.toBe(base);
    expect(fingerprint(report())).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("volume", () => {
  test("dedupes by fingerprint within a page load", () => {
    const sent: string[] = [];
    const q = new ReportQueue((b) => sent.push(b));
    expect(q.add(report())).toBe(true);
    expect(q.add(report())).toBe(false);
    expect(q.add(report({ stack: ["Qx (/assets/Docs-ZZZZZZZZ.js:1:1)"] }))).toBe(false);
    expect(sent.length).toBe(1);
    expect(JSON.parse(sent[0] as string)).toEqual(report());
  });

  test("caps at five reports per page load", () => {
    const sent: string[] = [];
    const q = new ReportQueue((b) => sent.push(b));
    for (let i = 0; i < 20; i++) q.add(report({ message: `Error number ${String.fromCharCode(65 + i)}` }));
    expect(MAX_REPORTS_PER_PAGE).toBe(5);
    expect(sent.length).toBe(5);
  });

  test("uncapped reports bypass a full queue but are still deduplicated", () => {
    const sent: string[] = [];
    const q = new ReportQueue((b) => sent.push(b));
    for (let i = 0; i < 5; i++) q.add(report({ message: `Error ${String.fromCharCode(65 + i)}` }));
    expect(q.full).toBe(true);
    expect(q.add(report({ kind: "chunk", message: "Failed to fetch dynamically imported module" }))).toBe(false);
    expect(q.add(report({ kind: "chunk", message: "Failed to fetch dynamically imported module" }), true)).toBe(true);
    expect(q.add(report({ kind: "chunk", message: "Failed to fetch dynamically imported module" }), true)).toBe(false);
    expect(sent.length).toBe(6);
  });

  test("a page load outside the sample sends nothing", () => {
    const sent: string[] = [];
    const sink = createSink((b) => sent.push(b), () => 1);
    sink(new Error("boom"), "error");
    expect(sent.length).toBe(0);
  });
});

describe("chunk reload guard", () => {
  const storage = (): Pick<Storage, "getItem" | "setItem"> & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
  };

  test("recognises failed dynamic imports in every browser", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://textjs.org/assets/Docs-AbC12_-9.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module: https://textjs.org/assets/Docs-AbC12_-9.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/Docs-AbC12_-9.css"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  test("reloads once, then not again within the window", () => {
    const s = storage();
    expect(claimReload(s, 1_000_000)).toBe(true);
    expect(s.data.get(RELOAD_KEY)).toBe("1000000");
    expect(claimReload(s, 1_000_000 + 5_000)).toBe(false);
    expect(claimReload(s, 1_000_000 + RELOAD_WINDOW_MS - 1)).toBe(false);
    expect(claimReload(s, 1_000_000 + RELOAD_WINDOW_MS)).toBe(true);
  });

  test("never reloads without working sessionStorage", () => {
    expect(claimReload(null, 1)).toBe(false);
    const throwing = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(claimReload(throwing, 1)).toBe(false);
  });

  test("a clock that went backwards doesn't block forever", () => {
    const s = storage();
    s.data.set(RELOAD_KEY, String(10 * RELOAD_WINDOW_MS));
    expect(claimReload(s, 1)).toBe(true);
  });
});

describe("POST /api/errors", () => {
  let points: Array<Parameters<AnalyticsEngineDataset["writeDataPoint"]>[0]>;
  let logs: string[];
  let logSpy: ReturnType<typeof spyOn>;
  const env = (): { ERRORS: AnalyticsEngineDataset } => ({ ERRORS: { writeDataPoint: (p) => void points.push(p) } });

  beforeEach(() => {
    resetLimits();
    points = [];
    logs = [];
    logSpy = spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(String(a[0])));
  });
  afterEach(() => logSpy.mockRestore());

  const post = (body: string, headers: Record<string, string> = {}, url = `${ORIGIN}/api/errors`): Request =>
    new Request(url, { method: "POST", body, headers: { "user-agent": CHROME, origin: new URL(url).origin, "sec-fetch-site": "same-origin", "content-type": "text/plain", "cf-connecting-ip": "203.0.113.9", cookie: "__Host-terminal=secret", ...headers } });

  test("writes one data point and one log line, with no IP, cookie or user agent", async () => {
    const res = await handleReport(post(JSON.stringify(report())), env());
    expect(res.status).toBe(204);
    expect(points).toEqual([dataPoint(report(), "production")]);
    expect(points[0]?.indexes?.[0]).toBe(fingerprint(report()));
    expect(points[0]?.blobs?.[9]).toBe("production");
    expect(logs.length).toBe(1);
    const stored = JSON.stringify(points) + logs.join("");
    for (const secret of ["203.0.113.9", "__Host-terminal", "secret", "Mozilla", "AppleWebKit"]) expect(stored).not.toContain(secret);
    expect(JSON.parse(logs[0] as string)).toMatchObject({ event: "textjs.report", fingerprint: fingerprint(report()), env: "production", message: report().message });
  });

  test("the weight comes from the server's sample rate, never the request", async () => {
    await handleReport(post(JSON.stringify({ ...report(), sample: 0.000001 })), env());
    expect(points[0]?.doubles).toEqual([1]);
  });

  test("rate limits before reading the body", async () => {
    for (let i = 0; i < 20; i++) await handleReport(post(JSON.stringify(report())), env(), 1_000);
    let read = false;
    const body = new ReadableStream({
      pull(c) {
        read = true;
        c.enqueue(new TextEncoder().encode(JSON.stringify(report())));
        c.close();
      },
    }, { highWaterMark: 0 });
    const req = new Request(`${ORIGIN}/api/errors`, { method: "POST", body, headers: { "user-agent": CHROME, "cf-connecting-ip": "203.0.113.9" }, duplex: "half" } as RequestInit);
    expect((await handleReport(req, env(), 1_000)).status).toBe(204);
    expect(read).toBe(false);
    expect(points.length).toBe(20);
  });

  test("previews are tagged as previews", async () => {
    await handleReport(post(JSON.stringify(report()), {}, "https://abc123.textjs-avg.pages.dev/api/errors"), env());
    expect(points[0]?.blobs?.[9]).toBe("preview");
  });

  test("without the Analytics Engine binding, reports are still logged", async () => {
    const res = await handleReport(post(JSON.stringify(report())), {});
    expect(res.status).toBe(204);
    expect(logs.length).toBe(1);
  });

  test("only POST", async () => {
    const res = await handleReport(new Request(`${ORIGIN}/api/errors`), env());
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  test("rejects cross-site posts", async () => {
    expect((await handleReport(post(JSON.stringify(report()), { origin: "https://evil.example" }), env())).status).toBe(403);
    expect((await handleReport(post(JSON.stringify(report()), { "sec-fetch-site": "cross-site" }), env())).status).toBe(403);
    expect(points.length).toBe(0);
  });

  test("size limit, by header and by streamed body", async () => {
    const big = JSON.stringify({ ...report(), message: "x".repeat(MAX_BODY_BYTES) });
    expect((await handleReport(post(big), env())).status).toBe(413);
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const chunked = new Request(`${ORIGIN}/api/errors`, { method: "POST", body: stream, headers: { "user-agent": CHROME }, duplex: "half" } as RequestInit);
    expect((await handleReport(chunked, env())).status).toBe(413);
    expect(points.length).toBe(0);
  });

  test("drops bots and clients without a user agent", async () => {
    for (const ua of ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0.0.0 Safari/537.36", "curl/8.7.1", "python-requests/2.32", ""]) {
      expect((await handleReport(post(JSON.stringify(report()), { "user-agent": ua }), env())).status).toBe(204);
    }
    expect(points.length).toBe(0);
  });

  test("invalid JSON and invalid reports are 400", async () => {
    expect((await handleReport(post("{nope"), env())).status).toBe(400);
    expect((await handleReport(post(JSON.stringify({ ...report(), kind: "nope" })), env())).status).toBe(400);
    expect(points.length).toBe(0);
  });

  test("limits each client per minute", async () => {
    for (let i = 0; i < 25; i++) await handleReport(post(JSON.stringify(report())), env(), 1_000);
    expect(points.length).toBe(20);
    await handleReport(post(JSON.stringify(report()), { "cf-connecting-ip": "198.51.100.1" }), env(), 1_000);
    expect(points.length).toBe(21);
    await handleReport(post(JSON.stringify(report())), env(), 61_000);
    expect(points.length).toBe(22);
  });

  test("the per-isolate limit resets every minute", () => {
    resetLimits();
    let ok = 0;
    for (let i = 0; i < 3_000; i++) if (allow(`c${i}`, 5_000)) ok++;
    expect(ok).toBe(2_000);
    expect(allow("fresh", 65_000)).toBe(true);
  });
});
