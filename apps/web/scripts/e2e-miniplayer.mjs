// Headless E2E for the chapter video's mini player: play (muted), scroll the slot out of view, and the same <video>
// floats in the corner while playback continues; scroll back and it docks with no layout shift. Also covers the
// captions toggle, Esc, "Back to video", chapter navigation and the compact bar on phones.
//
//   bun run build && bun run preview   (or: bun run dev)
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:3000 node scripts/e2e-miniplayer.mjs
//
// media.textjs.org only allows CORS from textjs.org and localhost:3000. On another port, point MEDIA at a folder with
// getting-started-720p.mp4, getting-started-poster.jpg and getting-started.vtt and the requests are served from it.
// Playwright's Chromium has no H.264: CHANNEL=chrome runs the installed Google Chrome. SHOTS=dir saves screenshots.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = process.env.BASE ?? "http://localhost:3000";
const port = new URL(base).port;
const media = process.env.MEDIA;
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {}) });

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n  ${detail}`}`);
  if (!ok) failures++;
};

function serveMedia(route) {
  const url = new URL(route.request().url());
  const name = url.pathname.endsWith(".mp4") ? "getting-started-720p.mp4" : url.pathname.endsWith(".jpg") ? "getting-started-poster.jpg" : "getting-started.vtt";
  const body = readFileSync(join(media, name));
  const type = name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".jpg") ? "image/jpeg" : "text/vtt";
  const headers = { "content-type": type, "access-control-allow-origin": "*", "accept-ranges": "bytes" };
  const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? "");
  if (!range) return route.fulfill({ status: 200, headers, body });
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  return route.fulfill({ status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
}

async function open(viewport, mobile = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  // Never reach a real local OpenCode server from tests.
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  if (media) await page.route("https://media.textjs.org/**", serveMedia);
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__shifts.push({ value: e.value, input: e.hadRecentInput });
    }).observe({ type: "layout-shift", buffered: true });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page, errors };
}

const state = (page) =>
  page.evaluate(() => {
    const v = document.querySelector(".learn-video video");
    const player = document.querySelector(".learn-video-player");
    const frame = document.querySelector(".learn-video-frame");
    const r = player.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const pill = document.querySelector(".console-pill");
    const p = pill && getComputedStyle(pill).display !== "none" ? pill.getBoundingClientRect() : null;
    return {
      same: v === window.__video,
      floating: player.classList.contains("floating"),
      compact: player.classList.contains("compact"),
      position: getComputedStyle(player).position,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height, right: innerWidth - r.right, bottom: innerHeight - r.bottom },
      frame: { top: f.top + scrollY, h: f.height },
      outlineTop: document.querySelector(".learn-outline").getBoundingClientRect().top + scrollY,
      pillOverlap: p ? !(r.right <= p.left || r.left >= p.right || r.bottom <= p.top || r.top >= p.bottom) : false,
      time: v.currentTime,
      paused: v.paused,
      controls: v.controls,
      captions: v.textTracks[0]?.mode,
      ccPressed: [...document.querySelectorAll(".learn-video-cc, .learn-mini-cc")].map((b) => b.getAttribute("aria-pressed")),
      active: document.activeElement === v ? "video" : document.activeElement === frame ? "frame" : (document.activeElement?.className ?? ""),
      shifts: window.__shifts.filter((s) => !s.input).reduce((a, s) => a + s.value, 0),
    };
  });

/** Play muted from the top of a chapter; resolves once the video is running. */
async function play(page) {
  await page.waitForSelector(".learn-video video");
  const codec = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028"'));
  if (!codec) throw new Error("This browser can't play H.264: run with CHANNEL=chrome");
  await page.evaluate(async () => {
    const v = document.querySelector(".learn-video video");
    window.__video = v;
    v.muted = true;
    await v.play();
  });
  await page.waitForFunction(() => window.__video.currentTime > 0.3, null, { timeout: 15_000 });
}

async function scrollTo(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(500);
}

async function advancing(page) {
  const a = (await state(page)).time;
  await page.waitForTimeout(1000);
  const b = await state(page);
  return { ok: b.time > a + 0.5 && !b.paused, detail: `${a.toFixed(2)}s → ${b.time.toFixed(2)}s, paused=${b.paused}` };
}

// Desktop: 1440 × 900.
{
  const { context, page, errors } = await open({ width: 1440, height: 900 });
  await page.goto(`${base}/learn/getting-started`);
  await page.waitForSelector(".learn-video video");
  await page.waitForTimeout(800);
  const docked = await state(page).catch(() => null);
  if (shots) await page.screenshot({ path: join(shots, "1440-docked.png") });
  check("captions are off by default", docked?.ccPressed.join() === "false" && docked.captions !== "showing", JSON.stringify(docked?.ccPressed));

  await play(page);
  const before = await state(page);
  await scrollTo(page, 1400);
  let s = await state(page);
  check("floats once playing and scrolled out of view", s.floating && s.position === "fixed", JSON.stringify(s));
  check("it's the same <video> element", s.same);
  const run = await advancing(page);
  check("playback keeps going while floating", run.ok, run.detail);
  check("docks bottom-right, 320–400px wide", s.rect.right === 20 && s.rect.w >= 320 && s.rect.w <= 400 && s.rect.bottom > 40, JSON.stringify(s.rect));
  check("clears the Console pill", !s.pillOverlap);
  check("the slot keeps its space", s.frame.h === before.frame.h && s.outlineTop === before.outlineTop, `${before.frame.h}/${before.outlineTop} → ${s.frame.h}/${s.outlineTop}`);
  check("native controls stay on the desktop floater", s.controls);
  if (shots) await page.screenshot({ path: join(shots, "1440-floating.png") });

  // Captions from the mini player, kept in sync with the native controls and remembered.
  await page.getByRole("button", { name: "CC", exact: true }).click();
  s = await state(page);
  check("CC turns captions on, everywhere", s.captions === "showing" && s.ccPressed.every((p) => p === "true"), JSON.stringify(s));
  if (shots) await page.screenshot({ path: join(shots, "1440-floating-captions.png") });
  await page.evaluate(() => (document.querySelector(".learn-video video").textTracks[0].mode = "hidden"));
  await page.waitForTimeout(200);
  s = await state(page);
  check("the buttons follow captions changed from the native controls", s.ccPressed.every((p) => p === "false"), JSON.stringify(s.ccPressed));
  await page.getByRole("button", { name: "CC", exact: true }).click();
  check("the choice is saved", (await page.evaluate(() => localStorage.getItem("textjs:learn-captions"))) === "on");

  // Native Picture-in-Picture (where the browser has it) takes over from the mini player, which returns after.
  const pipButton = page.getByRole("button", { name: "Picture-in-Picture" });
  if (await pipButton.count()) {
    await pipButton.click();
    const entered = await page.waitForFunction(() => document.pictureInPictureElement === window.__video, null, { timeout: 3000 }).then(() => true, () => false);
    if (entered) {
      await page.waitForTimeout(200);
      check("native Picture-in-Picture replaces the mini player", !(await state(page)).floating);
      await page.evaluate(() => document.exitPictureInPicture());
      await page.waitForTimeout(300);
      check("…and the mini player returns when it closes", (await state(page)).floating);
    } else console.log("- this browser didn't open Picture-in-Picture; skipped");
  }

  // Pause from the mini player: it stays up so it can be resumed.
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  s = await state(page);
  check("pause keeps the mini player up", s.floating && s.paused);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(300);
  check("play resumes it", !(await state(page)).paused);

  // Esc closes: pauses and returns the video to its slot.
  await page.locator(".learn-mini-btn[aria-label='Close mini player']").focus();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  s = await state(page);
  check("Esc closes and pauses it", !s.floating && s.paused, JSON.stringify(s));
  check("focus moves to the video, not <body>", s.active === "video" || s.active === "frame", s.active);

  // Back to video: scrolls to the slot and docks there, still playing.
  await page.evaluate(() => window.__video.play());
  await page.waitForTimeout(400);
  check("playing again floats it again", (await state(page)).floating);
  await page.getByRole("button", { name: /back to video/ }).click();
  await page.waitForTimeout(1200);
  s = await state(page);
  check("back to video docks it in view, still playing", !s.floating && !s.paused && s.frame.top - (await page.evaluate(() => scrollY)) < 900, JSON.stringify(s));
  check("focus stays on the video", s.active === "video" || s.active === "frame", s.active);

  // Scroll away and back: no layout shift either way.
  await scrollTo(page, 1400);
  check("floats again on scroll", (await state(page)).floating);
  await page.evaluate(() => (window.__shifts.length = 0));
  await scrollTo(page, 0);
  s = await state(page);
  check("scrolling back docks it", !s.floating && s.position !== "fixed" && s.same);
  check("…with no layout shift", s.shifts === 0 && s.frame.h === before.frame.h && s.outlineTop === before.outlineTop, `CLS ${s.shifts}, ${s.frame.h}/${s.outlineTop}`);
  const docked2 = await advancing(page);
  check("and keeps playing in its slot", docked2.ok, docked2.detail);
  await page.evaluate(() => window.__video.pause());

  // A new chapter stops the video and removes the floater.
  await page.evaluate(() => window.__video.play());
  await scrollTo(page, 1400);
  check("floating before navigating", (await state(page)).floating);
  await page.evaluate(() => document.querySelector('a[href="/learn/layout"]').click());
  await page.waitForURL("**/learn/layout");
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ floaters: document.querySelectorAll(".learn-video-player.floating").length, oldPaused: window.__video.paused, attached: window.__video.isConnected }));
  check("another chapter stops it and removes the floater", after.floaters === 0 && after.oldPaused && !after.attached, JSON.stringify(after));
  check("captions are remembered on the next chapter", (await page.locator(".learn-video-cc").getAttribute("aria-pressed")) === "true");

  check("no page errors (desktop)", errors.length === 0, errors.join("\n"));
  await context.close();
}

// Phone: 390 × 844, the compact bottom bar.
{
  const { context, page, errors } = await open({ width: 390, height: 844 }, true);
  await page.goto(`${base}/learn/getting-started`);
  await page.waitForSelector(".learn-video video");
  await page.waitForTimeout(800);
  if (shots) await page.screenshot({ path: join(shots, "390-docked.png") });
  await play(page);
  const before = await state(page);
  await scrollTo(page, 1400);
  const s = await state(page);
  check("phone: floats as a compact bar along the bottom", s.floating && s.compact && s.rect.x === 8 && s.rect.right === 8, JSON.stringify(s.rect));
  check("phone: the bar hides the native controls", !s.controls);
  const run = await advancing(page);
  check("phone: playback keeps going", run.ok, run.detail);
  if (shots) await page.screenshot({ path: join(shots, "390-floating.png") });
  await scrollTo(page, 0);
  const d = await state(page);
  check("phone: docks with its controls back and no layout shift", !d.floating && d.controls && d.shifts === 0 && d.outlineTop === before.outlineTop, JSON.stringify(d));
  check("no page errors (phone)", errors.length === 0, errors.join("\n"));
  await context.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
