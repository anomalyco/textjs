// Headless keyboard E2E: open each Playground demo, click the focus pad, press the demo's keys and
// assert the real console.log frames change as expected. Also checks the picker's URLs, history
// and the retired Counter and Form links.
//
//   bun run dev   (or: bun run build && bun run preview)
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:3000 node scripts/e2e-keys.mjs
import { fileURLToPath } from "node:url";
import {gzipSync} from "node:zlib";

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
const modules=new Map();page.on("response",r=>{const u=new URL(r.url());if(u.origin===new URL(base).origin&&/^\/assets\/.*\.js$/.test(u.pathname))modules.set(u.pathname,r);});
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
  { id: "Dashboard", path: "/playground", keys: ["ArrowLeft"], expect: (b, a) => !b.includes("Frames / s") && a.includes("Frames / s") },
  { id: "Streaming", path: "/playground/streaming", keys: ["r"], expect: (b, a) => a !== b },
  { id: "Snake", path: "/playground/snake", keys: ["ArrowDown"], expect: (b, a) => b.includes("press an arrow key") && !a.includes("press an arrow key") },
];
const picker = (name) => page.locator(".pad-picker a", { hasText: name });
const picked = () => page.evaluate(() => document.querySelector('.pad-picker [aria-current="page"]')?.textContent);
const path = () => new URL(page.url()).pathname;

await page.goto(`${base}/playground`);
await settle(1200);
check("playground pad starts in 'open' state", (await padState()) === "open", await padState());
check("picker: five demos, OpenCode and Coffee last", (await page.locator(".pad-picker a").allTextContents()).join("|") === "Dashboard|Streaming|Snake|OpenCode|Coffee", (await page.locator(".pad-picker a").allTextContents()).join("|"));
check("picker pills are words only", (await page.locator(".pad-picker svg").count()) === 0);
const wordmark = () => page.evaluate(() => document.querySelector(".tx-pad-desk .pad-slot-banner svg")?.getAttribute("aria-label") ?? null);
check("/playground opens on Dashboard", (await picked()) === "Dashboard", await picked());
check("no on-page TUI mirror", (await page.locator("[data-textjs-mirror]").count()) === 0);
const openCodeLoaded=()=>page.evaluate(()=>performance.getEntriesByType("resource").some(e=>/\/OpenCodeLite(?:-[\w-]+\.js|\.tsx)/.test(e.name)));
check("OpenCode: its client chunk isn't fetched by the initial Playground",!await openCodeLoaded());
const before0 = await last();
await page.keyboard.press("ArrowUp");
await settle();
check("keys before clicking stay on the page", (await last()) === before0);

// Click the big pad (empty area, away from controls).
await page.mouse.click(640, 640);
await settle();
for (const d of demos) {
  await picker(d.id).click();
  await settle(500);
  check(`${d.id}: picking it updates the URL`, path() === d.path && (await picked()) === d.id, page.url());
  const b = await last();
  await press(d.keys);
  const a = await last();
  check(`${d.id}: keys reach the console app`, d.expect(b, a), a.split("\n").slice(0, 30).join("\n"));
}
check("pad is live after keystrokes", (await padState()) === "live", await padState());

// OpenCode and Coffee: same pad, their own URLs and bottom panels; back and forward work.
const beforeOpenCode=new Set(modules.keys());
await picker("OpenCode").click();
await settle(800);
check("OpenCode: picked at /opencode with the connection panel", path() === "/opencode" && (await picked()) === "OpenCode" && (await page.locator(".pad-connect").count()) === 1, page.url());
check("OpenCode: its wordmark leads the message", (await wordmark()) === "OpenCode", await wordmark());
check("OpenCode: selecting it loads the client",await openCodeLoaded());
const activation=await Promise.all([...modules].filter(([name])=>!beforeOpenCode.has(name)).map(async([name,r])=>({name,gzipBytes:gzipSync(await r.body()).byteLength})));console.log("OpenCode activation JS (gzip bytes):",JSON.stringify(activation));
check("OpenCode: the console switches without a reload, keys still routed", (await last()).includes("Ask anything") && (await padState()) === "live", await last());
await picker("Coffee").click();
await settle(800);
check("Coffee: picked at /coffee with the terminal.shop note", path() === "/coffee" && (await picked()) === "Coffee" && (await page.locator(".pad-note").innerText()).includes("terminal.shop"), page.url());
check("Coffee: terminal.shop's wordmark leads the message", (await wordmark()) === "terminal.shop", await wordmark());
await page.goBack();
await settle(800);
check("back: OpenCode again", path() === "/opencode" && (await picked()) === "OpenCode" && (await last()).includes("Ask anything"), page.url());
await page.goBack();
await settle(800);
check("back: Snake again, with View source", path() === "/playground/snake" && (await picked()) === "Snake" && (await last()).includes("score"), page.url());
check("View source is back in the bottom slot", (await page.locator(".pad-source").count()) === 1);
await page.goForward();
await settle(800);
check("forward: OpenCode", path() === "/opencode" && (await picked()) === "OpenCode", page.url());
await page.goto(`${base}/playground/snake`);
await settle(1000);
check("/playground/snake deep link picks Snake", (await picked()) === "Snake" && (await last()).includes("score"), await picked());
// The site hasn't launched, so paths that never shipped are plain 404s: no redirects.
for (const gone of ["/playground/counter", "/playground/form", "/playground/dashboard", "/showcase", "/terminal"]) {
  await page.goto(`${base}${gone}`);
  await settle(600);
  check(`${gone} is a 404`, path() === gone && (await page.locator(".notfound").count()) === 1 && (await page.locator(".pad-picker").count()) === 0, page.url());
}
await page.goto(`${base}/playground`);
await settle(1000);

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
// The choice belongs to the Playground: Home's console and its hero mirror keep Home's 100×26.
const heroMirror = () =>
  page.evaluate(() => {
    const box = document.querySelector(".split-console .mirror-scale > div");
    const live = box?.children[1]?.firstElementChild;
    return box && live ? { placeholder: [box.children[0].offsetWidth, box.children[0].offsetHeight], live: [live.offsetWidth, live.offsetHeight] } : null;
  });
const homeDefaults = async (how) => {
  const g = grid(await last());
  check(`${how}: Home console keeps its 100×26 default`, g.cols === 100 && g.rows === 26, JSON.stringify(g));
  const m = await heroMirror();
  check(`${how}: the hero mirror is filled exactly`, m !== null && m.live[0] === m.placeholder[0] && m.live[1] === m.placeholder[1], JSON.stringify(m));
};
await page.locator(".header .wordmark").click();
await settle(1000);
check("logo navigates Home in the page", path() === "/");
await homeDefaults("Playground → Home");
await page.goto(`${base}/`);
await settle(1200);
await homeDefaults("Home loaded directly");
await page.locator('.header a[href="/playground"]').first().click();
await settle(1200);
check("back on the Playground, its size is still picked", path() === "/playground" && (await page.getByLabel("Console size").inputValue()) === "80x24" && grid(await last()).rows === 24, JSON.stringify(grid(await last())));
await page.goto(`${base}/playground`);
await settle(1200);
check("and after a reload", (await page.getByLabel("Console size").inputValue()) === "80x24" && grid(await last()).rows === 24, JSON.stringify(grid(await last())));
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
check("OpenCode: dialog code stays deferred on Home",!await page.evaluate(()=>performance.getEntriesByType("resource").some(e=>/\/SessionDialogs[-.]/.test(e.name))));
await press(["Control+x"]);check("OpenCode: the pending leader lists available continuations",(await last()).includes("Leader · ctrl+x"));await press(["Escape","/diff","Enter","d"]);check("OpenCode: diff source selection stays in the console",(await last()).includes("Diff source") && path()==="/opencode");await press(["Escape","q"]);
await press(["/mdl"]);
check("OpenCode: slash completion shows the native description without a palette shortcut",(await last()).includes("/models") && (await last()).includes("Switch model") && !(await last()).includes("ctrl+x m"),await last());
await press(["Enter"]);check("OpenCode: Enter runs the highlighted slash command",(await last()).includes("Switch model"));
await press(["Escape","@app/settings/page"]);
check("OpenCode: file menu searches the sandbox project",(await last()).includes("app/settings/page.tsx"),await last());
await press(["Enter"]);check("OpenCode: selecting a path attaches it without submitting",(await last()).includes("@app/settings/page.tsx") && !(await last()).includes("interrupt"),await last());
await press(["Control+u"]);
await page.evaluate(async()=>{const canvas=document.createElement("canvas");canvas.width=canvas.height=4;const ctx=canvas.getContext("2d");ctx.fillStyle="#4080ff";ctx.fillRect(0,0,4,4);const png=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));const transfer=new DataTransfer();transfer.items.add(new File([png],"fixture.png",{type:"image/png"}));document.dispatchEvent(new ClipboardEvent("paste",{bubbles:true,clipboardData:transfer}));});
await settle();check("OpenCode: pasting an image adds a removable prompt attachment",(await last()).includes("[Image 1]"),await last());await press(["Control+x","i"]);check("OpenCode: the image viewer preserves the prompt attachment",(await last()).includes("Image attachments") && (await last()).includes("fixture.png"));await press(["Escape","Control+u"]);
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
await press(["Escape", "Escape"]);
await press(["/terminal","Enter","pwd","Enter"]);check("OpenCode: terminal commands stay in the scripted pane",(await last()).includes("scripted sandbox") && (await last()).includes("$ pwd"),await last());await press(["Escape"]);
await press(["/exit", "Enter"]);
await settle(400);
check("OpenCode: /exit leaves a Restart in the connection panel", (await page.getAttribute(".pad-connect", "data-status")) === "exited" && (await padState()) !== "live", await page.getAttribute(".pad-connect", "data-status"));
const framesAtExit = await page.evaluate(() => window.__frames.length);
await page.locator(".pad-connect .status-action", { hasText: "Restart" }).click();
await settle(600);
const restarted = await last();
check("OpenCode: Restart repaints it and routes keys again", (await page.getAttribute(".pad-connect", "data-status")) === "sandbox" && (await padState()) === "live" && (await page.evaluate(() => window.__frames.length)) > framesAtExit && restarted.includes("Claude Opus") && !restarted.includes("/exit"), `${await page.getAttribute(".pad-connect", "data-status")} ${await padState()}\n${restarted.split("\n").slice(-12).join("\n")}`);


await page.goto(`${base}/`);
await settle(1000);
const hb = await last();
await page.locator(".split-console").click();
await press(["ArrowUp", "ArrowUp"]);
check("Home: clicking the preview routes ↑ to the console", (await last()) !== hb);

// Docs: client navigation replaces the title and description (duplicate sibling keys once stacked them up).
await page.goto(`${base}/docs/routing`);
await settle(500);
for (const slug of ["deploying", "styling", "turbolog-engine", "testing"]) {
  await page.locator(`.docs-sidebar a[href="/docs/${slug}"]`).first().click();
  await page.waitForURL(`**/docs/${slug}`);
  await settle(200);
}
const heads = await page.evaluate(() => ({ h1: document.querySelectorAll(".docs-main h1").length, desc: document.querySelectorAll(".docs-main .docs-desc").length, brand: document.querySelectorAll(".docs-main .turbolog-lockup").length }));
check("Docs: navigating keeps one title, one description, no stale lockup", heads.h1 === 1 && heads.desc === 1 && heads.brand === 0, JSON.stringify(heads));

// Docs: Enter reads the highlighted page, and the page itself scrolls.
await page.goto(`${base}/docs/routing`);
await settle(1000);
await page.locator(".console-pill").click();
await settle();
const docLines = (frame) => frame.replace(/[\u200b\u2060]/g, "").replace(/\n+$/, "").split("\n");
// The page column: right of the list's border, without the scrollbar.
const docPage = (frame) =>
  docLines(frame)
    .slice(0, -1)
    .filter((l) => l.includes("│"))
    .map((l) => [...l].slice([...l].indexOf("│") + 1, -1).join("").trim())
    .join("\n");
const docHints = (frame) => (docLines(frame).at(-1) ?? "").trim();
const docTop = docPage(await last());
check("Docs: the console opens on the page list", docTop.startsWith("Routing") && docHints(await last()).includes("Enter read"), await last());
await press(["Enter"]);
check("Docs: Enter shows the reading keys", /↑ ↓ scroll\s+Space page\s+← back\s+\/ search/.test(docHints(await last())), docHints(await last()));
await press(["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"]);
const docDown = docPage(await last());
check("Docs: ↓ scrolls the page", docDown !== docTop && docTop.split("\n").slice(5).join("\n").startsWith(docDown.split("\n").slice(0, 3).join("\n")), docDown);
await press(["Space"]);
const docSpace = docPage(await last());
check("Docs: Space pages down", docSpace !== docDown && !docSpace.includes("Routing"), docSpace);
await press(["PageUp", "PageUp"]);
check("Docs: PageUp goes back up", docPage(await last()) === docTop, docPage(await last()));
await press(["PageDown"]);
check("Docs: PageDown pages down", docPage(await last()) !== docTop);
await press(["Home"]);
check("Docs: Home returns to the top", docPage(await last()) === docTop);
await press(["End"]);
const docEnd = docPage(await last());
check("Docs: End jumps to the bottom", docEnd !== docTop && !docEnd.includes("Routing"));
await press(["g"]);
check("Docs: g returns to the top", docPage(await last()) === docTop);
await press(["Shift+G"]);
check("Docs: G jumps to the bottom", docPage(await last()) === docEnd);
check("Docs: scrolling the console leaves the website where it was", (await page.evaluate(() => scrollY)) === 0, String(await page.evaluate(() => scrollY)));
await press(["ArrowLeft"]);
check("Docs: ← goes back to the list", docHints(await last()).includes("Enter read"), docHints(await last()));
await press(["ArrowRight", "Escape"]);
check("Docs: → reads again and Esc goes back", docHints(await last()).includes("Enter read"), docHints(await last()));
await press(["ArrowRight", "Backspace"]);
check("Docs: ⌫ goes back to the list too", docHints(await last()).includes("Enter read"), docHints(await last()));

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
process.exit(failures ? 1 : 0);
