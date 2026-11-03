<!-- s:581711536b -->
Atur gaya komponen dengan utilitas `className` atau prop bertipe. Aplikasi Text.js tidak memiliki stylesheet.

<!-- s:e0ac1db626 -->
Utilitas

<!-- s:2de571e2bf -->
`className` menerima utilitas bergaya Tailwind. Satu unit setara dengan satu sel.

<!-- s:785b2c3db0 -->
| Kategori | Contoh |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Jarak | `p-1` `px-2` `mt-1` |
| Batas | `border` `rounded` `border-accent` |
| Warna | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Prop bertipe

<!-- s:4963259a42 -->
Setiap utilitas memiliki prop. Prop lebih diutamakan daripada `className`.

<!-- s:15a3834a24 -->
Warna

<!-- s:d333dad27a -->
Gunakan hex, nama Tailwind, atau token tema seperti `fg`, `muted`, `surface`, `accent`, `success`, dan `danger`. Token mengikuti tema aktif.

<!-- s:087abce968 -->
Tema

<!-- s:abba2a3188 -->
Lima preset tersedia sebagai bawaan: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight`, dan `amberCrt`.

<!-- s:5dc490305b -->
Viewport responsif

<!-- s:419fb844db -->
Secara default, aplikasi memenuhi konsol DevTools yang terpasang di jendela browser (`viewport.responsive`), dan menyesuaikan ukurannya saat Anda menyeret panel. Atur layout dengan flex dan baca ukurannya saat diperlukan:

<!-- s:3d847eadf9 -->
Halaman hanya dapat melihat panel yang terpasang di jendela browser. DevTools di jendela terpisah, zoom DevTools, dan bilah sisi Konsol tidak terlihat oleh halaman, sehingga aplikasi menggunakan `viewport.width × viewport.height` (default `120×36`) atau ukuran yang Anda tetapkan:
