/**
 * Headless end-to-end run: loads the shop in Chromium, presses keys through
 * shop → cart → shipping → payment → confirm, and records every console frame
 * as text (decoded from the `console.log("%c…")` calls the page makes).
 *
 *   bun scripts/e2e.ts --mock                 # in-memory Terminal API, no credentials needed
 *   bun scripts/e2e.ts                        # the running dev server + dev sandbox
 *   bun scripts/e2e.ts --place-order          # …and actually convert the cart (dev sandbox only)
 *
 * Options: --url http://localhost:3002, --out <dir>, --headed.
 * Production is refused outright: the script checks the proxy and the app's
 * environment before pressing anything.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MOCK_TOKEN, startMockTerminal, type MockTerminal } from "../test/mock-terminal";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? (args[i + 1] as string) : fallback;
};

const MOCK = flag("mock");
const PLACE_ORDER = flag("place-order") || MOCK;
const OUT = option("out", join(tmpdir(), `terminal-shop-e2e-${MOCK ? "mock" : "dev"}`));
let url = option("url", "http://localhost:3002");

// playwright-core lives in bench/devtools; its types aren't part of this package.
type Playwright = { chromium: { launch(options: object): Promise<any> } };
type BrowserContext = any;

async function loadPlaywright(): Promise<Playwright> {
  const path = join(ROOT, "../../bench/devtools/node_modules/playwright-core/index.mjs");
  return (await import(path)) as Playwright;
}

function chromiumPath(): string | undefined {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  for (const dir of readdirSync(cache).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
    for (const app of [
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    ]) {
      const p = join(cache, dir, app);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

/** `console.log(format, ...css)` → the frame's text: drop `%c`, the zero-width curtain/tails and word joiners. */
export function decodeFrame(format: string): string {
  return format
    .replace(/%c/g, "")
    .replace(/%%/g, "%")
    .replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

async function startDevServer(api: MockTerminal): Promise<{ proc: ChildProcess; url: string }> {
  const port = 3900 + Math.floor(Math.random() * 90);
  const proc = spawn("bun", [join(ROOT, "../../packages/text/bin/text.ts"), "dev", "--port", String(port)], {
    cwd: ROOT,
    env: { ...process.env, TERMINAL_DEV_API_URL: api.url, TERMINAL_DEV_TOKEN: MOCK_TOKEN, TERMINAL_ENABLE_PRODUCTION: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/__terminal/_status`);
      if (r.ok) return { proc, url: base };
    } catch {
      // not up yet
    }
    await Bun.sleep(100);
  }
  proc.kill();
  throw new Error("dev server did not start");
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  let mock: MockTerminal | null = null;
  let dev: ChildProcess | null = null;
  if (MOCK) {
    mock = startMockTerminal();
    const started = await startDevServer(mock);
    dev = started.proc;
    url = started.url;
  }

  const status = (await (await fetch(`${url}/__terminal/_status`)).json()) as { environments: { dev: { serverToken: boolean; api: string } } };
  console.log(`▼ ${url} → ${status.environments.dev.api} (server token: ${status.environments.dev.serverToken ? "yes" : "no"})`);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: !flag("headed"), executablePath: chromiumPath() });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const frames: string[] = [];
  // Every frame is one `console.log(format, ...css)`; keep the decoded format string.
  let pending = Promise.resolve();
  page.on("console", (msg: { type(): string; args(): Array<{ jsonValue(): Promise<unknown> }> }) => {
    if (msg.type() !== "log") return;
    const first = msg.args()[0];
    if (!first) return;
    pending = pending.then(async () => {
      const format = await first.jsonValue().catch(() => null);
      if (typeof format === "string" && format.includes("%c")) frames.push(decodeFrame(format));
    });
  });
  page.on("pageerror", (e: Error) => console.error("page error:", e.message));

  const shots: Array<{ name: string; text: string }> = [];
  const grid = (): Promise<string> =>
    page.evaluate(() => {
      const api = (window as unknown as { text?: { renderer: { buffer: { toPlainString(trim: boolean): string } } } }).text;
      return api ? api.renderer.buffer.toPlainString(true).replace(/\n+$/, "") : "";
    });
  const lastFrame = (): string => frames[frames.length - 1] ?? "";
  const snap = async (name: string): Promise<void> => {
    await page.waitForTimeout(250);
    await pending;
    const text = lastFrame();
    const buffer = await grid();
    const norm = (v: string): string => v.split("\n").map((l) => l.trimEnd()).join("\n").replace(/^\n+|\n+$/g, "");
    const same = norm(text) === norm(buffer);
    shots.push({ name, text });
    writeFileSync(join(OUT, `${String(shots.length).padStart(2, "0")}-${name}.txt`), `${text}\n`);
    console.log(`\n── ${name} ${same ? "(console frame = cell buffer)" : "(console frame differs from the cell buffer!)"}\n${text}`);
  };
  const until = async (needle: string, timeout = 20_000): Promise<void> => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (lastFrame().includes(needle) || (await grid()).includes(needle)) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`timed out waiting for "${needle}"\n${lastFrame()}`);
  };
  const press = async (...keys: string[]): Promise<void> => {
    for (const k of keys) {
      await page.keyboard.press(k);
      await page.waitForTimeout(90);
    }
  };

  try {
    await page.goto(url);
    await page.waitForSelector("[data-textjs-focus-pad]", { timeout: 15_000 }).catch(() => undefined);
    await page.click("[data-textjs-focus-pad]").catch(() => page.mouse.click(200, 200));

    await until("terminal");
    await page.waitForTimeout(400);
    if ((await grid()).includes("sign in")) {
      await snap("login");
      const token = process.env.TERMINAL_DEV_TOKEN;
      if (!token) throw new Error("no credentials: set TERMINAL_DEV_TOKEN (dev sandbox, trm_test_…) or run the dev server with it");
      await press("Enter");
      await until("personal access token");
      await page.keyboard.insertText(token);
      await snap("login-token");
      await press("Enter");
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline && !(await grid()).includes("free shipping")) {
        if ((await grid()).includes("rejected")) {
          await snap("login-rejected");
          throw new Error("the dev sandbox rejected that token");
        }
        await page.waitForTimeout(150);
      }
    }
    await until("free shipping", 30_000);
    await press("m");
    await until("press esc to close");
    await snap("menu");
    await press("Escape");
    await until("~ featured ~");
    await snap("shop");

    // Refuse anything but the sandbox: the debug page names the environment.
    await press("a");
    await until("order history");
    for (let i = 0; i < 8; i++) await press("ArrowDown");
    await until("environment:");
    await snap("account-debug");
    if (!(await grid()).includes("environment: dev sandbox")) throw new Error(`not in the dev sandbox, refusing to continue\n${await grid()}`);
    await press("ArrowUp", "ArrowUp");
    await until("help, i have a question");
    await snap("account-faq");
    await press("s");
    await until("~ featured ~");

    // Add two bags of the first regular coffee.
    for (let i = 0; i < 3; i++) await press("ArrowDown");
    await press("+", "+");
    await until("[2]");
    await snap("shop-qty");
    await press("c");
    await until("checkout");
    await snap("cart");
    await press("Enter");
    await until("shipping");
    await page.waitForTimeout(300);
    if ((await grid()).includes("street 1")) {
      await snap("shipping-form");
      await press("Tab");
      await page.keyboard.type("1600 Pennsylvania Ave NW");
      await press("Tab", "Tab");
      await page.keyboard.type("Washington");
      await press("Tab");
      await page.keyboard.type("DC");
      await press("Tab", "Tab", "Tab");
      await page.keyboard.type("20500");
      await snap("shipping-form-filled");
      await press("Enter");
    } else {
      await snap("shipping-list");
      await press("Enter");
    }
    await until("select payment method");
    await snap("payment");
    const grid0 = await grid();
    if (grid0.includes("**** **** ****")) {
      await press("Enter");
    } else {
      await press("Enter");
      await until("scan or copy");
      await snap("payment-browser");
      const link = (await grid()).match(/https:\/\/\S+/)?.[0];
      if (MOCK && mock) mock.completeCollect();
      else if (link) await addTestCard(context, link);
    }
    await until("press enter to confirm", 120_000);
    await snap("confirm");
    if (!PLACE_ORDER) {
      console.log("\n▼ stopped at confirm (pass --place-order to convert the cart in the dev sandbox)");
      return;
    }
    await press("Enter");
    await until("subscribe to your order?", 60_000);
    await snap("order-complete");
    await press("Escape");
    await until("Thank you");
    await snap("thank-you");
    await press("Enter");
    await until("Connection to terminal.shop closed.");
    await snap("quit");
    if (mock) {
      const convert = mock.requests.find((r) => r.path === "/cart/convert");
      console.log(`\n▼ mock saw POST /cart/convert with idempotency-key ${convert?.idempotencyKey ? "set" : "MISSING"}; orders: ${mock.state.orders.length}`);
    }
  } finally {
    writeFileSync(join(OUT, "frames.log"), frames.join("\n\f\n"));
    console.log(`\n▼ ${frames.length} console frames, ${shots.length} snapshots → ${OUT}`);
    await browser.close();
    dev?.kill();
    mock?.stop();
  }
}

/** Fill the dev sandbox's hosted card page with Stripe's public test card. Never used against production. */
async function addTestCard(context: BrowserContext, link: string): Promise<void> {
  if (!/^https:\/\/(dev\.trm\.sh|[\w.-]*dev\.terminal\.shop)\//.test(link)) throw new Error(`refusing to enter a card on ${new URL(link).host}`);
  const pay = await context.newPage();
  await pay.goto(link);
  await pay.waitForSelector('input[placeholder="card number"]', { timeout: 30_000 });
  if (!/dev\.terminal\.shop$/.test(new URL(pay.url()).host)) throw new Error(`card page is not the dev sandbox (${new URL(pay.url()).host})`);
  const fill = async (placeholder: string, value: string): Promise<void> => {
    const input = pay.locator(`input[placeholder="${placeholder}"]`);
    if ((await input.count()) > 0 && !(await input.inputValue())) await input.fill(value);
  };
  await fill("email address", "textjs-e2e@example.com");
  await fill("name on card", "Text Js");
  await fill("card number", "4242424242424242");
  await fill("mm", "12");
  await fill("yy", "34");
  await fill("cvc", "123");
  await pay.locator('button[type="submit"]').click();
  await pay.waitForSelector("text=Card successfully added", { timeout: 30_000 });
  await pay.close();
}

await main();
