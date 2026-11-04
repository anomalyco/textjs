<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.jsは、ブラウザーのコンソールに描画するアプリのためのReactフレームワークです。

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · 日本語 · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [⁨العربية⁩](README.ar.md) · [⁨עברית⁩](README.he.md) · [⁨فارسی⁩](README.fa.md) · [⁨اردو⁩](README.ur.md)
<!-- /i18n:languages -->

[ドキュメント](https://textjs.org/ja/docs) · [学習](https://textjs.org/ja/learn) · [Playground](https://textjs.org/ja/playground) · [OpenCode](https://textjs.org/ja/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## クイックスタート

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

[localhost:3000](http://localhost:3000)を開き、[ブラウザーのコンソールを開きます](https://textjs.org/ja/docs/installation#open-the-console)。Text.jsにはBun 1.2+またはNode.js 22+と、デスクトップ版のChrome、Edge、Firefox、Safariのいずれかが必要です。

## 使用例

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

各フレームはYogaでレイアウトされ、ランレングス符号化で `%c` スパンに変換されて、1回の `console.log` で出力されます。変更されたセルがないフレームは何も出力しません。[`ARCHITECTURE.md`](../../ARCHITECTURE.md)では描画パイプラインを説明しています。

## パッケージ

| パッケージ | バージョン | 説明 |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router、`text` CLI、ルートハンドラー |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | リコンサイラー、コンポーネント、フック |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | セルバッファー、レイアウト、`%c` コンソールドライバー |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGletフォントのパーサーとレンダラー |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencodeとOpenCodeサーバーをつなぐローカルブリッジ |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | プロジェクトジェネレーター |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.jsアプリ向けのESLintルール |

エディターとブラウザーの拡張機能もこのリポジトリーに含まれています。

- [`packages/vscode-textjs`](../../packages/vscode-textjs)：ライブプレビュー、App Routerのひな形生成、エラーコードへのリンクを備えた[VS Code拡張機能](https://textjs.org/ja/docs/vscode)
- [`packages/devtools-extension`](../../packages/devtools-extension)：コンポーネントツリー、フレームインスペクター、タイムラインを備えた[Chrome DevTools拡張機能](https://textjs.org/ja/docs/devtools-extension)

## 開発

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

サイトは[localhost:3000](http://localhost:3000)で動作します。[CONTRIBUTING.md](../../CONTRIBUTING.md)では、ほかのアプリ、エンドツーエンドのスクリプト、リリース手順を説明しています。

## 貢献

バグ報告やプルリクエストを歓迎します。まず[CONTRIBUTING.md](../../CONTRIBUTING.md)を読み、セキュリティー上の問題は[SECURITY.md](../../SECURITY.md)に記載された方法で報告してください。

## ライセンス

[MIT](../../LICENSE)です。同梱のサードパーティーファイルにはそれぞれのライセンスが適用され、[`packages/font`](../../packages/font/NOTICE)のFIGletフォントはBSD 3-Clause、`apps/web` と `merch/fonts` 内のフォントはSIL Open Font License 1.1です。
