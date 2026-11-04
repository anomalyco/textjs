// Headless E2E for /learn: every chapter's console app renders and responds to its keys, the
// overview opens chapters from the console, and quiz progress survives a reload.
//
//   bun run build && bun run preview   (or: bun run dev)
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:3000 node scripts/e2e-learn.mjs
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = process.env.BASE ?? "http://localhost:3000";
const port = new URL(base).port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  // A tab that has shown console intent: the companion boots on load, so frames can be read before any click.
  sessionStorage.setItem("textjs:console-intent", "1");
  window.__frames = [];
  const orig = console.log.bind(console);
  console.log = (...a) => {
    if (typeof a[0] === "string" && a[0].includes("%c")) window.__frames.push(a[0].replace(/%c/g, "").replace(/%%/g, "%").replace(/[\u200b\u2060]/g, ""));
    return orig(...a);
  };
});
// Never reach a real local OpenCode server from tests.
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
const head = (frame) => frame.split("\n").slice(0, 30).join("\n");

async function press(keys) {
  for (const k of keys) {
    if (typeof k === "number") await settle(k);
    else if (k.length > 1 && !/^[A-Z][a-z]/.test(k) && !k.includes("+")) await page.keyboard.type(k);
    else await page.keyboard.press(k);
    await settle(90);
  }
  await settle();
}

/** Click the chapter's focus pad (in a corner, away from its controls). */
async function engage() {
  const pad = page.locator("[data-textjs-focus-pad]").first();
  await pad.scrollIntoViewIfNeeded();
  await pad.click({ position: { x: 16, y: 16 } });
  await settle();
}

const chapters = [
  { slug: "getting-started", title: "01 Getting Started", keys: ["Enter"], expect: (b, a) => a.includes("Hello, console. ×1") },
  { slug: "layout", title: "02 Layout with Box", keys: ["s"], expect: (b, a) => b.includes("Overview") && !a.includes("Overview") },
  { slug: "styling", title: "03 Text & Styling", keys: ["s"], expect: (b, a) => b.includes("● Ready") && a.includes("● Building") },
  { slug: "input-and-keymaps", title: "04 Input & Keymaps", keys: ["ArrowDown", "Enter"], expect: (b, a) => a.includes("›  perf: merge spans") && a.includes("dpl_7Qa9") },
  { slug: "routing", title: "05 Routing", keys: ["2"], expect: (b, a) => !b.includes("acme.local/deployments") && a.includes("acme.local/deployments") },
  { slug: "data-fetching", title: "06 Data & Route Handlers", keys: [900, "n"], expect: (b, a) => a.includes("POST /api/deployments") },
  { slug: "components", title: "07 Table, List & Charts", keys: ["c"], expect: (b, a) => a.includes("Average build time by project") },
  { slug: "testing", title: "08 Testing", keys: ["Enter", 1500], expect: (b, a) => a.includes("5 pass") },
  { slug: "terminal", title: "09 Running in a Terminal", keys: ["Enter"], expect: (b, a) => b.includes("acme — zsh") && a.includes("acme — text run") },
  { slug: "shipping", title: "10 Shipping", keys: ["Enter", 2600], expect: (b, a) => a.includes("Shipped.") },
];

/** Poll until the latest console frame contains `text`. */
async function frameWith(text, timeout = 4000) {
  const end = Date.now() + timeout;
  let f = await last();
  while (!f.includes(text) && Date.now() < end) {
    await settle(100);
    f = await last();
  }
  return f;
}

for (const c of chapters) {
  await page.goto(`${base}/learn/${c.slug}`);
  await page.waitForSelector("[data-textjs-focus-pad]");
  const b = await frameWith(`learn / ${c.title}`);
  check(`${c.slug}: console shows the chapter's app`, b.includes(`learn / ${c.title}`), `${page.url()}\n${head(b)}\n${(await page.locator("main").innerText()).slice(0, 200)}`);
  await engage();
  await press(c.keys);
  const a = await last();
  check(`${c.slug}: keys reach the console app`, c.expect(b, a), head(a));
}

// The overview: ↓ Enter in the console opens chapter 2, and keys keep flowing into it.
// (Fresh progress, so the highlight starts at chapter 1 rather than the last chapter visited.)
await page.evaluate(() => localStorage.removeItem("textjs:learn"));
await page.goto(`${base}/learn`);
await page.waitForSelector("[data-textjs-focus-pad]");
await frameWith("01 Getting Started");
check("overview: console lists the chapters", (await last()).includes("01 Getting Started"), head(await last()));
await engage();
await press(["ArrowDown", "Enter"]);
await settle(400);
check("overview: Enter opens the highlighted chapter", new URL(page.url()).pathname === "/learn/layout" && (await last()).includes("learn / 02 Layout with Box"), `${page.url()}\n${head(await last())}`);
await press(["s"]);
check("overview → chapter: keys stay in the console", !(await last()).includes("Overview"), head(await last()));

// Progress: passing a quiz checks the chapter off, and it persists across reloads.
await page.goto(`${base}/learn/routing`);
await settle(800);
await page.getByRole("radio", { name: "app/deployments/page.tsx" }).click();
await page.getByRole("radio", { name: "Layout state" }).click();
await settle();
check("quiz: answering both completes the chapter", (await page.locator(".learn-status.done").count()) === 1);
await page.reload();
await settle(1000);
check("progress persists across reloads", (await page.locator(".learn-status.done").count()) === 1 && (await page.locator('.learn-sidebar a[href="/learn/routing"] .learn-check.done').count()) === 1);
await page.goto(`${base}/learn`);
await settle(800);
check("overview offers to resume", (await page.locator(".learn-cta").innerText()).includes("Resume"), await page.locator(".learn-cta").innerText());

// Certificate: the name typed on the page is printed in the console.
await page.goto(`${base}/learn/certificate`);
await settle(1000);
await page.getByLabel("Name on certificate").fill("Ada Lovelace");
await settle(400);
check("certificate: the name reaches the console", (await last()).includes("Ada Lovelace") && (await last()).includes("C E R T I F I C A T E"), head(await last()));
check("certificate: and the page", (await page.locator(".learn-cert pre").innerText()).includes("Ada Lovelace"));

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
process.exit(failures ? 1 : 0);
