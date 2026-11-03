<!-- s:df706c7a4d -->
`eslint-plugin-textjs` mendeteksi kesalahan Text.js di editor: tag DOM dalam komponen konsol, kotak di dalam teks, glif yang tidak tersedia di Menlo, pemanggilan `console.log` yang terselip, dan ekspor App Router yang diabaikan tanpa pemberitahuan.

<!-- s:0ecddf15e1 -->
Penyiapan

<!-- s:5d60a92733 -->
Plugin ini mendukung ESLint 9 dan 10 dengan konfigurasi flat. Aturannya bersifat sintaktis dan tidak memerlukan informasi tipe atau `parserOptions.project`. Parser apa pun yang memahami TypeScript dan JSX dapat digunakan.

<!-- s:b69abcef52 -->
Konfigurasi

<!-- s:9cfe4adde3 -->
| Konfigurasi | Yang diaktifkan |
| :-- | :-- |
| `textjs.configs.recommended` | Semua aturan kebenaran sebagai kesalahan; aturan konsol, timer, dan pengaturan interval frame sebagai peringatan |
| `textjs.configs.strict` | Semuanya sebagai kesalahan, ditambah `prefer-use-keymap` sebagai peringatan |

<!-- s:6c9781312c -->
Atau pilih aturan satu per satu:

<!-- s:ec6eb92cf0 -->
File konsol

<!-- s:04573fe453 -->
Sebagian besar aturan hanya berlaku untuk file yang melakukan rendering ke konsol: file yang mengimpor komponen atau hook (`Box`, `Text`, `useInput`, …) dari `@textjs/app` atau `@textjs/react`. File yang mengimpor `react-dom` atau `@textjs/react/dom` adalah kode halaman dan tidak diperiksa, sehingga situs web dapat menggabungkan halaman DOM dan aplikasi konsol dalam satu proyek. Mengimpor utilitas seperti `tokenize` atau `parseMarkdown` tidak menjadikan suatu file sebagai file konsol.

<!-- s:96e9c86b58 -->
Aturan App Router mengikuti nama file (`page.tsx`, `layout.tsx`, `route.ts`, …) di dalam direktori `app/` mana pun, termasuk `src/app/`. Jika direktori Anda memiliki nama lain, teruskan `{ appDir: "routes" }` ke `valid-route-module`, `valid-metadata`, dan `route-handler-exports`.

<!-- s:b66542635d -->
Aturan

<!-- s:c1b57ad8e2 -->
| Aturan | Rekomendasi | Perbaikan |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | kesalahan | saran |
| [`no-box-in-text`](#no-box-in-text) | kesalahan | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | kesalahan | perbaikan otomatis, saran |
| [`no-console-in-components`](#no-console-in-components) | peringatan | saran |
| [`prefer-use-interval`](#prefer-use-interval) | peringatan | saran |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | peringatan | |
| [`prefer-use-keymap`](#prefer-use-keymap) | hanya strict | |
| [`valid-route-module`](#valid-route-module) | kesalahan | |
| [`valid-metadata`](#valid-metadata) | kesalahan | |
| [`route-handler-exports`](#route-handler-exports) | kesalahan | saran |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, elemen kustom, dan tag DOM lainnya tidak tersedia di konsol. Reconciler hanya mengenali node host miliknya sendiri dan melempar `TX003` untuk yang lainnya.

<!-- s:bd7c3e0318 -->
Saran ini mengganti tag dengan komponen terdekat (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) dan menambahkan impor.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` adalah rangkaian span bergaya; komponen ini tidak dapat berisi kotak. Menyarangkan `<Box>` atau komponen apa pun yang berakar pada kotak (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) akan melempar `TX004` saat rendering. Aturan ini mendeteksinya di editor, termasuk di dalam `&&`, ekspresi ternary, fragmen, dan `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js menata setiap karakter dalam kisi sel tetap. Glif yang tidak tersedia di Menlo, font konsol DevTools di macOS, dirender menggunakan font cadangan yang lebih lebar dari satu sel, sehingga setiap sel setelahnya bergeser.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, frame spinner terminal klasik): gunakan karakter blok atau kuadran (`▘▝▗▖`), `<Spinner variant="dots">` atau `marker="quadrant"` pada grafik. Tetapkan `{ allowBraille: true }` untuk aplikasi yang hanya berjalan dengan `text run` di terminal.
- **Simbol dan panah lainnya** (U+2B00–U+2BFF, seperti persegi kecil U+2B1D): saran menawarkan padanan di Menlo (`·`, `●`, `←`).
- **Tampilan emoji pada simbol satu sel** (`▶` atau `↩` diikuti U+FE0F): pemilih variasi mengubahnya menjadi emoji dua sel sementara kisi menyediakan satu sel. Perbaikan otomatis menghapus pemilih tersebut.

<!-- s:8c0c49dfb7 -->
Emoji lebar (`🚀`, `✅`) tidak bermasalah: Text.js mengukurnya sebagai dua sel.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Setiap frame adalah satu `console.log`. Log Anda sendiri muncul di antara frame, tergulir keluar oleh frame berikutnya, dan tersembunyi dalam tampilan yang selalu mengikuti bagian terbawah. `console.clear()` menghapus aplikasi itu sendiri.

<!-- s:0011d5dcff -->
Tampilkan pesan di UI dengan `useToast()` atau `<ScrollBox>` log, atau periksa state di Dev Overlay `[▼]` (`` Ctrl+` ``). Dengan `logger`, saran mengubah `console.warn(…)` menjadi `log.warn(…)`. File pengujian dan rendering `@textjs/app/testing` dilewati.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
`setInterval` yang digunakan langsung dalam komponen memerlukan effect, cleanup, dan ref untuk menghindari state kedaluwarsa. `useInterval` menangani ketiganya, dan `null` menghentikannya.

<!-- s:894ec09a45 -->
Untuk animasi, `useAnimationFrame` mengikuti pengaturan interval frame renderer dan berhenti saat output dijeda. Lihat [Hook utilitas](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js mengeluarkan paling banyak satu frame setiap 66 ms (sekitar 15 fps). Interval 16 ms melakukan rendering empat kali per frame yang dikeluarkan; frame tambahan digabungkan dan hanya menghabiskan CPU. Aturan ini melaporkan jeda `setInterval`/`useInterval` di bawah `minInterval` (default `66`) dan `useAnimationFrame` dengan `fps` di atas 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Membandingkan `e.key` secara manual berfungsi, tetapi pintasannya tidak terlihat. `useKeymap` menempatkan binding berlabel di `<KeyHelp>`, `<KeyHints>` (binding dengan `hint: true`), dan palet perintah, menangani urutan seperti `g g`, serta menghentikan propagasi untuk tombol yang cocok. Aturan ini melaporkan handler `useInput` yang membandingkan dua atau lebih literal tombol (`minKeys`) dan melewati handler yang membaca `e.input` untuk pengetikan.

<!-- s:05d39412dc -->
Lihat [Pintasan keyboard](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- File `page`, `layout`, `loading`, `error`, dan `not-found` harus mengekspor komponen sebagai ekspor default (`TX015`).
- `export const dynamic` harus bernilai `"auto"`, `"force-static"`, atau `"force-dynamic"` (`TX031`). Text.js tidak mendukung `"error"` milik Next.js. Nilai ini dibaca dari halaman, layout, dan route handler. Dalam halaman dan layout, tulis sebagai literal string biasa: `text build` membacanya dari kode sumber tanpa menjalankan modul.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata digabungkan dari layout, lalu halaman (atau `not-found`). Aturan ini melaporkan hal yang akan diabaikan router tanpa pemberitahuan:

<!-- s:fe9ebcbc0c -->
- `metadata` atau `generateMetadata` dalam file `loading` atau `error`
- kedua ekspor dalam satu file
- `async generateMetadata`: fungsi ini dipanggil secara sinkron, sehingga Promise tidak pernah menetapkan judul
- `title` yang bukan string atau `{ default, template?, absolute? }`, atau key yang salah eja
- `title.template` tanpa `%s`, atau dalam halaman, tempat nilai ini tidak berpengaruh
- `description` yang bukan string

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
File `route.ts` hanya menjawab metode HTTP yang diekspornya: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, dan `OPTIONS`. `get` atau `Post` dengan huruf kecil tidak pernah dipanggil (permintaan mendapat `405`); saran mengganti namanya. Ekspor default, handler yang bukan fungsi, dan ekspor lainnya dilaporkan, kecuali [konfigurasi segmen route](/docs/caching) `dynamic` dan `revalidate`. Pindahkan kode bersama ke `lib/`, atau cantumkan nama tambahan dengan `{ allow: [...] }`.
