/**
 * DevTools page: adds the "Text.js" panel once the inspected page has a
 * console root (like React DevTools, the panel stays out of the way elsewhere).
 */

const DETECT = "!!(window.__TEXTJS_DEVTOOLS_HOOK__ && window.__TEXTJS_DEVTOOLS_HOOK__.roots.size > 0)";
const POLL_MS = 1000;
const POLL_ATTEMPTS = 15;

let created = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function create(): void {
  if (created) return;
  created = true;
  if (timer !== null) clearTimeout(timer);
  chrome.devtools.panels.create("Text.js", "icons/icon-32.png", "panel.html");
}

function detect(attempt = 0): void {
  if (created) return;
  chrome.devtools.inspectedWindow.eval(DETECT, (found: unknown) => {
    if (found === true) create();
    else if (attempt < POLL_ATTEMPTS) timer = setTimeout(() => detect(attempt + 1), POLL_MS);
  });
}

detect();
chrome.devtools.network.onNavigated.addListener(() => {
  if (timer !== null) clearTimeout(timer);
  detect();
});
