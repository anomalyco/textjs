import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { CellBuffer, extractStyledFrame, initYoga } from "@textjs/core";
import {
  applyViewportChoice,
  ConsoleMirror,
  defaultFocusPadMessages,
  devtoolsShortcutKeys,
  FocusPad,
  focusPadState,
  formatViewportChoice,
  keyLabel,
  parseViewportChoice,
  TextCanvas,
  ViewportControl,
  type FocusPadMessages,
} from "../src/dom/index";
import { activateFocusPad, FocusPadMessage, focusPadConsole, type FocusPadConsole, type FocusPadMessageProps, type FocusPadPress, type FocusPadState } from "../src/dom/FocusPad";
import type { ConsoleRoot } from "../src/root";
import { Box, Text } from "../src/index";
import { createTestRoot } from "./helpers";

describe("FocusPad activation", () => {
  const press = (over: Partial<FocusPadPress> & { interactive?: boolean } = {}) => {
    const e = {
      button: 0,
      ctrlKey: false,
      target: { closest: (sel: string) => (over.interactive && sel.includes("button") ? {} : null) } as unknown as EventTarget,
      prevented: false,
      preventDefault() {
        e.prevented = true;
      },
      ...over,
    };
    return e;
  };
  const sink = () => {
    const root = { focused: 0, input: { focus: () => void root.focused++ } };
    return root;
  };
  const opts = (root: ReturnType<typeof sink>, extra: { mac?: boolean; coarsePointer?: boolean } = {}) => ({ root: root as unknown as ConsoleRoot, mac: false, coarsePointer: false, ...extra });

  test("a primary press prevents mousedown's default (which would blur the sink) and focuses the input sink", () => {
    const root = sink();
    const e = press();
    expect(activateFocusPad(e, opts(root))).toBe(true);
    expect(e.prevented).toBe(true);
    expect(root.focused).toBe(1);
  });

  test("the pad's own controls, other buttons, ⌃-click on macOS and touch screens keep their defaults", () => {
    for (const [e, extra] of [
      [press({ interactive: true }), {}],
      [press({ button: 1 }), {}],
      [press({ button: 2 }), {}],
      [press({ ctrlKey: true }), { mac: true }],
      [press(), { coarsePointer: true }],
    ] as const) {
      const root = sink();
      expect(activateFocusPad(e, opts(root, extra))).toBe(false);
      expect(e.prevented).toBe(false);
      expect(root.focused).toBe(0);
    }
  });

  test("without a root or onActivate there is nothing to focus, so the default stays", () => {
    const e = press();
    expect(activateFocusPad(e, { root: null, mac: false, coarsePointer: false })).toBe(false);
    expect(e.prevented).toBe(false);
  });
});

describe("DOM companion", () => {
  test("ConsoleMirror renders a styled frame with optional DevTools chrome", () => {
    const buf = new CellBuffer(12, 2);
    buf.drawText(0, 0, "▼ Text.js", 0xff0000ff, 0x000000ff, 1);
    buf.drawText(0, 1, "100% <ok>", 0, 0);
    const frame = extractStyledFrame(buf);
    const html = renderToStaticMarkup(<ConsoleMirror frame={frame} chrome />);
    expect(html).toContain("Elements");
    expect(html).toContain("Console");
    expect(html).toContain("Sources");
    expect(html).toContain("Network");
    expect(html).toContain("text://viewport:1");
    expect(html).toContain("▼ Text.js");
    expect(html).toContain("font-weight:700");
    expect(html).toContain("100% &lt;ok&gt;");
    const plain = renderToStaticMarkup(<ConsoleMirror frame={null} />);
    expect(plain).toContain("Waiting for the first frame");
  });

  test("ConsoleMirror locks its geometry so no glyph can shift a row", () => {
    const buf = new CellBuffer(10, 3);
    buf.drawText(0, 1, "→ ✱ ┃ ▀", 0, 0);
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(buf)} lineHeight={14} />);
    expect(html).toContain("height:42px");
    expect(html).toContain("contain:layout paint style");
    expect(html).toContain("font-variant-ligatures:none");
    expect(html.match(/height:14px;line-height:14px;overflow:hidden;white-space:pre/g)?.length).toBe(3);
  });

  test("ConsoleMirror rows tile edge to edge (no horizontal scanline gaps)", () => {
    const buf = new CellBuffer(8, 3);
    for (let y = 0; y < 3; y++) buf.drawText(0, y, "████████", 0xffffffff, 0x0a0a0aff, 0);
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(buf)} lineHeight={15} />);
    // Rows are clipped to exactly one line box; spans fill the whole box.
    expect(html.match(/height:15px;line-height:15px;overflow:hidden/g)?.length).toBe(3);
    expect(html).toContain("display:inline-block;height:15px;line-height:15px;vertical-align:top");
    // The container is filled with the frame's dominant background, not a contrasting DevTools grey.
    expect(html).toMatch(/data-textjs-mirror="" style="[^"]*background:(#0a0a0a|rgb\(10, ?10, ?10\))/);
  });

  test("FocusPad: one calm click target with the DevTools shortcut and the app's keys", async () => {
    const pad = renderToStaticMarkup(<FocusPad root={null} title="my-app" hints={[{ keys: "↑ ↓", label: "count" }, { keys: "r", label: "reset" }]} />);
    expect(pad).toContain("my-app");
    expect(pad).toContain("Open the console");
    expect(pad).toContain("Then click here and press ↑ ↓.");
    expect(pad).toContain('aria-label="Step 1 of 3"');
    // The app's keys wait for the live state; before that the hero is the DevTools shortcut.
    expect(pad).not.toContain("count");
    expect(pad).toContain('aria-label="Press ⌘ ⌥ J"');
    expect(pad).toContain("Open on a desktop");
    // No viewport presets, pause toggles or on-page preview by default.
    for (const gone of ["80×24", "Pause", "Preview", "data-textjs-mirror"]) expect(pad).not.toContain(gone);
    // A banner leads the message on desktop and the notice on touch devices.
    const branded = renderToStaticMarkup(<FocusPad root={null} banner={<b>acme</b>} />);
    expect(branded.match(/<div class="tx-pad-banner"><b>acme<\/b><\/div>/g)?.length).toBe(2);
    expect(branded.indexOf(`class="tx-pad-banner"`)).toBeLessThan(branded.indexOf(`class="tx-pad-steps"`));
    expect(pad).not.toContain(`class="tx-pad-banner"`);
    const typed = renderToStaticMarkup(<FocusPad root={null} action="type a prompt" />);
    expect(typed).toContain("Then click here and type a prompt.");
    const canvas = renderToStaticMarkup(<TextCanvas app={<Text>hi</Text>} title="demo" theme="geistLight" />);
    expect(canvas).toContain("demo");
    expect(canvas).toContain("Open the console");
  });

  test("FocusPad message: the same four rows in every state", () => {
    const hints = [{ keys: "↑ ↓", label: "count" }, { keys: "r", label: "reset" }];
    const render = (state: FocusPadState, extra: Partial<FocusPadMessageProps> = {}): string =>
      renderToStaticMarkup(<FocusPadMessage state={state} hints={hints} doThis="press ↑ ↓" devtools="chromium-mac" {...extra} />);
    for (const state of ["open", "click", "live"] as const) {
      const html = render(state);
      for (const row of ["tx-pad-steps", "tx-pad-headline", "tx-pad-hero", "tx-pad-sub"]) expect(html.match(new RegExp(`class="${row}[" ]`, "g"))?.length).toBe(1);
      // Nothing fades in on the first paint.
      expect(html).not.toContain("tx-pad-in");
    }
    expect(render("open", { animate: true })).toContain('class="tx-pad-headline tx-pad-in"');

    const open = render("open");
    expect(open).toContain("Open the console");
    expect(open).toContain('<span class="tx-pad-seg" data-step="current">');
    expect(open).not.toContain("tx-pad-hints");

    const click = render("click");
    expect(click).toContain('aria-label="Step 2 of 3"');
    expect(click).toContain(">Click here</h2>");
    expect(click).toContain("<kbd>⌘⌥J</kbd> opens the console.");
    expect(click.match(/data-step="done"/g)?.length).toBe(1);

    // Live: the app's keys are the hero; the pressed one lights up, and keys without a hint are echoed below.
    const live = render("live", { lit: "↑", last: { label: "↑", n: 1 } });
    expect(live).toContain("Live in your console");
    expect(live.match(/data-step="done"/g)?.length).toBe(3);
    expect(live).toContain("count");
    expect(live).toContain(">R</kbd>");
    expect(live).toContain('<kbd class="tx-key tx-key-md" data-lit="" aria-label="↑">');
    expect(live).not.toContain("tx-pad-echo");
    expect(render("live", { last: { label: "Space", n: 2 } })).toContain('<span class="tx-pad-echo"><kbd class="tx-key">Space</kbd></span>');
    // Without hints there is nothing to show yet.
    expect(renderToStaticMarkup(<FocusPadMessage state="live" hints={[]} doThis="type" devtools="chromium-other" />)).toContain("Start typing.");
  });

  test("console size choices parse, persist and apply", async () => {
    expect(parseViewportChoice("fit")).toBe("fit");
    expect(parseViewportChoice(" 120×36 ")).toEqual({ cols: 120, rows: 36 });
    expect(parseViewportChoice("160x48")).toEqual({ cols: 160, rows: 48 });
    for (const bad of [null, "", "big", "5x5", "999x999", "80x"]) expect(parseViewportChoice(bad)).toBeNull();
    expect(formatViewportChoice({ cols: 80, rows: 24 })).toBe("80x24");
    expect(formatViewportChoice("fit")).toBe("fit");

    const t = await createTestRoot({ width: 40, height: 4 });
    applyViewportChoice(t.root, { cols: 50, rows: 6 });
    expect(t.root.viewport.getSnapshot()).toMatchObject({ cols: 50, rows: 6, responsive: false });
    applyViewportChoice(t.root, "fit");
    expect(t.root.viewport.getSnapshot().responsive).toBe(true);
    await t.unmount();

    // Opt-in on the pad: one quiet select, presets included.
    const pad = renderToStaticMarkup(<FocusPad root={null} sizeControl />);
    expect(pad).toContain('aria-label="Console size"');
    for (const s of ["Fit console", "80×24", "120×36", "160×48", "Custom…"]) expect(pad).toContain(s);
    expect(renderToStaticMarkup(<ViewportControl root={null} />)).toContain("Fit console");
  });

  test("the size select has an id and a name, so Chrome's Issues panel doesn't flag it", () => {
    const html = renderToStaticMarkup(
      <>
        <FocusPad root={null} sizeControl />
        <ViewportControl root={null} />
      </>,
    );
    const fields = html.match(/<(select|input|textarea)\b[^>]*>/g) ?? [];
    expect(fields.length).toBe(2);
    for (const f of fields) expect(f).toMatch(/ id="[^"]+".* name="textjs-console-size"/);
    const ids = fields.map((f) => / id="([^"]+)"/.exec(f)?.[1]);
    expect(new Set(ids).size).toBe(2);
  });

  test("FocusPad messages: English by default, any string replaceable", () => {
    const hints = [{ keys: "↑ ↓", label: "count" }];
    const pad = (props: Partial<Parameters<typeof FocusPad>[0]> = {}): string => renderToString(<FocusPad root={null} hints={hints} sizeControl {...props} />);
    // The defaults are the built-in strings, and keys left undefined keep them (renderToString: the hydration markup too).
    expect(pad({ messages: {} })).toBe(pad());
    expect(pad({ messages: defaultFocusPadMessages })).toBe(pad());
    expect(pad({ messages: { openConsole: undefined } })).toBe(pad());

    // A partial override replaces only its own strings.
    const partial = pad({ messages: { openConsole: "コンソールを開きます", fitConsole: "自動" } });
    expect(partial).toContain(">コンソールを開きます</h2>");
    expect(partial).not.toContain("Open the console");
    expect(partial).toContain("自動");
    expect(partial).not.toContain("Fit console");
    expect(partial).toContain("The app renders in DevTools.");
    expect(partial).toContain("Then click here and press ↑ ↓.");

    // Parameterized lines get whole sentences, with the words in any order.
    const ja: Partial<FocusPadMessages> = {
      step: (n, total) => `ステップ ${n}/${total}`,
      stepLive: "ライブ",
      pressShortcut: (keys) => `${keys} を押します`,
      then: (action) => <>次に、ここをクリックして{action}。</>,
      defaultAction: (keys) => (keys ? `${keys}を押します` : "入力します"),
      shortcutOpens: (shortcut) => <>{shortcut}でコンソールが開きます。</>,
      startTyping: "入力を始めます。",
      consoleSize: "コンソールのサイズ",
      custom: "カスタム",
    };
    const open = renderToStaticMarkup(<FocusPad root={null} hints={hints} messages={ja} sizeControl />);
    expect(open).toContain('aria-label="ステップ 1/3"');
    expect(open).toContain('aria-label="⌘ ⌥ J を押します"');
    expect(open).toContain('<span class="tx-pad-line">次に、ここをクリックして↑ ↓を押します。</span>');
    expect(open).toContain('aria-label="コンソールのサイズ"');
    expect(open).toContain("カスタム…");
    expect(renderToStaticMarkup(<FocusPad root={null} messages={ja} />)).toContain("次に、ここをクリックして入力します。");
    const m = { ...defaultFocusPadMessages, ...ja } as FocusPadMessages;
    expect(renderToStaticMarkup(<FocusPadMessage state="click" hints={[]} doThis="x" devtools="chromium-mac" messages={m} />)).toContain("<kbd>⌘⌥J</kbd>でコンソールが開きます。");
    const live = (h: typeof hints): string => renderToStaticMarkup(<FocusPadMessage state="live" hints={h} doThis="x" devtools="chromium-mac" messages={m} />);
    expect(live([])).toContain('aria-label="ライブ"');
    expect(live([])).toContain("入力を始めます。");

    // The space between two sentences is its own node, which Chinese and Japanese pages hide (Korean keeps it).
    expect(open.match(/<span class="tx-pad-gap"> <\/span>/g)?.length).toBe(1);
    expect(open).toContain(".tx-pad:is(:lang(ja),:lang(zh)) .tx-pad-gap{display:none}");
    expect(renderToStaticMarkup(<FocusPadMessage state="click" hints={[]} doThis="x" devtools="chromium-mac" />)).toContain('<span class="tx-pad-line">The app reads keys from this page.</span><span class="tx-pad-gap"> </span><span class="tx-pad-line"><kbd>⌘⌥J</kbd> opens the console.</span>');
    // Key sequences read left to right on right-to-left pages.
    expect(open).toContain(".tx-pad-keys,.tx-pad-hint>span,.tx-pad-echo,.tx-pad-line kbd{direction:ltr;unicode-bidi:isolate}");

    // The size control takes the pad's messages, and its own `messages` on top.
    const sized = renderToStaticMarkup(<FocusPad root={null} messages={ja} sizeControl={{ messages: { custom: "その他" } }} />);
    expect(sized).toContain('aria-label="コンソールのサイズ"');
    expect(sized).toContain("その他…");
    expect(renderToStaticMarkup(<ViewportControl root={null} messages={{ fitConsole: "自動" }} />)).toContain("自動");
    expect(renderToStaticMarkup(<TextCanvas app={<Text>hi</Text>} messages={{ openConsole: "開く" }} />)).toContain(">開く</h2>");
  });

  test("FocusPad gives each browser's console shortcut", () => {
    expect(focusPadConsole("chromium", true)).toBe("chromium-mac");
    expect(focusPadConsole(null, false)).toBe("chromium-other");
    expect(focusPadConsole("firefox", true)).toBe("firefox-mac");
    expect(focusPadConsole("firefox", false)).toBe("firefox-other");
    expect(focusPadConsole("safari", true)).toBe("safari");
    const open = (devtools: FocusPadConsole | null): string => renderToStaticMarkup(<FocusPadMessage state="open" hints={[]} doThis="press ↓" devtools={devtools} />);

    expect(open("firefox-mac")).toContain('aria-label="Press ⌘ ⌥ K"');
    expect(open("firefox-other")).toContain('aria-label="Press Ctrl Shift K"');
    expect(open("firefox-other")).toContain("The app renders in DevTools.");
    const safari = open("safari");
    expect(safari).toContain('aria-label="Press ⌘ ⌥ C"');
    expect(safari).toContain("First turn on “Show features for web developers” in Safari Settings → Advanced.");
    expect(safari).not.toContain("The app renders in DevTools.");
    expect(safari).toContain("Then click here and press ↓.");
    expect(renderToStaticMarkup(<FocusPadMessage state="click" hints={[]} doThis="type" devtools="firefox-mac" />)).toContain("<kbd>⌘⌥K</kbd> opens the console.");

    // Prerendered (and hydrating): every variant, tagged for html[data-os] and html[data-browser] to pick one.
    const all = open(null);
    for (const [cls, label] of [
      ["tx-br-chromium tx-os-mac", "⌘ ⌥ J"],
      ["tx-br-chromium tx-os-other", "Ctrl Shift J"],
      ["tx-br-firefox tx-os-mac", "⌘ ⌥ K"],
      ["tx-br-firefox tx-os-other", "Ctrl Shift K"],
      ["tx-br-safari", "⌘ ⌥ C"],
    ]) expect(all).toContain(`<div class="tx-pad-keys ${cls}" aria-label="Press ${label}">`);
    expect(all).toContain('<span class="tx-pad-line tx-not-safari">The app renders in DevTools.</span>');
    expect(all).toContain('<span class="tx-pad-line tx-br-safari">First turn on');
    // The click state's shortcut, too.
    const click = renderToStaticMarkup(<FocusPadMessage state="click" hints={[]} doThis="type" devtools={null} />);
    for (const [cls, keys] of [
      ["tx-br-chromium tx-os-mac", "⌘⌥J"],
      ["tx-br-chromium tx-os-other", "Ctrl+Shift+J"],
      ["tx-br-firefox tx-os-mac", "⌘⌥K"],
      ["tx-br-firefox tx-os-other", "Ctrl+Shift+K"],
      ["tx-br-safari", "⌘⌥C"],
    ]) expect(click).toContain(`<kbd class="${cls}">${keys}</kbd>`);
    expect(renderToStaticMarkup(<FocusPadMessage state="click" hints={[]} doThis="type" devtools="firefox-other" />)).toContain("<kbd>Ctrl+Shift+K</kbd> opens the console.");
    // FocusPad itself prerenders every variant.
    expect(renderToStaticMarkup(<FocusPad root={null} />).match(/class="tx-pad-keys /g)?.length).toBe(5);
  });

  test("FocusPad state: never blocks on DevTools detection", () => {
    const s = (o: Partial<Parameters<typeof focusPadState>[0]>) => focusPadState({ pageFocused: true, capturing: false, devtoolsLikelyOpen: false, keySeen: false, ...o });
    expect(s({})).toBe("open");
    // Focus moved into DevTools (or another window): ask for a click.
    expect(s({ pageFocused: false })).toBe("click");
    expect(s({ pageFocused: false, devtoolsLikelyOpen: true, capturing: true })).toBe("click");
    // DevTools docked but the page isn't routing keys yet.
    expect(s({ devtoolsLikelyOpen: true })).toBe("click");
    expect(s({ devtoolsLikelyOpen: true, capturing: true })).toBe("live");
    // Undocked DevTools can't be detected: the first keystroke proves it.
    expect(s({ capturing: true })).toBe("open");
    expect(s({ capturing: true, keySeen: true })).toBe("live");
  });

  test("keyLabel echoes keystrokes the way the hints spell them", () => {
    const k = (key: string, input = "", mods: { ctrl?: boolean } = {}) => keyLabel({ key, input, ctrl: mods.ctrl ?? false, meta: false, alt: false });
    expect(k("up")).toBe("↑");
    expect(k("return")).toBe("Enter");
    expect(k("space", " ")).toBe("Space");
    expect(k("r", "r")).toBe("r");
    expect(k("p", "", { ctrl: true })).toBe("Ctrl P");
    expect(devtoolsShortcutKeys()).toHaveLength(3);
  });

  test("FocusPad telemetry reads frames without re-rendering the console tree", async () => {
    await initYoga();
    const t = await createTestRoot({ width: 20, height: 2 });
    let renders = 0;
    function App() {
      renders++;
      return (
        <Box>
          <Text>console app</Text>
        </Box>
      );
    }
    await t.render(<App />);
    const seen: number[] = [];
    const off = t.root.onFrame((f) => seen.push(f.frameCount));
    const html = renderToStaticMarkup(<FocusPad root={t.root} title="x" showMirrorDefault />);
    expect(html).toContain("▼ x");
    await t.act(() => t.root.renderer.requestRender(true));
    t.frame();
    expect(seen.length).toBe(1);
    expect(renders).toBe(1);
    off();
    await t.unmount();
  });

  test("host intrinsics stay private: no global JSX.IntrinsicElements augmentation", () => {
    const src = fileURLToPath(new URL("../src", import.meta.url));
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(p);
      }
    };
    walk(src);
    for (const f of files) {
      const code = readFileSync(f, "utf8");
      expect(code).not.toMatch(/interface\s+IntrinsicElements/);
      expect(code).not.toMatch(/namespace\s+JSX/);
      expect(code).not.toMatch(/declare\s+global/);
    }
  });

  test("DOM styles never mix the border shorthand with per-side longhands (React warns on every re-render)", () => {
    const dir = fileURLToPath(new URL("../src/dom/", import.meta.url));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(join(dir, file), "utf8");
      expect({ file, longhand: /border(Top|Right|Bottom|Left)(Width|Color|Style)\s*:/.test(src) }).toEqual({ file, longhand: false });
    }
  });
});
