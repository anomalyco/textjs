import { expect, test } from "bun:test";
import { ConsoleRenderer } from "../src/renderer";

test("banner colors are normalized to hex before they reach the driver", () => {
  const renderer = new ConsoleRenderer({ console: { log() {}, clear() {} }, width: 20, height: 4 } as never);
  renderer._setBanner({ text: "hint", fg: "white", bg: "rgb(10,20,30)" });
  expect(renderer._banner).toEqual({ text: "hint", fg: "#ffffff", bg: "#0a141e" });
});
