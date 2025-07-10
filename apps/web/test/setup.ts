import { plugin } from "bun";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Mirror Vite's `?raw` imports (docs markdown, playground sources) under `bun test`.
plugin({
  name: "vite-raw",
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: resolve(dirname(args.importer), args.path.replace(/\?raw$/, "")),
      namespace: "raw",
    }));
    build.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({
      contents: `export default ${JSON.stringify(readFileSync(args.path, "utf8"))};`,
      loader: "js",
    }));
  },
});
