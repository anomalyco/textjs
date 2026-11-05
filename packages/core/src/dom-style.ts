/**
 * Set `"prop:value;…"` on an element one property at a time. CSSOM property
 * setters are outside a host page's `style-src` Content Security Policy,
 * where the `style` attribute isn't.
 */
export function applyStyle(el: HTMLElement, css: string): void {
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) el.style.setProperty(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
  }
}
