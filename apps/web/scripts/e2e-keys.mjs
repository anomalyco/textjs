// Headless keyboard E2E: open each demo page, click the focus pad, press the demo's keys and
// assert the real console.log frames change as expected.
//
//   bun run dev   (or: bun run build && bun run preview)
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:3000 node scripts/e2e-keys.mjs
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = process.env.BASE ?? "http://localhost:3000";
const port = new URL(base).port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  window.__frames = [];
  const orig = console.log.bind(console);
  console.log = (...a) => {
    if (typeof a[0] === "string" && a[0].includes("%c")) window.__frames.push(a[0].replace(/%c/g, "").replace(/%%/g, "%"));
    return orig(...a);
  };
});
// Never reach a real local OpenCode server from tests: the OpenCode page must stay in its sandbox.
await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const last = () => page.evaluate(() => window.__frames[window.__frames.length - 1] ?? "");
const settle = (ms = 250) => page.waitForTimeout(ms);
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n${detail}`}`);
  if (!ok) failures++;
};
const padState = () => page.getAttribute("[data-textjs-focus-pad]", "data-state");

async function press(keys) {
  for (const k of keys) {
    if (k.length > 1 && !/^[A-Z][a-z]/.test(k) && !k.includes("+")) await page.keyboard.type(k);
    else await page.keyboard.press(k);
    await settle(90);
  }
  await settle();
}

const demos = [
  { id: "Counter", keys: ["ArrowUp", "ArrowUp", "ArrowUp"], expect: (b, a) => a !== b },
  { id: "Form", keys: ["acme", "Enter"], expect: (b, a) => a.includes("Deployed acme") },
  { id: "Streaming", keys: ["r"], expect: (b, a) => a !== b },
  { id: "Dashboard", keys: ["ArrowRight"], expect: (b, a) => a !== b },
  { id: "Snake", keys: ["ArrowDown"], expect: (b, a) => b.includes("press an arrow key") && !a.includes("press an arrow key") },
];

await page.goto(`${base}/playground`);
await settle(1200);
check("playground pad starts in 'open' state", (await padState()) === "open", await padState());
check("no on-page TUI mirror", (await page.locator("[data-textjs-mirror]").count()) === 0);
const before0 = await last();
await page.keyboard.press("ArrowUp");
await settle();
check("keys before clicking stay on the page", (await last()) === before0);

// Click the big pad (empty area, away from controls).
await page.mouse.click(640, 640);
await settle();
for (const d of demos) {
  await page.getByRole("tab", { name: d.id, exact: true }).click();
  await settle(500);
  const b = await last();
  await press(d.keys);
  const a = await last();
  check(`${d.id}: keys reach the console app`, d.expect(b, a), a.split("\n").slice(0, 30).join("\n"));
}
check("pad is live after keystrokes", (await padState()) === "live", await padState());

// Console size control: a preset pins the grid (and persists), "Fit console" follows DevTools again.
const grid = (frame) => {
  const rows = frame.replace(/[\u200b\u2060]/g, "").split("\n").filter((r) => r.length > 0);
  return { cols: Math.max(...rows.map((r) => [...r].length)), rows: rows.length };
};
const size = page.getByLabel("Console size");
check("pad has a console size control, fitting by default", (await size.inputValue()) === "fit", await size.inputValue());
await size.selectOption("80x24");
await settle(400);
const pinned = grid(await last());
check("size preset resizes the console frame", pinned.cols === 80 && pinned.rows === 24, JSON.stringify(pinned));
await page.reload();
await settle(1200);
check("size choice persists across reloads", (await page.getByLabel("Console size").inputValue()) === "80x24" && grid(await last()).rows === 24, JSON.stringify(grid(await last())));
await page.getByLabel("Console size").selectOption("fit");
await settle(400);
const fitted = grid(await last());
// DevTools is closed in this headless page, so "Fit console" uses the 120×36 fallback.
check("Fit console falls back when DevTools can't be measured", fitted.cols === 120 && fitted.rows === 36, JSON.stringify(fitted));

// Simulate focus moving into DevTools: blur the window.
await page.evaluate(() => window.dispatchEvent(new Event("blur")));

await page.goto(`${base}/opencode`);
await settle(1200);
await page.mouse.click(640, 400);
await settle();
const ob = await last();
await press(["Control+x", "m"]);
check("OpenCode: leader+m opens the model picker", (await last()).includes("Switch model"));
await press(["Escape", "Shift+Tab"]);
check("OpenCode: Shift+Tab changes the active agent", (await last()).includes("Plan ·"));
await press(["Shift+Tab", "!", "Escape", "/help", "Enter"]);
check("OpenCode: leaving shell mode and submitting /help never starts a turn", (await last()).includes("see all available"));
await press(["Escape"]);
await press(["hello console", "Enter"]);
await settle(800);
const oa = await last();
check("OpenCode: prompt is typed and sent", oa.includes("hello console") && oa !== ob, oa.split("\n").slice(0, 30).join("\n"));
await press(["Escape"]);
check("OpenCode: first Escape arms rather than interrupts", (await last()).includes("again to interrupt"));
await press(["Escape", "Control+x", "l"]);
check("OpenCode: the session picker stays inside the website route", (await last()).includes("Switch session") && new URL(page.url()).pathname === "/opencode");

await page.goto(`${base}/showcase`);
await settle(500);
check("/showcase redirects to /playground", new URL(page.url()).pathname === "/playground", page.url());

await page.goto(`${base}/`);
await settle(1000);
const hb = await last();
await page.locator(".split-console").click();
await press(["ArrowUp", "ArrowUp"]);
check("Home: clicking the preview routes ↑ to the console", (await last()) !== hb);

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
process.exit(failures ? 1 : 0);
