<!-- s:f9337b40e7 -->
Text.js 提供用于计时器、动画、测量和持久化的 Hook。计时器和动画遵循渲染器的帧节奏。

<!-- s:43bb49a7a4 -->
计时器

<!-- s:15335858dd -->
两者始终调用最新的回调函数。`null` 会停止计时器。

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` 在每个帧时隙触发一次。Text.js 每秒输出约 15 帧，因此更快的动画会将 CPU 用在从未输出到控制台的帧上。相同频率的循环共用一个计时器，并在输出暂停时停止。

<!-- s:faffc1716f -->
`useTween` 和 `useSpring`

<!-- s:e1a9665d36 -->
两者都返回一个随动画趋近目标的数值，并在数值稳定后停止更新。`easings` 包含 `linear`、`easeOutCubic`、`easeInOutCubic`、`easeOutExpo` 等缓动函数。

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
布局在 React 提交后运行，因此尺寸会晚一帧返回。只有尺寸变化时才会重新渲染。

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | 列数 |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
断点以列数为单位。将自定义阈值作为参数传入。

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` 将 JSON 存储在 `localStorage` 中，在浏览器之外则存储在内存中。共享同一个键的 Hook 会保持同步，跨标签页也一样。

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` 是一个不可见的焦点边界。启用 `trap` 后，`Tab` 和 `useInput` 都会限制在边界内，与没有遮罩层的 `<Modal>` 完全一样。
