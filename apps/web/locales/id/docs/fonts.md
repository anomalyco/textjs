<!-- s:dd02562b57 -->
`@textjs/font` mengurai berkas FIGfont 2 (`.flf`) dan menatanya persis seperti program `figlet`. Setiap font merupakan modul ES, sehingga hanya font yang Anda impor yang disertakan.

<!-- s:a15d12503b -->
Instalasi

<!-- s:63bfd61a05 -->
Penggunaan

<!-- s:fdffc4b786 -->
`<FigletText>` menerima font dan string. Baris diukur dalam sel, sehingga bentuk huruf menempati layout flexbox seperti `<Text>` lainnya.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) menerima font yang sama, dengan tetap mempertahankan bentuk huruf bawaan `block` dan `compact`:

<!-- s:9fc6ab3e8b -->
Di luar React, `renderFiglet` mengembalikan satu string per baris:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Layout horizontal mengikuti flag FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Efek |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout font, biasanya dirapatkan dengan smushing |
| `"full"` | `-W` | Lebar penuh; karakter tidak pernah bersentuhan |
| `"fitted"` | `-k` | Kerning; karakter saling mendekat hingga bersentuhan |
| `"smushed"` | `-S` | Smushing dengan aturan font, termasuk untuk font fitted |
| `"universal"` | `-o` | Karakter berikutnya menimpa karakter sebelumnya |
| `0`–`63` | `-m` | Mode smush eksplisit |

<!-- s:d9f3601792 -->
Keenam aturan smushing horizontal diterapkan: karakter sama, garis bawah, hierarki, pasangan berlawanan, X besar dan hardblank.

<!-- s:889b1e19ef -->
`verticalLayout` berlaku untuk teks multibaris. FIGlet 2.2.5 tidak pernah merapatkan tumpukan baris, sehingga nilai default-nya adalah `"full"`; `"fitted"`, `"smushed"` dan `"universal"` menerapkan kelima aturan vertikal, termasuk supersmushing garis vertikal, dan `"default"` menggunakan aturan font.

<!-- s:d4ec30b173 -->
Pembungkusan dan perataan

<!-- s:f799453d05 -->
`columns` (atau `width` dalam `renderFiglet`) membungkus teks pada batas kata, lalu di tengah kata, persis di posisi yang digunakan `figlet -w`. `align` bernilai `"left"`, `"center"` atau `"right"`; tanpa lebar, baris diratakan dalam lebar baris terlebar. Font kanan-ke-kiri seperti `ivrit` mencetak dari kanan ke kiri dan rata kanan; ganti perilaku ini dengan `direction`.

<!-- s:f8ccfce091 -->
Font yang disertakan

<!-- s:15e0b8eca7 -->
| Impor | Baris | Catatan |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Default FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Miring |
| `@textjs/font/small` | 5 | Ringkas |
| `@textjs/font/big` | 8 | Termasuk huruf Yunani |
| `@textjs/font/banner` | 8 | Bentuk huruf `#`, Katakana dan Kiril |
| `@textjs/font/block`, `lean` | 8 | Garis luar, tegak dan miring |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Bayangan jatuh |
| `@textjs/font/script`, `smscript` | 7, 5 | Huruf sambung |
| `@textjs/font/mini` | 4 | Sangat kecil |
| `@textjs/font/bubble`, `digital` | 4, 3 | Huruf dalam lingkaran dan kotak |
| `@textjs/font/ivrit` | 6 | Ibrani, kanan ke kiri |
| `@textjs/font/term` | 1 | Input apa adanya |

<!-- s:a8ecd7e9c1 -->
Setiap glif menggunakan ASCII atau Latin-1 yang dapat dicetak, sehingga setiap subkarakter berukuran tepat satu sel dalam Menlo di DevTools. `@textjs/font/all` mengekspor semuanya, beserta `BUNDLED_FONTS` untuk galeri. Font diurai saat render pertama, bukan saat diimpor.

<!-- s:74ff0f95fa -->
Font kustom

<!-- s:093892bc6a -->
Semua FIGfont dapat digunakan. Ambil font, lalu uraikan:

<!-- s:c2f4ef471e -->
Parser membaca header, baris komentar, hardblank, penanda akhir, 102 karakter wajib dan karakter bertanda kode dalam desimal, oktal atau heksadesimal. Font TOIlet `.tlf` di-render sebagai teks biasa. Utamakan font yang digambar dengan ASCII atau karakter pembentuk kotak; braille dan emoji tidak selebar satu sel dalam Menlo.

<!-- s:f64649f401 -->
Lisensi

<!-- s:adad99f0de -->
Font yang disertakan merupakan font distribusi FIGlet 2.2.5, identik hingga setiap byte, di bawah lisensi BSD 3-Clause FIGlet. Setiap font menyimpan kreditnya dalam baris komentar, yang tersedia saat runtime sebagai `font.comment`. Font populer tanpa izin redistribusi, seperti Doom, Larry 3D, ANSI Shadow dan Calvin S, tidak disertakan.

<!-- s:2a50d4cddc -->
Diverifikasi terhadap `figlet`

<!-- s:111c132fa2 -->
Rangkaian pengujian memutar ulang 273 keluaran yang direkam dari biner `figlet` 2.2.5 asli: setiap font yang disertakan dalam setiap mode layout, pembungkusan, perataan, teks kanan-ke-kiri, mode paragraf dan input regresi FIGlet sendiri. Semuanya cocok persis.
