<!-- s:5a6798e6a5 -->
Hari ini kami merilis Text.js 1.0, framework konsol untuk web.

<!-- s:e4787165f5 -->
Text.js me-render aplikasi React 19 di dalam konsol Chrome DevTools, dengan layout, routing, fokus, input, formulir, grafik, dan streaming Markdown yang digambar menggunakan `console.log`.

<!-- s:48b184a262 -->
Isi versi 1.0

<!-- s:7f7f2a9a76 -->
- **App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx`, dan `api/*/route.ts`, disinkronkan dengan `window.location`. Ini mengikuti konvensi App Router Next.js.
- **Turbolog.** Yoga flexbox menata kisi sel, `CellBuffer` berbasis typed array menampungnya, dan encoder run-length mengubahnya menjadi satu panggilan `console.log(format, ...css)`. Frame idle tidak membuat panggilan konsol.
- **Kit komponen.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` tervirtualisasi, `Table`, `Tree`, grafik, dialog, toast, dan palet perintah `Ctrl+K` dari `useKeymap`.
- **Frame yang ditambahkan di akhir.** Frame ditambahkan di bawah frame sebelumnya, sehingga konsol tidak berkedip kosong di antara frame. Selengkapnya di [Turbolog: menghilangkan kedipan](/blog/turbolog-eliminating-the-flash).
- **Teks kanan ke kiri.** Teks Ibrani dan Arab di-render dalam urutan visual dengan pembentukan huruf Arab, dari implementasi UAX #9 yang lolos seluruh 770.241 kasus `BidiTest.txt`. Lihat [Teks kanan ke kiri di konsol](/blog/right-to-left-text).
- **Konsol responsif.** Text.js menyesuaikan ukuran panel DevTools yang ditambatkan, termasuk zoom halaman dan toolbar yang berganti baris. Saat dilepas, ukurannya kembali ke `120×36`.
- **`text run`.** Aplikasi App Router yang sama di-render di terminal sungguhan.
- **Alat untuk agen dan editor.** `text mcp` menyajikan aplikasi Anda ke agen pemrograman melalui Model Context Protocol, dan ekstensi Text.js DevTools menambahkan panel di sebelah Konsol. `eslint-plugin-textjs` dan ekstensi VS Code juga menjadi bagian dari 1.0.

<!-- s:b71c4a16bc -->
Satu perubahan nama

<!-- s:b47aa37902 -->
Paket framework kini bernama `@textjs/next`. Nama `textjs` sudah dipakai di npm. Perbarui impor Anda:

<!-- s:e4005009f1 -->
**Pembaruan, 1.0.2:** paket ini kini bernama `@textjs/app`, dan `@textjs/next` sudah usang. Untuk beralih, jalankan `bun remove @textjs/next && bun add @textjs/app` dan impor dari `@textjs/app`.

<!-- s:5b35a47b90 -->
Angka

<!-- s:2ee54da34c -->
Pada dasbor padat `100×32` (46 node teks, 149 span `%c`), diukur dengan `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Frame | Rata-rata |
| :-- | --: |
| Penggambaran ulang penuh (layout, penggambaran, pengodean) | 0,163 ms |
| Pengeditan satu baris (mengetik) | 0,011 ms |
| Idle | 0,000 ms, 0 panggilan konsol |

<!-- s:2fee8c4c3d -->
Frame yang tidak berubah kembali sebelum mengalokasikan string, sehingga frame idle terukur 0,000 ms.

<!-- s:a0fa47c98f -->
Coba

<!-- s:aeb9cc2b5d -->
Buka [textjs.org](/) dan tekan ⌘⌥J (Ctrl+Shift+J di Windows dan Linux). Situs ini menjalankan aplikasi Text.js di konsol Anda, satu tampilan per halaman. [Playground](/playground) menyediakan dasbor, streaming Markdown, dan Snake. [OpenCode](/opencode) terhubung ke server OpenCode lokal Anda.

<!-- s:31dd2e762c -->
Daftar lengkap perubahan ada di [catatan perubahan](/changelog), dan kode sumbernya ada di [GitHub](https://github.com/anomalyco/textjs).
