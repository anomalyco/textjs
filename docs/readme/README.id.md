<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

<a href="https://opencode.ai"><picture><source media="(prefers-color-scheme: dark)" srcset="https://opencode.ai/brand/badges/opencode-built-with-g-dark-20.svg"><img alt="Built with OpenCode" src="https://opencode.ai/brand/badges/opencode-built-with-g-light-20.svg" height="20" /></picture></a>

Text.js adalah framework React untuk aplikasi yang di-render di konsol browser.

[Dokumentasi](https://textjs.org/id/docs) · [Belajar](https://textjs.org/id/learn) · [Playground](https://textjs.org/id/playground) · [OpenCode](https://textjs.org/id/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Aplikasi Text.js yang di-render di konsol Chrome DevTools" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · Bahasa Indonesia · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## Mulai cepat

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Buka [localhost:3000](http://localhost:3000) dan [buka konsol browser](https://textjs.org/id/docs/installation#open-the-console). Text.js memerlukan Bun 1.2+ atau Node.js 22+ serta Chrome, Edge, Firefox, atau Safari di desktop.

## Contoh

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

Setiap frame ditata dengan Yoga, dikodekan dengan run-length encoding menjadi span `%c`, dan ditulis dalam satu `console.log`. Frame tanpa sel yang berubah tidak mencatat apa pun. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) membahas alur rendering.

## Paket

| Paket | Versi | Deskripsi |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text`, dan route handler |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, komponen, dan hook |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer sel, layout, dan driver konsol `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser dan renderer font FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Penghubung lokal antara textjs.org/opencode dan server OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generator proyek |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Aturan ESLint untuk aplikasi Text.js |

Ekstensi editor dan browser juga ada di sini:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): [ekstensi VS Code](https://textjs.org/id/docs/vscode), dengan pratinjau langsung, scaffolding App Router, dan tautan kode kesalahan
- [`packages/devtools-extension`](../../packages/devtools-extension): [ekstensi Chrome DevTools](https://textjs.org/id/docs/devtools-extension), dengan pohon komponen, inspektur frame, dan linimasa

## Pengembangan

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Situs berjalan di [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) membahas aplikasi lainnya, skrip end-to-end, dan proses rilis.

## Berkontribusi

Laporan bug dan pull request diterima. Baca [CONTRIBUTING.md](../../CONTRIBUTING.md) terlebih dahulu, dan laporkan masalah keamanan sesuai petunjuk di [SECURITY.md](../../SECURITY.md).

## Lisensi

[MIT](../../LICENSE). File pihak ketiga yang disertakan tetap menggunakan lisensinya masing-masing: font FIGlet di [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) dan font di `apps/web` serta `merch/fonts` (SIL Open Font License 1.1).
