<!-- s:5c16c8b17b -->
`app/` 内のフォルダーがルートを定義し、特別なファイルが各ルートのUIを定義します。

<!-- s:11f7d9178c -->
フォルダー

<!-- s:8bda4d61c2 -->
| フォルダー | 用途 |
| :-- | :-- |
| `app` | ルート、レイアウト、ルートハンドラー |
| `lib` | ルーティング対象外の共有モジュール |
| `public` | 静的アセット |

<!-- s:25756fa68d -->
ルーティングファイル

<!-- s:8d1e739d99 -->
| ファイル | 用途 |
| :-- | :-- |
| `layout.tsx` | セグメントで共有するUI |
| `page.tsx` | ルーティング可能な画面 |
| `loading.tsx` | Suspenseのフォールバック |
| `error.tsx` | エラーバウンダリー |
| `not-found.tsx` | 一致するルートがないURL |
| `route.ts` | APIエンドポイント |

<!-- s:ed4806a616 -->
動的ルート

<!-- s:7f3bfd19e0 -->
| フォルダー | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| オプション | デフォルト | 説明 |
| :-- | :-- | :-- |
| `title` | `""` | ページとFocusPadのタイトル |
| `viewport` | コンソールに合わせる、それ以外は `120×36` | `responsive`（デフォルトは `true`）、フォールバックの `width × height`、`theme` |
| `hints` | `[]` | ページのFocusPadに表示する2〜3個のキー |
| `action` | `press <first hint>` | フォーカス後の操作、例：`"type a prompt"` |
| `devIndicators` | `true` | コンソール内の開発用オーバーレイ（`[▼]`） |
| `focusHint` | `true` | ページにフォーカスがない間、コンソールの最終行に重ねて表示する「キーボードを使うにはページをクリックしてください」 |
| `rewrites` | `[]` | リライトとプロキシー |
| `ansi` | `{ cols: 80, rows: 24 }` | [curlとターミナルクライアント](/docs/curl)用のフレームサイズ、またはHTMLを配信する場合は `false` |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| コマンド | 説明 |
| :-- | :-- |
| `text dev` | Fast Refresh対応の開発サーバー |
| `text build` | 本番用ビルド |
| `text start` | ビルドとルートハンドラーの配信 |
| `text run` | ターミナルでのアプリの描画（[ターミナル](/docs/terminal)） |
| `text mcp` | コーディングエージェントへのアプリの配信（[MCP](/docs/mcp)） |
