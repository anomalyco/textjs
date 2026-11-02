/** Run against the built website with BASE=http://127.0.0.1:<private-preview-port>.
 * Full Chromium with its bundled DevTools frontend, the real CSRF/auth proxy,
 * and a mock V2 service that cannot run a command or contact a model. */
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { startProxy } from "@textjs/opencode";
import { startMockOpenCode } from "../test/mock-opencode";

const base = new URL(process.env.BASE!);
if (base.hostname !== "127.0.0.1" || !base.port || ["4096", "49374", "4173"].includes(base.port))
  throw Error("Private preview required");
const out = resolve(import.meta.dir, process.env.PARITY_ROUND === "4" ? "../.text/round4/devtools" : "../.text/round2/devtools");
await mkdir(out, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT!);
const password = crypto.randomUUID(),
  mock = startMockOpenCode({ password });
const config = await mkdtemp(resolve(tmpdir(), "textjs-private-keys-"));
try {
  process.env.XDG_CONFIG_HOME = config;
  delete process.env.OPENCODE_CLI_CONFIG_CONTENT;
  await mkdir(resolve(config, "opencode"));
  await writeFile(resolve(config, "opencode/cli.json"), JSON.stringify({ keybinds: { "help.show": "f9" } }));
  const bridge = await startProxy({
    port: 0,
    log: false,
    allowOrigins: [base.origin],
    discover: async () => ({
      source: "flag",
      url: mock.url,
      authorization: `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`,
    }),
  });
  try {
    if ([mock.url, bridge.url].some((u) => ["4096", "49374"].includes(new URL(u).port))) throw Error("Reserved port selected");
    const socket = createServer();
    await new Promise<void>((res) => socket.listen(0, "127.0.0.1", res));
    const port = (socket.address() as { port: number }).port;
    await new Promise<void>((res) => socket.close(() => res()));
    if ([4096, 49374].includes(port)) throw Error("Reserved debugger port selected");
    const browser = await chromium.launch({
      executablePath: chromium.executablePath(),
      headless: false,
      args: ["--headless=new", `--remote-debugging-port=${port}`, "--remote-allow-origins=*"],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
      const pageErrors: string[] = [];
      page.on("pageerror", (err: Error) => pageErrors.push(err.message));
      await page.route("**/*", (r: any) =>
        [base.origin, bridge.url].includes(new URL(r.request().url()).origin) ? r.continue() : r.abort(),
      );
      await page.addInitScript(() => {
        const state = ((window as any).__parity = { frame: "", times: [] as number[] });
        const log = console.log.bind(console);
        console.log = (...args) => {
          if (typeof args[0] === "string" && args[0].includes("%c")) {
            state.frame = args[0].replace(/%%|%c/g, (s: string) => (s === "%c" ? "" : "%"));
            if (state.frame.includes("Stream progress:")) state.times.push(performance.now());
          }
          log(...args);
        };
      });
      await page.goto(base.origin + "/opencode");
      await page.getByLabel("OpenCode server URL").fill(bridge.url);
      await page.getByRole("button", { name: "Connect", exact: true }).click();
      // The bridge asks for the code it printed (here, read from the handle) before it forwards anything.
      await page.getByLabel("Pairing code").fill(bridge.pairingCode);
      await page.getByRole("button", { name: "Pair", exact: true }).click();
      await page.getByRole("button", { name: "Disconnect" }).waitFor();
      await mock.waitForSubscriber();
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      const target = targets.find((t: any) => t.type === "page" && t.url === page.url());
      // Allow room for the 100-column frame, the DevTools gutter and Linux font fallback.
      const dt = await browser.newPage({ viewport: { width: 1024, height: 720 } });
      await dt.route(
        (url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.origin !== `http://127.0.0.1:${port}`,
        (route) => route.abort(),
      );
      await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
      await dt.locator("#tab-console").click();
      const cast = dt.locator('button[aria-label="Toggle screencast"].toggled');
      if (await cast.count()) await cast.click();
      await page.mouse.click(640, 600);
      await page.evaluate(() => (window as any).text.resize(100, 32));
      const snap = async (name: string, label: string) => {
        await page.waitForFunction((s: string) => (window as any).__parity.frame.includes(s), label);
        await dt.locator(".console-message-text").filter({ hasText: label }).last().waitFor({ state: "visible" });
        await page.waitForTimeout(180);
        await dt.locator("#console-messages").screenshot({ path: resolve(out, `${name}.png`) });
      };
      await snap("home", "Ask anything");
      await page.keyboard.press("F9");
      await snap("bridge-keybind", "see all available");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+x");
      await snap("which-key", "Leader · ctrl+x");
      await page.keyboard.press("Escape");
      await page.keyboard.type("/diff");
      await page.keyboard.press("Enter");
      await snap("diff", "export const attempts = 3");
      await page.keyboard.press("q");
      await page.keyboard.type("/model");
      await snap("slash", "/models");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+u");
      await page.keyboard.type("@src");
      await snap("mention", "cart badge.ts");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+u");
      await page.keyboard.press("Control+x");
      await page.keyboard.press("l");
      await snap("sessions", "Sessions for");
      await page.keyboard.type("Refactor auth");
      await page.keyboard.press("Enter");
      await snap("session", "It lives in");
      mock.emit({
        type: "permission.asked",
        data: { id: "per_browser", sessionID: "ses_alpha", action: "shell", resources: ["echo fixture"], save: ["echo fixture"] },
      });
      await snap("permission", "Allow once");
      await page.keyboard.press("Escape");
      mock.emit({
        type: "form.created",
        data: {
          form: {
            id: "frm_browser",
            sessionID: "ses_alpha",
            title: "Choose a branch",
            fields: [
              {
                key: "branch",
                type: "string",
                options: [
                  { value: "main", label: "main" },
                  { value: "release", label: "release" },
                ],
              },
            ],
          },
        },
      });
      await snap("question", "2. release");
      await page.keyboard.press("2");
      await page.waitForTimeout(250);
      const sessionID = "ses_alpha",
        messageID = "msg_paced";
      const started = Date.now(),
        model = { id: "claude-opus-5-5", providerID: "anthropic" };
      const ev = (type: string, data: Record<string, unknown>) =>
        mock.emit({ type, data: { sessionID, assistantMessageID: messageID, ...data } });
      ev("session.step.started", { agent: "build", model, started });
      ev("session.text.started", { ordinal: 0 });
      let text = "Stream progress: ";
      ev("session.text.delta", { ordinal: 0, delta: text });
      for (let i = 0; i < 100; i++) {
        const delta = i === 99 ? " done." : "x";
        text += delta;
        ev("session.text.delta", { ordinal: 0, delta });
        await Bun.sleep(10);
      }
      ev("session.text.ended", { ordinal: 0, text });
      ev("session.step.ended", { finish: "stop" });
      mock.messages.get(sessionID)?.push({
        id: messageID,
        type: "assistant",
        agent: "build",
        model,
        time: { created: started, completed: Date.now() },
        content: [{ type: "text", text }],
      });
      ev("session.execution.succeeded", {});
      await snap("stream", "done.");
      const times: number[] = await page.evaluate(() => (window as any).__parity.times),
        gaps = times
          .slice(1)
          .map((v, i) => Math.round(v - times[i]!))
          .sort((a, b) => a - b);
      if (times.length < 2 || times.length >= 100) throw Error(`Unexpected paced frames: ${times.length}`);
      const pace = {
        deltas: 101,
        frames: times.length,
        minGapMs: gaps[0],
        medianGapMs: gaps[Math.floor(gaps.length / 2)],
        maxGapMs: gaps.at(-1),
      };
      await writeFile(resolve(out, "stream.json"), JSON.stringify(pace, null, 2));
      console.log("DevTools stream cadence:", pace);
      if (
        !mock.requests.some((r) => r.path.endsWith("/per_browser/reply") && (r.body as any)?.decision === "reject") ||
        !mock.requests.some((r) => r.path.endsWith("/frm_browser/reply") && (r.body as any)?.answer?.branch === "release")
      )
        throw Error("Expected explicit decisions through mock bridge");
      if (pageErrors.length) throw Error(pageErrors.join("\n"));
      console.log(`Live bridge DevTools: captured menus, reject, form reply and paced stream verified (${out})`);
    } finally {
      await browser.close();
    }
  } finally {
    mock.stop();
    await bridge.close();
  }
} finally {
  mock.stop();
  await rm(config, { recursive: true });
}
