import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { legacyTextMessages, LiveInputSender } from "../src/dev-server";

/** A `text dev` server from `@textjs/app` 1.1.0: it knows key, paste, wheel and navigate, and rejects `text` with 400. */
let server: Server;
let base = "";
let received: Array<Record<string, unknown>> = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body) as Record<string, unknown>;
      received.push(msg);
      res.statusCode = msg.type === "text" ? 400 : 204;
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

beforeEach(() => {
  received = [];
});

const key = (k: string) => ({ type: "key", key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });

describe("live input against a server without `text`", () => {
  test("a rejected `text` is resent as keys, and later ones skip the 400", async () => {
    const sender = new LiveInputSender();
    expect(await sender.send(base, { type: "text", text: "你好" }, "tab1", "s1")).toBe(true);
    expect(received).toEqual([{ type: "text", text: "你好", source: "tab1" }, { ...key("你"), source: "tab1" }, { ...key("好"), source: "tab1" }]);
    received = [];
    expect(await sender.send(base, { type: "text", text: "\u00e9" }, undefined, "s1")).toBe(true);
    expect(received).toEqual([key("\u00e9")]);
  });

  test("the fallback is per server session", async () => {
    const sender = new LiveInputSender();
    await sender.send(base, { type: "text", text: "a" }, undefined, "old");
    received = [];
    await sender.send(base, { type: "text", text: "b" }, undefined, "restarted");
    expect(received.map((m) => m.type)).toEqual(["text", "key"]);
  });

  test("other messages are sent once, as is", async () => {
    const sender = new LiveInputSender();
    expect(await sender.send(base, { type: "paste", text: "hi" })).toBe(true);
    expect(received).toEqual([{ type: "paste", text: "hi" }]);
  });
});

describe("legacyTextMessages", () => {
  test("single-code-point graphemes become keys", () => {
    expect(legacyTextMessages("hao")).toEqual([key("h"), key("a"), key("o")] as never);
    expect(legacyTextMessages("日本語")).toEqual([key("日"), key("本"), key("語")] as never);
  });

  test("newlines, long text and multi-code-point graphemes become a paste", () => {
    // Decomposed é, a skin-tone emoji and conjoining Hangul jamo are one grapheme each but several code points.
    for (const text of ["a\nb", "x".repeat(17), "e\u0301", "👍🏽", "\u1100\u1161"]) {
      expect(legacyTextMessages(text)).toEqual([{ type: "paste", text }]);
    }
  });
});
