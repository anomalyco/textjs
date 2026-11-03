<!-- s:f9337b40e7 -->
Text.js menyertakan hook untuk timer, animasi, pengukuran, dan persistensi. Timer dan animasi mengikuti pengaturan tempo frame renderer.

<!-- s:43bb49a7a4 -->
Timer

<!-- s:15335858dd -->
Keduanya selalu memanggil callback terbaru. `null` menghentikan keduanya.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` berjalan sekali per slot frame. Text.js menghasilkan sekitar 15 frame per detik, jadi animasi yang lebih cepat menghabiskan CPU untuk frame yang tidak pernah dicatat ke konsol. Loop berbagi satu timer per laju dan berhenti saat output dijeda.

<!-- s:faffc1716f -->
`useTween` dan `useSpring`

<!-- s:e1a9665d36 -->
Keduanya mengembalikan angka yang beranimasi menuju target dan berhenti berjalan setelah nilainya stabil. `easings` memuat `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo`, dan lainnya.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Layout berjalan setelah React menyelesaikan commit, sehingga ukuran tersedia satu frame kemudian. Rendering ulang hanya terjadi saat ukuran berubah.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Kolom |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Breakpoint menggunakan satuan kolom. Berikan ambang batas Anda sendiri sebagai argumen.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` menyimpan JSON di `localStorage`, dan di memori saat berada di luar browser. Hook yang berbagi kunci tetap sinkron, termasuk antartab.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` adalah batas fokus yang tidak terlihat. Dengan `trap`, `Tab` dan `useInput` tetap berada di dalamnya, persis seperti `<Modal>` tanpa overlay.
