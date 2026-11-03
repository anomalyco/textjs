<!-- s:8f99ab8d5a -->
Grafik digambar dengan elemen blok. Batang menggunakan delapan tingkat per sel, dan garis menggunakan kisi titik 2×2 per sel.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Plot garis matriks titik dengan sumbu y dan legenda.

<!-- s:977778a73f -->
| Prop | Deskripsi |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Bentuk ringkas untuk satu seri |
| `height` | Baris (bawaan `8`) |
| `min` / `max` | Batas tetap (bawaan: data) |
| `axis` | Sumbu y dengan label min / max |
| `formatValue` | Label sumbu (bawaan `1.2k`) |
| `marker` | `quadrant` (bawaan) atau `braille` |

<!-- s:3827b070cb -->
`braille` memuat 2×4 titik per sel. Gunakan di terminal: Menlo, font konsol DevTools di macOS, tidak memiliki braille, dan glif penggantinya lebih lebar daripada satu sel.

<!-- s:a1d8752203 -->
Warna seri secara bawaan adalah `accent`, `success`, `warning`, `info` dan `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Batang horizontal dengan label dan nilai yang sejajar, dengan presisi seperdelapan sel.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Mengisi lebarnya dengan titik terbaru. `height` di atas `1` merender area terisi.

<!-- s:9b515e6ed1 -->
`sparkline(values)` mengembalikan sparkline yang sama sebagai string.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Deskripsi |
| :-- | :-- |
| `value` / `max` | Progres (hilangkan untuk progres tak tentu) |
| `variant` | `block` (halus) `line` `thin` |
| `width` | Sel (bawaan: isi penuh) |
| `label` | Teks awal |
| `formatValue` | Teks akhir (bawaan `42%`) |

<!-- s:39c076d22f -->
Batang progres tak tentu bergerak mengikuti laju frame renderer dan berhenti saat keluaran dijeda.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolasi warna per sel. String multibaris berbagi satu gradien, sehingga cocok dipasangkan dengan `<AsciiFont>`.

<!-- s:99155d62a4 -->
Gradien bernama: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Konsol Chromium dan Firefox menggambar gambar sebagai sprite piksel. Seni piksel (256 warna atau kurang, tanpa piksel transparan sebagian) mempertahankan hingga 8 × 16 piksel per sel, dan foto hingga 4 × 8. Safari, terminal, salinan teks biasa dan halaman dengan [`runtime = "server"`](/docs/server-rendering) mendapatkan blok setengah `▀`: setiap sel menampung dua piksel, bagian atas di latar depan dan bagian bawah di latar belakang. Berikan `renderMode="halfblock"` untuk menggambar blok setengah di semua tempat, seperti yang dilakukan `<Image>` pada 1.3.

<!-- s:70bb4fc454 -->
| Prop | Deskripsi |
| :-- | :-- |
| `src` | URL gambar (khusus browser) |
| `pixels` | RGBA mentah sebagai `{ width, height, data }`, 4 byte per piksel dalam urutan baris |
| `width` / `height` | Lebar dalam sel, tinggi dalam baris. Berikan salah satunya untuk mempertahankan rasio aspek, atau jangan berikan keduanya untuk 1 × 2 piksel per sel (`src` diskalakan hingga maksimum 256 × 256 px) |
| `fit` | `contain` (bawaan), `cover` atau `fill` |
| `alt` | Teks yang ditampilkan saat `src` dimuat atau jika gagal |
| `renderMode` | `auto` (bawaan: sprite jika didukung, blok setengah `▀` di tempat lain) atau `halfblock` |

<!-- s:c106665c64 -->
`<Image>` juga menerima prop layout.

<!-- s:20dac26bff -->
`src` dimuat melalui canvas, sehingga gambar lintas origin memerlukan CORS. `pixels` menerima RGBA mentah di mana pun, termasuk terminal.

<!-- s:4e3b06ef0e -->
Gambar juga digambar sebagai blok setengah di Chromium dan Firefox saat tidak bisa menjadi satu sprite:

<!-- s:00d2e660eb -->
- Dua gambar berdampingan pada baris yang sama, seperti dalam galeri.
- Foto dengan teks di sampingnya. Seni piksel di samping teks tetap menjadi sprite.
- Gambar yang terpotong oleh kotak `overflow="hidden"`, atau tertutup sebagian oleh kotak lain.
- Piksel transparan di atas teks atau di atas lebih dari satu warna latar belakang.

<!-- s:dd4fefaac0 -->
`<Pixels>` (eksperimental)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` mengekspor `<Pixels>` untuk framebuffer `0xRRGGBBAA` langsung seperti game, emulator dan video. Tulis piksel terkemas langsung ke `source.data` dan naikkan `frame` untuk menggambar ulang.

<!-- s:2d12b69e81 -->
| Prop | Deskripsi |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` dalam urutan `0xRRGGBBAA` |
| `frame` | Penghitung frame; naikkan setelah mengubah `source.data` |
| `width` / `height` | Ukuran kotak dalam sel dan baris |
| `fit` | `contain` (bawaan) atau `fill` |
| `pixelAspect` | Lebar tampilan dibagi tinggi satu piksel sumber (bawaan `1`) |
| `palette` | Palet `PackedColor[]` opsional sebagai acuan kuantisasi warna |
| `sample` | Filter pengganti blok setengah: `nearest` (bawaan) atau `average` |
| `renderMode` | `auto` (bawaan: sprite jika didukung, blok setengah `▀` di tempat lain) atau `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` menggambar sprite berpiksel di Chromium, dan Firefox sesuai aturan gaya konsolnya (belum diuji performanya), serta menggunakan blok setengah `▀` sebagai pengganti di Safari, terminal, salinan teks biasa dan halaman dengan [`runtime = "server"`](/docs/server-rendering). Berikan `renderMode="halfblock"` untuk menggambar blok setengah di semua tempat.

<!-- s:5d2bbbc47b -->
Untuk menggambar piksel tanpa React, impor `drawPixels` dari `@textjs/core/experimental` bersama `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` dan `PixelRect`. Opsi `encoding: "rgba"` mempertahankan lebih dari 256 warna dan alfa halus untuk gambar diam, dan `fallback` menggambar sel Anda sendiri di tempat sprite tidak bisa ditampilkan. Lihat [Perubahan yang merusak kompatibilitas](/docs/support-policy#breaking-changes) untuk mengetahui cara pemberian versi pada ekspor eksperimental.
