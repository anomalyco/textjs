#!/usr/bin/env node
/**
 * Headful Windows check of the textjs.org site (CI serves this checkout's build
 * with `vite preview`) in Chrome or Edge with DevTools docked at the bottom on
 * the Console panel.
 *
 * Input is real: clicks and keys go through SendInput (os-input.ps1), never CDP.
 * CDP only observes: it logs the page's raw keyboard events, counts the frames
 * the app logs, and measures the console in the DevTools frontend.
 *
 *   node scripts/windows/browser-check.mjs --browser chrome|edge --out <dir> [--origin http://localhost:4173] [--layouts us,de,ja]
 *
 * Writes <out>/<browser>-*.png screenshots and <out>/<browser>.json results.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const BROWSER = opt("browser", "chrome");
const OUT = resolve(opt("out", "windows-artifacts"));
const ORIGIN = opt("origin", "http://localhost:4173");
const LAYOUTS = opt("layouts", "us,de,intl,ja").split(",");
const PORT = 9333;
const PS = join(import.meta.dirname, "os-input.ps1");
mkdirSync(OUT, { recursive: true });

const EXE = {
  chrome: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"],
  edge: ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"],
}[BROWSER].find((p) => existsSync(p));
if (!EXE) throw new Error(`${BROWSER} not found`);

const results = { browser: BROWSER, exe: EXE, origin: ORIGIN, checks: [], pages: {}, keys: {} };
const checkResult = (name, ok, detail) => {
  results.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${BROWSER} ${name}${detail !== undefined ? `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function os(...args) {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS, ...args.map(String)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`os-input ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

// ---------------------------------------------------------------------------
// CDP (observation only)
// ---------------------------------------------------------------------------

class Cdp {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((ok, fail) => {
      ws.onopen = ok;
      ws.onerror = () => fail(new Error(`CDP connect failed: ${url}`));
    });
    return new Cdp(ws);
  }
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data));
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p?.fail(new Error(`${p.method}: ${msg.error.message}`));
        else p?.ok(msg.result);
      } else for (const h of this.handlers.get(msg.method) ?? []) h(msg.params);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => this.pending.set(id, { ok, fail, method }));
  }
  on(method, fn) {
    this.handlers.set(method, [...(this.handlers.get(method) ?? []), fn]);
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

const targets = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();

// Raw keyboard, input and composition events, plus where the last mouse move landed.
const KEYLOG = `(() => {
  const log = (window.__keylog = []);
  for (const t of ["keydown", "keyup", "beforeinput", "input", "compositionstart", "compositionupdate", "compositionend"]) {
    addEventListener(t, (e) => {
      const row = { t, key: e.key, code: e.code, keyCode: e.keyCode, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey,
        altGraph: e.getModifierState ? e.getModifierState("AltGraph") : undefined, composing: e.isComposing, data: e.data, inputType: e.inputType,
        target: e.target && e.target.tagName };
      log.push(row);
      setTimeout(() => (row.prevented = e.defaultPrevented), 0);
    }, true);
  }
  const describe = (el) => el && el.tagName ? el.tagName + (el.id ? "#" + el.id : "") + (el.hasAttribute && el.hasAttribute("data-textjs-input-sink") ? "[sink]" : "") + (typeof el.className === "string" && el.className ? "." + el.className.split(" ").join(".") : "") : String(el);
  window.__describe = describe;
  for (const t of ["focusin", "focusout", "mousedown", "click"]) addEventListener(t, (e) => log.push({ t, target: describe(e.target), related: e.relatedTarget ? describe(e.relatedTarget) : undefined }), true);
  addEventListener("mousemove", (e) => (window.__mouse = { sx: e.screenX, sy: e.screenY, cx: e.clientX, cy: e.clientY }), true);
})()`;

// Runs in the DevTools frontend: measure the console's last frame message.
const MEASURE = `(() => {
  const all = [];
  const walk = (root) => { for (const el of root.querySelectorAll("*")) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  walk(document);
  const msgs = all.filter((e) => e.classList && e.classList.contains("console-message-text"));
  const frames = msgs.filter((m) => (m.innerText || "").split("\\n").length > 3);
  const last = frames[frames.length - 1];
  const view = all.find((e) => e.id === "console-messages") || all.find((e) => e.classList && e.classList.contains("console-view"));
  if (!last) return { messages: msgs.length, frames: 0 };
  window.__lastFrame = last;
  const box = last.getBoundingClientRect();
  const viewBox = view ? view.getBoundingClientRect() : null;
  let right = 0;
  const spans = last.querySelectorAll("span");
  for (const s of spans) for (const r of s.getClientRects()) right = Math.max(right, r.right);
  const text = last.innerText;
  const rows = text.split("\\n");
  // The frame's font: the span drawing the most visible letters and digits (leading spans are zero-width).
  const glyphs = (el) => (el.textContent.match(/[A-Za-z0-9]/g) || []).length;
  const textSpan = [...spans].filter((s) => s.children.length === 0 && s.getBoundingClientRect().width > 0).sort((a, b) => glyphs(b) - glyphs(a))[0] || last;
  window.__fontSpan = textSpan;
  const cs = getComputedStyle(textSpan);
  return {
    messages: msgs.length,
    frames: frames.length,
    rows: rows.length,
    cols: Math.max(...rows.map((r) => [...r].length)),
    height: Math.round(box.height),
    rowHeight: +(box.height / rows.length).toFixed(2),
    lineHeight: cs.lineHeight,
    fontSize: cs.fontSize,
    fontFamily: cs.fontFamily,
    fontSample: textSpan.textContent.trim().slice(0, 40),
    messageWidth: Math.round(box.width),
    scrollWidth: last.scrollWidth,
    clientWidth: last.clientWidth,
    rightmostGlyph: Math.round(right),
    viewRight: viewBox && Math.round(viewBox.right),
    viewWidth: viewBox && Math.round(viewBox.width),
    viewScrollWidth: view && view.scrollWidth,
    viewClientWidth: view && view.clientWidth,
    dock: (() => { try { return localStorage.getItem("currentDockState"); } catch { return null; } })(),
    panel: (document.querySelector(".tabbed-pane-header-tab.selected") || {}).id || null,
  };
})()`;

async function measureDevtools() {
  const fe = (await targets()).find((t) => t.url.startsWith("devtools://"));
  if (!fe) return { error: "DevTools frontend target not found" };
  const c = await Cdp.connect(fe.webSocketDebuggerUrl);
  try {
    const m = await c.eval(MEASURE);
    if (m.frames) {
      // Which font the OS actually drew the frame with.
      await c.send("DOM.enable");
      await c.send("CSS.enable");
      await c.send("DOM.getDocument", { depth: -1, pierce: true });
      const { result } = await c.send("Runtime.evaluate", { expression: "window.__fontSpan" });
      const { nodeId } = await c.send("DOM.requestNode", { objectId: result.objectId });
      const { fonts } = await c.send("CSS.getPlatformFontsForNode", { nodeId });
      m.platformFonts = fonts;
    }
    return m;
  } catch (error) {
    return { error: String(error) };
  } finally {
    c.close();
  }
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

const profile = join(process.env.RUNNER_TEMP ?? OUT, `profile-${BROWSER}`);
rmSync(profile, { recursive: true, force: true });
mkdirSync(join(profile, "Default"), { recursive: true });
writeFileSync(
  join(profile, "Default", "Preferences"),
  JSON.stringify({
    devtools: { preferences: { currentDockState: '"bottom"', "panel-selectedTab": '"console"', "panel-selected-tab": '"console"', "inspector.drawer-split-view-state": '{"horizontal":{"size":0,"showMode":"OnlyMain"}}' } },
    browser: { has_seen_welcome_page: true },
  }),
);

const proc = spawn(
  EXE,
  [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    "--remote-allow-origins=*",
    "--auto-open-devtools-for-tabs",
    "--start-maximized",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-features=Translate,msEdgeWelcomePage,msImplicitSignin,msEdgeDevToolsWelcomeTab",
    "about:blank",
  ],
  { stdio: "ignore", detached: false },
);

let page;
let frames = 0;
let lastFrame = "";
async function main() {
  let pageTarget;
  for (let i = 0; i < 60 && !pageTarget; i++) {
    await sleep(500);
    pageTarget = await targets()
      .then((list) => list.find((t) => t.type === "page" && !t.url.startsWith("devtools://")))
      .catch(() => undefined);
  }
  if (!pageTarget) throw new Error("no page target");
  page = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
  page.on("Runtime.consoleAPICalled", (p) => {
    const first = p.args[0];
    if (p.type === "log" && first?.type === "string" && first.value.split("\n").length > 3) {
      frames++;
      lastFrame = first.value.replace(/%c/g, "");
    }
  });
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: KEYLOG });
  results.version = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).Browser;
  console.log(results.version);

  for (const path of ["/playground", "/coffee", "/opencode"]) await visit(path);
  await visit("/playground", false);
  await keys(LAYOUTS);
}

/** Wait (up to 30s) for the app's first frame, then until frames stop for 1s (at most 3s more: demos animate). */
async function waitForFrame() {
  const deadline = Date.now() + 30_000;
  while (frames === 0 && Date.now() < deadline) await sleep(100);
  const settleBy = Date.now() + 3000;
  let seen = frames;
  let quietSince = Date.now();
  while (Date.now() < settleBy && Date.now() - quietSince < 1000) {
    await sleep(100);
    if (frames !== seen) {
      seen = frames;
      quietSince = Date.now();
    }
  }
}

let consoleOpened = false;
async function visit(path, shoot = true) {
  frames = 0;
  lastFrame = "";
  await page.send("Page.navigate", { url: `${ORIGIN}${path}` });
  await waitForFrame();
  console.log(`focus: ${os("focus", proc.pid)}`);
  await sleep(800);
  if (!consoleOpened) {
    // DevTools may open on Elements (Chrome) or Welcome (Edge): select its Console tab.
    // (Ctrl+Shift+J toggles DevTools closed when it is already open.)
    consoleOpened = true;
    const fe = (await targets()).find((t) => t.url.startsWith("devtools://"));
    if (fe) {
      const c = await Cdp.connect(fe.webSocketDebuggerUrl);
      const clicked = await c
        .eval(`(() => { const find = (root) => { for (const el of root.querySelectorAll("*")) { if (el.id === "tab-console") return el; if (el.shadowRoot) { const f = find(el.shadowRoot); if (f) return f; } } return null; }; const tab = find(document); if (!tab) return false; tab.click(); return true; })()`)
        .catch((error) => String(error));
      console.log(`console tab: ${clicked}`);
      c.close();
      await sleep(1500);
    } else console.log("console tab: no DevTools frontend target");
  }
  if (!shoot) return;
  const name = path.slice(1);
  const size = os("screenshot", join(OUT, `${BROWSER}-${name}.png`));
  const m = await measureDevtools();
  const win = await page.eval("({ innerWidth, innerHeight, outerWidth, outerHeight, dpr: devicePixelRatio })");
  results.pages[path] = { screen: size, window: win, framesLogged: frames, console: m, frame: lastFrame.split("\n").slice(0, 60).join("\n") };
  console.log(`${path}: ${frames} frames, screen ${size}`, JSON.stringify(m));
  checkResult(`${path} renders frames`, frames > 0, `${frames} frames`);
  if (m.error || !m.frames) {
    checkResult(`${path} console measured`, false, m.error ?? "no frame message in the DevTools console");
    return;
  }
  checkResult(`${path} DevTools docked bottom`, win.innerHeight < win.outerHeight - 200 && Math.abs(win.outerWidth - win.innerWidth) < 40, win);
  checkResult(`${path} no horizontal overflow`, m.scrollWidth <= m.clientWidth + 1 && (m.viewScrollWidth ?? 0) <= (m.viewClientWidth ?? 0) + 1, { scrollWidth: m.scrollWidth, clientWidth: m.clientWidth, view: [m.viewScrollWidth, m.viewClientWidth] });
  checkResult(`${path} frame inside the console`, m.viewRight === null || m.rightmostGlyph <= m.viewRight, { rightmostGlyph: m.rightmostGlyph, viewRight: m.viewRight });
  const lh = parseFloat(m.lineHeight);
  // A wrapped row doubles its height; Text.js tightens rows below the spans' line-height, so only taller is wrong.
  checkResult(`${path} rows don't wrap`, !Number.isFinite(lh) || m.rowHeight <= lh + 1, { rowHeight: m.rowHeight, lineHeight: m.lineHeight, rows: m.rows });
  const font = (m.platformFonts ?? []).sort((a, b) => b.glyphCount - a.glyphCount)[0]?.familyName;
  checkResult(`${path} drawn in Cascadia Mono or Consolas`, font === "Cascadia Mono" || font === "Consolas", { sample: m.fontSample, fonts: m.platformFonts });
}

/** Send a key sequence and report what the page saw and whether the app redrew. */
async function press(label, seq, wait = 700) {
  await page.eval("window.__keylog.length = 0");
  const before = { frames, lastFrame };
  os("keys", seq);
  await sleep(wait);
  const events = await page.eval("window.__keylog");
  const redrew = frames > before.frames && lastFrame !== before.lastFrame;
  return { label, seq, redrew, events };
}

async function keys(layouts) {
  const check = checkResult;
  // Find where the page viewport sits on screen from a real mouse move, then click the console pad.
  const win = await page.eval("({ x: screenX, y: screenY, w: outerWidth })");
  os("move", win.x + Math.round(win.w / 2), win.y + 220);
  await sleep(300);
  const mouse = await page.eval("window.__mouse || null");
  const pad = await page.eval(`(() => { const el = document.querySelector(".pad, .tx-pad"); const r = (el || document.body).getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.max(40, Math.min(r.top + r.height / 2, innerHeight - 30)), cls: el && el.className }; })()`);
  const dx = mouse ? mouse.sx - mouse.cx : win.x + 8;
  const dy = mouse ? mouse.sy - mouse.cy : win.y + 90;
  await page.eval("window.__keylog.length = 0");
  os("click", Math.round(dx + pad.x), Math.round(dy + pad.y));
  await sleep(800);
  const focus = await page.eval(`({ hasFocus: document.hasFocus(), active: __describe(document.activeElement), finePointer: matchMedia("(pointer: fine)").matches, events: __keylog.slice() })`);
  results.focus = { mouse, pad, focus };
  check("page focused after click", focus.hasFocus, focus.active);
  // IMEs and dead keys only compose in an editable element: Text.js's hidden textarea.
  check("input sink focused after click", focus.active.includes("[sink]"), { active: focus.active, finePointer: focus.finePointer, events: focus.events.map((e) => `${e.t}:${e.target}`) });

  for (const layout of layouts) {
    const rows = [];
    if (layout === "us") {
      os("layout", "00000409");
      for (const [label, seq] of [
        ["↓", "down"],
        ["↑", "up"],
        ["Tab", "tab"],
        ["Enter", "enter"],
        ["Esc", "esc"],
        ["Backspace", "backspace"],
        ["letters", "text:hjkl"],
      ])
        rows.push(await press(label, seq));
      os("screenshot", join(OUT, `${BROWSER}-keys-us.png`));
      for (const r of rows) {
        const down = r.events.filter((e) => e.t === "keydown");
        check(`keys us ${r.label} reaches the page`, down.length > 0, down.map((e) => `${e.key}/${e.code}${e.prevented ? " prevented" : ""}`).join(" "));
      }
      check("keys us app redraws on ↑/↓/Tab/Enter/Esc", rows.slice(0, 5).some((r) => r.redrew), rows.map((r) => `${r.label}:${r.redrew}`).join(" "));
    } else if (layout === "de") {
      const hkl = os("layout", "00000407");
      // Physical keys: Y (→ z on German), AltGr+Q (@), AltGr+7 ({), AltGr+E (€), AltGr+8 ([).
      for (const [label, seq, expect] of [
        ["Y position", "y", "z"],
        ["AltGr+Q", "altgr+q", "@"],
        ["AltGr+7", "altgr+7", "{"],
        ["AltGr+E", "altgr+e", "€"],
        ["AltGr+8", "altgr+8", "["],
      ]) {
        const r = await press(label, seq, 500);
        const hit = r.events.find((e) => e.t === "keydown" && e.key === expect);
        rows.push({ ...r, expect, hit });
      }
      results.keys.deLayout = hkl;
      for (const r of rows) check(`keys de ${r.label} → ${r.expect}`, Boolean(r.hit), r.hit ?? r.events.filter((e) => e.t === "keydown").map((e) => e.key).join(" "));
      os("layout", "00000409");
    } else if (layout === "intl") {
      // US-International: ' is a dead key, so ' then e commits é.
      os("layout", "00020409");
      const seen = (r) => r.events.some((e) => (e.t === "input" || e.t === "compositionend") && e.data === "é");
      const focused = await press("dead key ' e (sink focused)", "quote,e", 600);
      rows.push(focused);
      check("keys intl dead key commits é", seen(focused), focused.events.map((e) => `${e.t}:${e.key ?? ""}${e.data ? `(${e.data})` : ""}@${e.target}`).join(" "));
      // Informational: the same keys with focus on <body>, as before the FocusPad fix.
      await page.eval("document.activeElement && document.activeElement.blur()");
      const unfocused = await press("dead key ' e (body focused)", "quote,e", 600);
      rows.push(unfocused);
      results.keys.deadKeyWithoutSink = { committed: seen(unfocused), keydown: unfocused.events.filter((e) => e.t === "keydown").map((e) => e.key) };
      console.log(`dead key with <body> focused: ${JSON.stringify(results.keys.deadKeyWithoutSink)}`);
      os("layout", "00000409");
      // Put focus back where a click leaves it.
      os("click", Math.round(dx + pad.x), Math.round(dy + pad.y));
      await sleep(500);
    } else if (layout === "ja") {
      const hkl = os("layout", "04110411");
      results.keys.jaLayout = hkl;
      if (!hkl.endsWith("0411")) {
        check("keys ja Microsoft IME available", false, `layout stayed ${hkl}`);
        continue;
      }
      // IME on (VK_IME_ON, then Alt+` as a fallback), type nihon, convert, commit.
      rows.push(await press("IME on", "vk:16", 400));
      let r = await press("type nihon", "text:nihon", 800);
      if (!r.events.some((e) => e.t.startsWith("composition"))) {
        rows.push(r);
        rows.push(await press("IME toggle alt+`", "alt+backtick", 400));
        r = await press("type nihon", "text:nihon", 800);
      }
      rows.push(r);
      rows.push(await press("convert", "space", 800));
      rows.push(await press("commit", "enter", 800));
      os("screenshot", join(OUT, `${BROWSER}-keys-ja.png`));
      const all = rows.flatMap((x) => x.events);
      const committed = all.filter((e) => e.t === "compositionend" && typeof e.data === "string" && e.data.length > 0).map((e) => e.data);
      check("keys ja IME commits text", committed.length > 0, committed.join(" ") || all.map((e) => `${e.t}:${e.key ?? e.data}`).slice(0, 20).join(" "));
      os("layout", "00000409");
    }
    results.keys[layout] = rows.map(({ label, seq, redrew, events, expect }) => ({ label, seq, redrew, expect, events }));
  }
}

try {
  await main();
} catch (error) {
  checkResult("run", false, String(error?.stack ?? error));
  try {
    os("screenshot", join(OUT, `${BROWSER}-error.png`));
  } catch {}
} finally {
  writeFileSync(join(OUT, `${BROWSER}.json`), JSON.stringify(results, null, 2));
  page?.close();
  spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  const failed = results.checks.filter((c) => !c.ok);
  console.log(`\n${BROWSER}: ${results.checks.length - failed.length}/${results.checks.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}
