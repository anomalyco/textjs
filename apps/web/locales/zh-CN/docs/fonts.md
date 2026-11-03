<!-- s:dd02562b57 -->
`@textjs/font` 解析 FIGfont 2（`.flf`）文件，布局方式与 `figlet` 程序完全一致。每种字体都是一个 ES 模块，因此只会打包你导入的字体。

<!-- s:a15d12503b -->
安装

<!-- s:63bfd61a05 -->
用法

<!-- s:fdffc4b786 -->
`<FigletText>` 接收一种字体和一个字符串。行宽以单元格为单位，因此这些字形可以像其他 `<Text>` 一样放入 flexbox 布局。

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) 接受相同的字体，同时保留内置的 `block` 和 `compact` 字形：

<!-- s:9fc6ab3e8b -->
在 React 之外，`renderFiglet` 为每行返回一个字符串：

<!-- s:1ab8b509e0 -->
布局

<!-- s:d143897d5b -->
水平布局遵循 FIGlet 的命令行标志。

<!-- s:115b8ae91e -->
| `layout` | `figlet` | 效果 |
| :-- | :-- | :-- |
| `"default"` | `-s` | 字体自身的布局，通常为挤合 |
| `"full"` | `-W` | 全宽；字符互不接触 |
| `"fitted"` | `-k` | 字距调整；字符相互靠近，直至接触 |
| `"smushed"` | `-S` | 按字体规则挤合，即使字体采用紧凑布局也如此 |
| `"universal"` | `-o` | 后面的字符覆盖前面的字符 |
| `0`–`63` | `-m` | 显式指定挤合模式 |

<!-- s:d9f3601792 -->
全部六种水平挤合规则均已实现：相同字符、下划线、层级、相对字符对、大 X 和硬空格。

<!-- s:889b1e19ef -->
`verticalLayout` 适用于多行文本。FIGlet 2.2.5 从不缩小行间距，因此默认值为 `"full"`；`"fitted"`、`"smushed"` 和 `"universal"` 实现了五种垂直规则，包括垂直线超级挤合，而 `"default"` 使用字体自身的规则。

<!-- s:d4ec30b173 -->
换行与对齐

<!-- s:f799453d05 -->
`columns`（或 `renderFiglet` 中的 `width`）优先在单词之间换行，再在单词内部换行，换行位置与 `figlet -w` 完全一致。`align` 可设为 `"left"`、`"center"` 或 `"right"`；未指定宽度时，各行在最宽行的范围内对齐。`ivrit` 等从右到左的字体从右向左输出并右对齐；使用 `direction` 可覆盖此行为。

<!-- s:f8ccfce091 -->
内置字体

<!-- s:15e0b8eca7 -->
| 导入 | 行数 | 说明 |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet 的默认字体 |
| `@textjs/font/slant`, `smslant` | 6, 5 | 斜体 |
| `@textjs/font/small` | 5 | 紧凑字体 |
| `@textjs/font/big` | 8 | 包含希腊字母 |
| `@textjs/font/banner` | 8 | `#` 字形、片假名和西里尔字母 |
| `@textjs/font/block`, `lean` | 8 | 轮廓字体，直立与倾斜 |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | 投影字体 |
| `@textjs/font/script`, `smscript` | 7, 5 | 手写体 |
| `@textjs/font/mini` | 4 | 微型字体 |
| `@textjs/font/bubble`, `digital` | 4, 3 | 圆圈和方框中的字母 |
| `@textjs/font/ivrit` | 6 | 希伯来文，从右到左 |
| `@textjs/font/term` | 1 | 原样输出输入内容 |

<!-- s:a8ecd7e9c1 -->
每个字形都由可打印的 ASCII 或 Latin-1 字符组成，因此在 DevTools 的 Menlo 字体中，每个组成字符恰好占一个单元格。`@textjs/font/all` 导出所有字体，以及用于字体展示的 `BUNDLED_FONTS`。字体在首次渲染时解析，导入时不解析。

<!-- s:74ff0f95fa -->
自定义字体

<!-- s:093892bc6a -->
任何 FIGfont 都可使用。先获取，再解析：

<!-- s:c2f4ef471e -->
解析器读取文件头、注释行、硬空格、结束标记、102 个必需字符，以及用十进制、八进制或十六进制编码标记的字符。TOIlet `.tlf` 字体渲染为纯文本。优先选择用 ASCII 或制表符号绘制的字体；盲文和表情符号在 Menlo 中的宽度不是一个单元格。

<!-- s:f64649f401 -->
许可

<!-- s:adad99f0de -->
内置字体与 FIGlet 2.2.5 发行版中的字体逐字节一致，采用 FIGlet 的 BSD 3-Clause 许可证。每种字体的署名信息都保留在注释行中，运行时可通过 `font.comment` 读取。Doom、Larry 3D、ANSI Shadow 和 Calvin S 等未获再分发许可的常用字体未包含在内。

<!-- s:2a50d4cddc -->
与 `figlet` 对照验证

<!-- s:111c132fa2 -->
测试套件重放了从真实的 `figlet` 2.2.5 二进制文件记录的 273 个输出：涵盖每种内置字体的所有布局模式、换行、对齐、从右到左的文本、段落模式，以及 FIGlet 自身的回归测试输入。所有结果均完全匹配。
