<!-- s:dd02562b57 -->
`@textjs/font` 解析 FIGfont 2（`.flf`）檔案，並以與 `figlet` 程式完全相同的方式配置版面。每個字型都是一個 ES 模組，因此只會隨附你匯入的字型。

<!-- s:a15d12503b -->
安裝

<!-- s:63bfd61a05 -->
使用方式

<!-- s:fdffc4b786 -->
`<FigletText>` 接受一個字型和一個字串。每列以儲存格為單位測量，因此字樣能像其他 `<Text>` 一樣放入 flexbox 版面配置。

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) 接受相同的字型，並保留內建的 `block` 和 `compact` 字樣：

<!-- s:9fc6ab3e8b -->
在 React 之外，`renderFiglet` 為每列回傳一個字串：

<!-- s:1ab8b509e0 -->
版面配置

<!-- s:d143897d5b -->
水平版面配置遵循 FIGlet 的旗標。

<!-- s:115b8ae91e -->
| `layout` | `figlet` | 效果 |
| :-- | :-- | :-- |
| `"default"` | `-s` | 字型的版面配置，通常為擠合 |
| `"full"` | `-W` | 完整寬度；字元不會接觸 |
| `"fitted"` | `-k` | 字距調整；字元互相靠近直到接觸 |
| `"smushed"` | `-S` | 依字型規則擠合，即使字型原本採用字距調整 |
| `"universal"` | `-o` | 後面的字元覆蓋前面的字元 |
| `0`–`63` | `-m` | 明確指定擠合模式 |

<!-- s:d9f3601792 -->
已實作全部六種水平擠合規則：相同字元、底線、階層、相對配對、大 X 和硬空白。

<!-- s:889b1e19ef -->
`verticalLayout` 適用於多行文字。FIGlet 2.2.5 不會縮小行距，因此預設為 `"full"`；`"fitted"`、`"smushed"` 和 `"universal"` 實作了五種垂直規則，包括垂直線超級擠合，而 `"default"` 使用字型本身的設定。

<!-- s:d4ec30b173 -->
換行與對齊

<!-- s:f799453d05 -->
`columns`（或 `renderFiglet` 中的 `width`）會先在單字之間換行，再於單字內換行，換行位置與 `figlet -w` 完全相同。`align` 可設為 `"left"`、`"center"` 或 `"right"`；未指定寬度時，各列會以最寬列的寬度對齊。`ivrit` 等由右至左的字型會由右至左輸出並靠右對齊；使用 `direction` 可覆寫此設定。

<!-- s:f8ccfce091 -->
隨附字型

<!-- s:15e0b8eca7 -->
| 匯入 | 列數 | 備註 |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet 的預設字型 |
| `@textjs/font/slant`, `smslant` | 6, 5 | 斜體 |
| `@textjs/font/small` | 5 | 緊湊字型 |
| `@textjs/font/big` | 8 | 包含希臘字母 |
| `@textjs/font/banner` | 8 | `#` 字樣、片假名與西里爾字母 |
| `@textjs/font/block`, `lean` | 8 | 輪廓字，含直立與傾斜樣式 |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | 投影 |
| `@textjs/font/script`, `smscript` | 7, 5 | 草寫字體 |
| `@textjs/font/mini` | 4 | 微型字體 |
| `@textjs/font/bubble`, `digital` | 4, 3 | 圓圈與方框中的字母 |
| `@textjs/font/ivrit` | 6 | 希伯來文，由右至左 |
| `@textjs/font/term` | 1 | 原樣輸出輸入內容 |

<!-- s:a8ecd7e9c1 -->
每個字形都由可列印的 ASCII 或 Latin-1 字元組成，因此每個組成字元在 DevTools 的 Menlo 字型中恰好佔一個儲存格。`@textjs/font/all` 匯出所有字型，以及供字型展示使用的 `BUNDLED_FONTS`。字型會在首次渲染時解析，而非匯入時。

<!-- s:74ff0f95fa -->
自訂字型

<!-- s:093892bc6a -->
任何 FIGfont 都能使用。先擷取，再解析：

<!-- s:c2f4ef471e -->
解析器會讀取標頭、註解行、硬空白、結束標記、102 個必要字元，以及以十進位、八進位或十六進位代碼標記的字元。TOIlet `.tlf` 字型會以純文字渲染。優先使用以 ASCII 或框線字元繪製的字型；點字和 emoji 在 Menlo 中的寬度並非一個儲存格。

<!-- s:f64649f401 -->
授權

<!-- s:adad99f0de -->
隨附字型與 FIGlet 2.2.5 發行版的字型逐位元組相同，採用 FIGlet 的 BSD 3-Clause 授權。每個字型的註解行都保留作者資訊，可在執行時透過 `font.comment` 取得。未取得再散布授權的熱門字型，例如 Doom、Larry 3D、ANSI Shadow 和 Calvin S，並未隨附。

<!-- s:2a50d4cddc -->
與 `figlet` 比對驗證

<!-- s:111c132fa2 -->
測試套件會重播從實際 `figlet` 2.2.5 二進位檔記錄的 273 筆輸出：涵蓋每個隨附字型的所有版面配置模式、換行、對齊、由右至左文字、段落模式，以及 FIGlet 本身的迴歸測試輸入。所有結果都完全一致。
