<!-- s:8f99ab8d5a -->
图表使用块元素绘制。条形图的每个单元格有八级高度，折线图的每个单元格使用 2×2 点阵。

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
带有 y 轴和图例的点阵折线图。

<!-- s:977778a73f -->
| Prop | 说明 |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | 单个系列的简写 |
| `height` | 行数（默认 `8`） |
| `min` / `max` | 固定边界（默认：数据范围） |
| `axis` | 带有最小值和最大值标签的 Y 轴 |
| `formatValue` | 坐标轴标签（默认 `1.2k`） |
| `marker` | `quadrant`（默认）或 `braille` |

<!-- s:3827b070cb -->
`braille` 在每个单元格中容纳 2×4 个点。请在终端中使用：macOS 上的 DevTools 控制台字体 Menlo 没有盲文字符，回退字形的宽度会超出一个单元格。

<!-- s:a1d8752203 -->
系列颜色默认为 `accent`、`success`、`warning`、`info` 和 `danger`。

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
水平条形图，标签和值对齐，精度为八分之一个单元格。

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
用最新的数据点填满宽度。`height` 大于 `1` 时渲染填充区域。

<!-- s:9b515e6ed1 -->
`sparkline(values)` 以字符串形式返回相同的 sparkline。

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | 说明 |
| :-- | :-- |
| `value` / `max` | 进度（省略则为不确定进度） |
| `variant` | `block`（平滑）`line` `thin` |
| `width` | 单元格数（默认：填满） |
| `label` | 前置文本 |
| `formatValue` | 后置文本（默认 `42%`） |

<!-- s:39c076d22f -->
不确定进度条按渲染器的帧节奏扫动，输出暂停时停止。

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
逐单元格进行颜色插值。多行字符串共享同一个渐变，因此可搭配 `<AsciiFont>` 使用。

<!-- s:99155d62a4 -->
命名渐变：`geist` `dusk` `ocean` `mono` `ember`。

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Chromium 和 Firefox 控制台将图像绘制为像素精灵图。像素画（256 色或更少，且没有半透明像素）每个单元格最多保留 8 × 16 个像素，照片最多保留 4 × 8 个像素。Safari、终端、纯文本副本以及设置了 [`runtime = "server"`](/docs/server-rendering) 的页面使用 `▀` 半块字符：每个单元格容纳两个像素，上方像素使用前景色，下方像素使用背景色。传入 `renderMode="halfblock"` 可在所有环境中使用半块字符绘制，与 1.3 中的 `<Image>` 一致。

<!-- s:70bb4fc454 -->
| Prop | 说明 |
| :-- | :-- |
| `src` | 图像 URL（仅限浏览器） |
| `pixels` | 以 `{ width, height, data }` 形式传入的原始 RGBA，按行排列，每个像素 4 字节 |
| `width` / `height` | 宽度以单元格为单位，高度以行为单位。传入其中一个可保持宽高比，都不传则每个单元格容纳 1 × 2 个像素（`src` 最多缩放至 256 × 256 px） |
| `fit` | `contain`（默认）、`cover` 或 `fill` |
| `alt` | `src` 加载期间或加载失败时显示的文本 |
| `renderMode` | `auto`（默认：支持时使用精灵图，其他情况使用 `▀` 半块字符）或 `halfblock` |

<!-- s:c106665c64 -->
`<Image>` 也接受布局 props。

<!-- s:20dac26bff -->
`src` 通过画布加载，因此跨域图像需要 CORS。`pixels` 可在任何环境中接收原始 RGBA，包括终端。

<!-- s:4e3b06ef0e -->
在 Chromium 和 Firefox 中，图像无法作为单个精灵图显示时，也会使用半块字符绘制：

<!-- s:00d2e660eb -->
- 两张图像在相同的行上并排显示，例如图库。
- 照片旁有文本。文本旁的像素画仍使用精灵图。
- 图像被 `overflow="hidden"` 盒子裁剪，或被另一个盒子部分遮盖。
- 透明像素覆盖在文本或多种背景色之上。

<!-- s:dd4fefaac0 -->
`<Pixels>`（实验性）

<!-- s:71eeeca05d -->
`@textjs/react/experimental` 导出 `<Pixels>`，用于游戏、模拟器和视频等实时 `0xRRGGBBAA` 帧缓冲区。将打包像素原地写入 `source.data`，并递增 `frame` 以重绘。

<!-- s:2d12b69e81 -->
| Prop | 说明 |
| :-- | :-- |
| `source` | 按 `0xRRGGBBAA` 顺序排列的 `{ width, height, data: Uint32Array }` |
| `frame` | 帧计数器；修改 `source.data` 后递增 |
| `width` / `height` | 盒子尺寸，宽度以单元格为单位，高度以行为单位 |
| `fit` | `contain`（默认）或 `fill` |
| `pixelAspect` | 单个源像素显示时的宽高比（默认 `1`） |
| `palette` | 可选的 `PackedColor[]` 调色板，用于颜色量化 |
| `sample` | 半块字符回退滤镜：`nearest`（默认）或 `average` |
| `renderMode` | `auto`（默认：支持时使用精灵图，其他情况使用 `▀` 半块字符）或 `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` 在 Chromium 中绘制像素化精灵图，在 Firefox 中按其控制台的样式规则绘制（未做基准测试），在 Safari、终端、纯文本副本以及设置了 [`runtime = "server"`](/docs/server-rendering) 的页面中回退为 `▀` 半块字符。传入 `renderMode="halfblock"` 可在所有环境中使用半块字符绘制。

<!-- s:5d2bbbc47b -->
要在不使用 React 的情况下绘制像素，请从 `@textjs/core/experimental` 导入 `drawPixels`，以及 `DrawPixelsOptions`、`PixelSource`、`PixelFit`、`PixelSample`、`PixelRenderMode`、`PixelEncoding` 和 `PixelRect`。其 `encoding: "rgba"` 选项为静态图像保留超过 256 种颜色和渐变透明度，`fallback` 则在无法显示精灵图的位置绘制你自定义的单元格。有关实验性导出的版本管理方式，请参阅[破坏性变更](/docs/support-policy#breaking-changes)。
