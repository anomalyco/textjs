import { msg } from "../i18n/t";

/** Each post's summary, by slug. Kept apart from `POSTS_META` so every page's router can title a post without loading them. */
export const POST_SUMMARIES: Readonly<Record<string, string>> = {
  "text-js-1-0": msg("Text.js 1.0 is stable. It renders React 19 and App Router apps in the DevTools console with one console.log per frame."),
  "the-inverted-architecture": msg("How a React commit becomes one console.log call in DevTools."),
  "turbolog-eliminating-the-flash": msg("Clearing the console before every frame left it visibly blank in 70–81% of DevTools paints. Appending frames brought that to 1%, all of it on the first frame."),
  "right-to-left-text": msg("Text.js implements the Unicode Bidirectional Algorithm and passes all 770,241 BidiTest.txt cases. Hebrew and Arabic render in visual order with Arabic shaping, aligned to the cell grid."),
  "keyboard-shortcuts-with-usekeymap": msg("Declare a binding once with useKeymap, and Text.js routes the key, lists it in a ? help screen, shows it in the footer and adds it to a Ctrl+K command palette."),
  "server-rendering-in-the-console": msg("Text.js 0.4 can render a page on the server and stream its frames to the console as cell deltas. Static routes also prerender their first frame into the HTML."),
  "figlet-fonts": msg("@textjs/font parses FIGlet .flf fonts and lays them out like the figlet program. Its tests replay 273 outputs recorded from figlet 2.2.5, and all of them match."),
  "laying-out-the-console-with-yoga": msg("Text.js runs Yoga in WebAssembly with a point scale factor of 1, so every box lands on a whole cell. Text is segmented with Intl.Segmenter and measured in cells."),
  "text-js-0-1": msg("Text.js 0.1 brings a React 19 reconciler, Yoga layout and a file-system App Router to apps that render in the DevTools console."),
  "rendering-react-into-console-log": msg("Text.js draws a React app in the DevTools console as one styled console.log call per frame."),
};
