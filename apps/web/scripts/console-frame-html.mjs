// Turns one console.log(format, ...css) frame from the companion into a standalone HTML page,
// styled the way DevTools applies `%c`, so a browser can screenshot it.

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `args` is the argument list of one `console.log` call. */
export function frameHtml(args, { background = "#0a0a0a", title = "" } = {}) {
  const [format = "", ...styles] = args;
  const parts = String(format).split("%c");
  let body = escape(parts[0].replace(/%%/g, "%"));
  for (let i = 1; i < parts.length; i++) {
    const css = String(styles[i - 1] ?? "").replace(/"/g, "'");
    // Newlines go between spans so each span stays one line high.
    body += parts[i]
      .replace(/%%/g, "%")
      .split("\n")
      .map((t) => (t ? `<span style="${css}">${escape(t)}</span>` : ""))
      .join("\n");
  }
  return `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title>
<style>
  html, body { margin: 0; background: ${background}; }
  pre { margin: 0; padding: 12px; display: inline-block; font: 12px/16px Menlo, "DejaVu Sans Mono", monospace; color: #ededed; white-space: pre; }
  /* DevTools paints each %c span's background over its line box; inline-block does the same here. */
  pre span { display: inline-block; vertical-align: top; height: 16px; margin: 0 !important; }
</style>
<pre id="frame">${body}</pre>`;
}
