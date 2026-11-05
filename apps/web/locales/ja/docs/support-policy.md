<!-- s:d2d5ef69d7 -->
このページでは、Text.jsの各リリース系列に修正が提供される期間と、破壊的変更に該当する変更について説明します。

<!-- s:80371443b7 -->
リリース系列

<!-- s:19aa9fdfd3 -->
| 状態 | 提供内容 | 期間 |
| :-- | :-- | :-- |
| アクティブ | 機能、修正、セキュリティパッチ | 次のメジャーリリースまで |
| メンテナンスLTS | 重大な問題の修正とセキュリティパッチ | 次のメジャーリリースから12か月間 |
| サポート終了 | なし | — |

<!-- s:d5987f6ecf -->
パッチは各メジャーバージョンの最新のマイナーバージョンにのみ提供されます。`1.5.0` がリリースされると、修正は `1.4.x` ではなく `1.5.x` に適用されます。`2.0.0` がリリースされると、`1.x` の最後のマイナーバージョンがメンテナンスLTS系列となり、`lts` と `v1-lts` のdist-tagで公開されます。

<!-- s:6a7ba75ff1 -->
| バージョン | 状態 | サポート期限 |
| :-- | :-- | :-- |
| 1.x | アクティブ | 2.0.0のリリースから12か月後 |

<!-- s:d71377bf9c -->
LTSでの修正対象

<!-- s:043b92b499 -->
- Text.jsパッケージのセキュリティ脆弱性
- 回避策のないクラッシュ、データ損失、ビルド失敗
- コンソールの描画を壊すChrome、Edge、Firefox、Safariの新しいリリースとの互換性
- サポート対象のランタイムおよびデプロイ先との互換性

<!-- s:e01d1121d2 -->
新機能、パフォーマンス改善、リファクタリングは、アクティブな系列にのみ適用されます。

<!-- s:d1c69ba9bc -->
破壊的変更

<!-- s:82596fcd52 -->
以下は、少なくとも1つのマイナーリリースで非推奨の警告を出した後、メジャーリリースでのみ変更します。

<!-- s:4ca9fd7807 -->
- `@textjs/app/server` と `@textjs/app/cache` を含む、`@textjs/app`、`@textjs/react`、`@textjs/core` の公開エクスポート
- `text.config.ts` のオプション、`text` CLIのコマンドとフラグ
- `app/` 内のファイル規約、`middleware.ts`、ルートセグメント設定
- アダプターの出力レイアウト（`.vercel/output`、`_worker.js`、`dist/server.js`）

<!-- s:883f3eeb26 -->
対象外：実験的または `unstable_` と明示されたAPI（`@textjs/core/experimental`、`@textjs/react/experimental`、`@textjs/app/experimental` 配下のすべてを含み、マイナーリリースで変更される場合は変更履歴に記載されます）、`@textjs/core/internal`、`x-middleware-*` ヘッダー、`.text/` ビルドメタデータなどの内部要素、canaryリリース、および `console.log` の書式文字列とCSSの厳密な内容（フレームの見た目は変わりませんが、エンコードが高速化される場合があります）。

<!-- s:5c7d9aae9b -->
ランタイムのサポート

<!-- s:30122ce1bb -->
| ランタイム | サポート対象 |
| :-- | :-- |
| Chrome / Edge DevTools | 現行および過去2つの安定版リリース |
| FirefoxとSafariのコンソール | 現行の安定版リリース |
| Node.js | アクティブLTSおよびメンテナンスLTSリリース（`text start`、Vercel Functions） |
| Bun | 最新の1.x |
| Cloudflare Workers | `compatibility_date` が2025-01-01以降、`nodejs_compat` |

<!-- s:509c18536b -->
ランタイム自体のサポートが終了したバージョンをサポート対象から外すことは、破壊的変更には該当しません。

<!-- s:52543dba9b -->
セキュリティ

<!-- s:2aff0514c5 -->
脆弱性は、[security@textjs.org](mailto:security@textjs.org)または[GitHubセキュリティアドバイザリ](https://github.com/anomalyco/textjs/security/advisories/new)を通じて非公開で報告してください。修正はサポート対象の全系列で同時にリリースし、修正済みバージョンがnpmで公開された後にアドバイザリを公開します。

<!-- s:b933131934 -->
バージョンとdist-tagの生成方法については、[リリースチャンネル](/docs/release-channels)を参照してください。
