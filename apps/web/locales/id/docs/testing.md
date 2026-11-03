<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (atau `@textjs/react/testing`) me-render aplikasi Anda di luar layar, menekan tombol, dan mengembalikan frame sebagai teks. Pengujian berjalan tanpa browser atau DevTools.

<!-- s:9bc71b1ad2 -->
Modul ini bekerja dengan runner apa pun yang mendukung pengujian `async`, termasuk Bun, Vitest, dan Jest.

<!-- s:f7898e6b92 -->
Rendering

<!-- s:fc969a7928 -->
| Metode | Deskripsi |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Memasang di luar layar (bawaan 80×24) |
| `lastFrame()` | Frame sebagai teks biasa |
| `lines()` | Frame sebagai array baris |
| `frames` | Setiap frame berbeda hingga saat ini |
| `toAnsi()` | ANSI truecolor, untuk snapshot |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` dari kecocokan pertama |
| `rerender(el)` / `unmount()` | Memperbarui atau melepas |

<!-- s:893f22353a -->
`renderToString(el, options)` me-render satu kali dan mengembalikan teksnya.

<!-- s:99a3c4d459 -->
Input

<!-- s:105149560b -->
Setiap pemanggilan berjalan di dalam `act()` dan menuntaskan frame yang dihasilkan, sehingga asersi berikutnya melihat pembaruan tersebut.

<!-- s:1f65c071dc -->
Waktu

<!-- s:ab365d9403 -->
Animasi, spinner, dan toast menggunakan timer waktu nyata, sehingga `wait` dan `waitFor` menjadi cara yang dapat diandalkan untuk mengamatinya.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:05724c9883 -->
Spasi kosong di sisi kanan dan bagian bawah frame dipangkas, sehingga snapshot tidak terus berubah akibat spasi kosong.
