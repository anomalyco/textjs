// What useSandbox loads on demand. A dynamic import of @textjs/core itself would keep all of its exports, the bidi engine included.
export { extractStyledFrame, InputEngine } from "@textjs/core";
export { createConsoleRoot } from "@textjs/react";
