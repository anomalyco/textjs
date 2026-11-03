<!-- s:8f99ab8d5a -->
圖表以區塊元素繪製。長條在每個儲存格中使用八個層級，折線則在每個儲存格中使用 2×2 點陣。

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
附有 y 軸和圖例的點陣折線圖。

<!-- s:977778a73f -->
| Prop | 說明 |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | 單一資料序列的簡寫 |
| `height` | 列數（預設為 `8`） |
| `min` / `max` | 固定上下界（預設依資料決定） |
| `axis` | 附有最小值／最大值標籤的 Y 軸 |
| `formatValue` | 座標軸標籤（預設為 `1.2k`） |
| `marker` | `quadrant`（預設）或 `braille` |

<!-- s:3827b070cb -->
`braille` 在每個儲存格中容納 2×4 個點。請在終端機中使用：macOS 上 DevTools 主控台使用的 Menlo 字型沒有點字字元，而替代字形比一個儲存格更寬。

<!-- s:a1d8752203 -->
資料序列的顏色預設為 `accent`、`success`、`warning`、`info` 和 `danger`。

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
標籤與數值對齊的水平長條圖，精度為八分之一個儲存格。

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
以最新的資料點填滿寬度。`height` 大於 `1` 時會渲染填色區域。

<!-- s:9b515e6ed1 -->
`sparkline(values)` 以字串形式回傳相同的走勢圖。

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | 說明 |
| :-- | :-- |
| `value` / `max` | 進度（省略時表示進度不定） |
| `variant` | `block`（平滑）`line` `thin` |
| `width` | 儲存格數（預設為填滿） |
| `label` | 前置文字 |
| `formatValue` | 後置文字（預設為 `42%`） |

<!-- s:39c076d22f -->
進度不定的進度列會依渲染器的影格節奏掃動，並在輸出暫停時停止。

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
逐儲存格插補顏色。多行字串共用同一個漸層，因此可搭配 `<AsciiFont>` 使用。

<!-- s:99155d62a4 -->
具名漸層：`geist` `dusk` `ocean` `mono` `ember`。

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Chromium 和 Firefox 主控台會將圖片繪製為像素精靈圖。像素藝術（256 色以下，且沒有半透明像素）每個儲存格最多保留 8 × 16 個像素，照片則最多保留 4 × 8 個像素。Safari、終端機、純文字副本，以及使用 [`runtime = "server"`](/docs/server-rendering) 的頁面會使用 `▀` 半區塊：每個儲存格容納兩個像素，上方使用前景色，下方使用背景色。傳入 `renderMode="halfblock"` 可在所有環境繪製半區塊，如同 1.3 版的 `<Image>`。

<!-- s:70bb4fc454 -->
| Prop | 說明 |
| :-- | :-- |
| `src` | 圖片網址（僅限瀏覽器） |
| `pixels` | 以 `{ width, height, data }` 表示的原始 RGBA，每個像素 4 位元組，依列排列 |
| `width` / `height` | 寬度以儲存格數計，高度以列數計。傳入其中一項可維持長寬比，兩項都不傳則每個儲存格容納 1 × 2 個像素（`src` 最多縮放至 256 × 256 px） |
| `fit` | `contain`（預設）、`cover` 或 `fill` |
| `alt` | `src` 載入期間或載入失敗時顯示的文字 |
| `renderMode` | `auto`（預設：支援時使用精靈圖，其餘使用 `▀` 半區塊）或 `halfblock` |

<!-- s:c106665c64 -->
`<Image>` 也接受版面配置 props。

<!-- s:20dac26bff -->
`src` 透過畫布載入，因此跨來源圖片需要 CORS。`pixels` 可在任何環境接受原始 RGBA，包括終端機。

<!-- s:4e3b06ef0e -->
在 Chromium 和 Firefox 中，圖片無法以單一精靈圖呈現時，也會繪製為半區塊：

<!-- s:00d2e660eb -->
- 兩張圖片在相同列並排，例如圖庫。
- 照片旁有文字。文字旁的像素藝術仍使用精靈圖。
- 圖片遭 `overflow="hidden"` 方框裁切，或部分遭另一個方框覆蓋。
- 透明像素覆蓋文字或超過一種背景色。

<!-- s:dd4fefaac0 -->
`<Pixels>`（實驗性）

<!-- s:71eeeca05d -->
`@textjs/react/experimental` 匯出 `<Pixels>`，用於遊戲、模擬器和影片等即時 `0xRRGGBBAA` 影格緩衝區。將封裝的像素直接寫入 `source.data`，再遞增 `frame` 以重繪。

<!-- s:2d12b69e81 -->
| Prop | 說明 |
| :-- | :-- |
| `source` | 以 `0xRRGGBBAA` 順序排列的 `{ width, height, data: Uint32Array }` |
| `frame` | 影格計數器；修改 `source.data` 後遞增 |
| `width` / `height` | 方框尺寸，以儲存格數和列數計 |
| `fit` | `contain`（預設）或 `fill` |
| `pixelAspect` | 單一來源像素顯示時的寬度除以高度（預設為 `1`） |
| `palette` | 選用的 `PackedColor[]` 調色盤，用於色彩量化 |
| `sample` | 半區塊備援濾鏡：`nearest`（預設）或 `average` |
| `renderMode` | `auto`（預設：支援時使用精靈圖，其餘使用 `▀` 半區塊）或 `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` 在 Chromium 中繪製像素化精靈圖，在 Firefox 中依其主控台樣式規則繪製（未經效能測試），在 Safari、終端機、純文字副本，以及使用 [`runtime = "server"`](/docs/server-rendering) 的頁面中則改用 `▀` 半區塊。傳入 `renderMode="halfblock"` 可在所有環境繪製半區塊。

<!-- s:5d2bbbc47b -->
若要不使用 React 繪製像素，請從 `@textjs/core/experimental` 匯入 `drawPixels`，以及 `DrawPixelsOptions`、`PixelSource`、`PixelFit`、`PixelSample`、`PixelRenderMode`、`PixelEncoding` 和 `PixelRect`。其中的 `encoding: "rgba"` 選項可為靜態圖片保留超過 256 種顏色及漸變透明度，`fallback` 則在無法顯示精靈圖的位置繪製自訂儲存格。實驗性匯出的版本管理方式，請參閱[重大變更](/docs/support-policy#breaking-changes)。
