<!-- s:00c66df67a -->
Text.js 0.1 telah diberi tag. Ini versi pertama dengan ketiga lapisan: `@textjs/core` menggambar frame ke konsol, `@textjs/react` merender React 19 ke dalam frame tersebut, dan `textjs` menambahkan App Router serta CLI.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
Route berupa folder di `app/`, mengikuti konvensi App Router Next.js. Berikut template `dashboard` dari `create-text-app`:

<!-- s:18fa0019a3 -->
Layout membungkus setiap halaman di bawahnya dan mempertahankan state saat navigasi. `<Link>` menerima `shortcut`, sehingga satu tombol dapat membuka tautan tersebut, dan `activeClassName` mengatur gaya tautan ke route saat ini:

<!-- s:5587be498a -->
Segmen dinamis bekerja dengan cara yang sama seperti di Next.js. `[id]` menjadi parameter, `[...slug]` menangkap sisa path dan `[[...slug]]` juga cocok dengan induknya. Segmen statis lebih diprioritaskan daripada segmen dinamis, dan grup route seperti `(marketing)` mengatur file tanpa menambah URL.

<!-- s:3a9a93d850 -->
`loading.tsx` dan `error.tsx` membungkus segmen dalam Suspense boundary dan error boundary. Komponen error menerima error dan fungsi `reset`:

<!-- s:142b529e3f -->
Route handler berada di `app/api` dan mengembalikan `Response` standar:

<!-- s:fe0c29445c -->
Router menjaga sinkronisasi `window.location` melalui `history.pushState`, sehingga Kembali, Maju, dan tautan langsung berfungsi, serta menulis `metadata.title` ke `document.title`. Aplikasi menggambar di konsol, dan halaman menampung focus pad yang mengumpulkan input.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` menjalankan Vite dengan React Fast Refresh. Menyimpan file memperbarui konsol di tempat.
- `text build` menulis build produksi aplikasi beserta route handler-nya.
- `text start` menyajikan build dan route handler.

<!-- s:1e1161891f -->
`create-text-app` membuat kerangka proyek dari template `starter` atau `dashboard`.

<!-- s:e2a33d088a -->
Inspektur

<!-- s:cdb3155210 -->
Tekan `` Ctrl+` `` atau `F2` pada aplikasi yang sedang berjalan untuk membuka inspektur `[▼]` di dalam konsol. Inspektur menampilkan route yang cocok beserta parameternya, ukuran frame, jumlah span dan durasi tiap fase, serta jumlah frame yang dilewati dirty gate. `W` menggambar layout Yoga sebagai wireframe.

<!-- s:c2600ceabc -->
Juga di 0.1

<!-- s:289b0a9973 -->
`@textjs/react` menyertakan komponen PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), utilitas `className` bergaya Tailwind yang bekerja dalam sel, serta tema. Layout berjalan menggunakan Yoga di WebAssembly.

<!-- s:8ad0f2154c -->
Daftar lengkapnya ada di [catatan perubahan](/changelog#v0-1-0).
