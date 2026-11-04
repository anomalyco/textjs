<div align="center">

# ▼ Text.js

Text.js is a React framework for apps that render in the browser console.

[Docs](https://textjs.org/docs) · [Learn](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<img src="brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

<!-- i18n:languages -->
English · [Bahasa Indonesia](docs/readme/README.id.md) · [Deutsch](docs/readme/README.de.md) · [Español](docs/readme/README.es.md) · [Français](docs/readme/README.fr.md) · [Italiano](docs/readme/README.it.md) · [Polski](docs/readme/README.pl.md) · [Português (Brasil)](docs/readme/README.pt-BR.md) · [Tiếng Việt](docs/readme/README.vi.md) · [Türkçe](docs/readme/README.tr.md) · [Русский](docs/readme/README.ru.md) · [हिन्दी](docs/readme/README.hi.md) · [日本語](docs/readme/README.ja.md) · [한국어](docs/readme/README.ko.md) · [简体中文](docs/readme/README.zh-CN.md) · [繁體中文](docs/readme/README.zh-TW.md) · [<span dir="rtl">العربية</span>](docs/readme/README.ar.md) · [<span dir="rtl">עברית</span>](docs/readme/README.he.md) · [<span dir="rtl">فارسی</span>](docs/readme/README.fa.md) · [<span dir="rtl">اردو</span>](docs/readme/README.ur.md)
<!-- /i18n:languages -->

</div>

## Quick start

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Open [localhost:3000](http://localhost:3000) and [open the browser console](https://textjs.org/docs/installation#open-the-console). Text.js needs Bun 1.2+ or Node.js 22+ and Chrome, Edge, Firefox or Safari on desktop.

## Example

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

Each frame is laid out with Yoga, run-length encoded into `%c` spans and written in one `console.log`. A frame with no changed cells logs nothing. [`ARCHITECTURE.md`](ARCHITECTURE.md) covers the rendering pipeline.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, the `text` CLI and route handlers |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, components and hooks |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Cell buffer, layout and the `%c` console driver |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet font parser and renderer |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Local bridge between textjs.org/opencode and an OpenCode server |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Project generator |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | ESLint rules for Text.js apps |

The editor and browser extensions live here too:

- [`packages/vscode-textjs`](packages/vscode-textjs): the [VS Code extension](https://textjs.org/docs/vscode), with a live preview, App Router scaffolding and error code links
- [`packages/devtools-extension`](packages/devtools-extension): the [Chrome DevTools extension](https://textjs.org/docs/devtools-extension), with a component tree, frame inspector and timeline

## Development

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

The site runs at [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) covers the other apps, the end-to-end scripts and the release process.

## Contributing

Bug reports and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and report security issues as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Bundled third-party files keep their own licenses: the FIGlet fonts in [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) and the fonts under `apps/web` and `merch/fonts` (SIL Open Font License 1.1).
