<!-- s:32f8804e6b -->
Text.jsは、ブラウザーのコンソールに描画するアプリのためのReactフレームワークです。

<!-- s:814ee9e9d7 -->
[ドキュメント](https://textjs.org/docs) · [学習](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Chrome DevToolsのコンソールに描画されたText.jsアプリ

<!-- s:9535b10be9 -->
クイックスタート

<!-- s:c7a467af05 -->
[localhost:3000](http://localhost:3000)を開き、[ブラウザーのコンソールを開きます](https://textjs.org/docs/installation#open-the-console)。Text.jsにはBun 1.2+またはNode.js 22+と、デスクトップ版のChrome、Edge、Firefox、Safariのいずれかが必要です。

<!-- s:9bf34f44c9 -->
使用例

<!-- s:3f1f0605f9 -->
各フレームはYogaでレイアウトされ、ランレングス符号化で `%c` スパンに変換されて、1回の `console.log` で出力されます。変更されたセルがないフレームは何も出力しません。[`ARCHITECTURE.md`](ARCHITECTURE.md)では描画パイプラインを説明しています。

<!-- s:8b78543399 -->
パッケージ

<!-- s:cf0456d221 -->
| パッケージ | バージョン | 説明 |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router、`text` CLI、ルートハンドラー |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | リコンサイラー、コンポーネント、フック |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | セルバッファー、レイアウト、`%c` コンソールドライバー |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGletフォントのパーサーとレンダラー |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencodeとOpenCodeサーバーをつなぐローカルブリッジ |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | プロジェクトジェネレーター |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.jsアプリ向けのESLintルール |

<!-- s:8b249e49fa -->
エディターとブラウザーの拡張機能もこのリポジトリーに含まれています。

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs)：ライブプレビュー、App Routerのひな形生成、エラーコードへのリンクを備えた[VS Code拡張機能](https://textjs.org/docs/vscode)
- [`packages/devtools-extension`](packages/devtools-extension)：コンポーネントツリー、フレームインスペクター、タイムラインを備えた[Chrome DevTools拡張機能](https://textjs.org/docs/devtools-extension)

<!-- s:08b48c3d0b -->
開発

<!-- s:5facd29c1d -->
サイトは[localhost:3000](http://localhost:3000)で動作します。[CONTRIBUTING.md](CONTRIBUTING.md)では、ほかのアプリ、エンドツーエンドのスクリプト、リリース手順を説明しています。

<!-- s:47964f2d9e -->
貢献

<!-- s:b236bea0a4 -->
バグ報告やプルリクエストを歓迎します。まず[CONTRIBUTING.md](CONTRIBUTING.md)を読み、セキュリティー上の問題は[SECURITY.md](SECURITY.md)に記載された方法で報告してください。

<!-- s:6c549a56db -->
ライセンス

<!-- s:a950c8684e -->
[MIT](LICENSE)です。同梱のサードパーティーファイルにはそれぞれのライセンスが適用され、[`packages/font`](packages/font/NOTICE)のFIGletフォントはBSD 3-Clause、`apps/web` と `merch/fonts` 内のフォントはSIL Open Font License 1.1です。
