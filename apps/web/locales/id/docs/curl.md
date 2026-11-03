<!-- s:5f3abb073d -->
Klien HTTP terminal menerima frame pertama halaman sebagai teks ANSI truecolor, bukan dokumen HTML. Anda tidak perlu mengonfigurasi apa pun.

<!-- s:f501ff55e0 -->
Permintaan yang menerima frame

<!-- s:3384141bb9 -->
Permintaan menerima frame ketika semua syarat berikut terpenuhi:

<!-- s:05a334e510 -->
- metodenya `GET` atau `HEAD`;
- `User-Agent` diawali dengan `curl/`, `Wget/`, `wget2/`, `HTTPie/` atau `xh/`;
- header `Accept` tidak ada atau tidak menyebutkan `text/html`.

<!-- s:4af297e372 -->
Browser, crawler, dan pratinjau tautan menerima halaman HTML. Untuk mendapatkan HTML dari curl, minta secara eksplisit:

<!-- s:03dba887a9 -->
Frame dipilih pada tahap halaman akan disajikan: setelah [middleware](/docs/middleware), `rewrites` dan [route handler](/docs/route-handlers), dan tidak pernah untuk file atau path yang segmen terakhirnya mengandung titik. Pengalihan middleware, `401`, header, dan rewrite berlaku untuk curl seperti halnya untuk browser. `/api/health` tetap menjalankan handler-nya dan `/robots.txt` tetap menyajikan file.

<!-- s:e0c4f5f416 -->
Isi frame

<!-- s:50fa4581ec -->
Frame adalah hasil render pertama halaman, seperti pada [shell yang di-prerender](/docs/server-rendering#partial-prerendering): setiap batas `<Suspense>` yang masih menunggu menampilkan fallback-nya. Komponen server asinkron tidak berjalan, dan `fetch()` tidak pernah selesai, sehingga data yang dimuat dalam effect tetap dalam status pemuatan.

<!-- s:08efeec61a -->
- **Ukuran:** 80 × 24 sel. Aplikasi dengan viewport tetap (`viewport.responsive: false`) menggunakan `viewport.width × viewport.height` sebagai gantinya.
- **Warna:** Kode escape SGR 24-bit dalam `viewport.theme` aplikasi. Setiap baris diakhiri dengan reset, dan frame diakhiri dengan karakter baris baru.
- **Status:** `200`, atau `404` dengan halaman tidak ditemukan milik aplikasi ketika tidak ada halaman yang cocok atau halaman memanggil `notFound()`. Halaman yang memanggil `redirect()` saat rendering menyajikan HTML.

<!-- s:1125803eb1 -->
Respons berupa `text/plain; charset=utf-8` dengan `Vary: User-Agent, Accept` dan `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, sehingga cache bersama tidak pernah menyimpan frame lalu menyajikannya ke browser. Halaman HTML pada path tempat curl menerima frame membawa header `Vary` yang sama.

<!-- s:0e2aba0a67 -->
Dukungan host

<!-- s:d40234848f -->
| Host | Halaman statis | Halaman dinamis, path tidak dikenal |
| :-- | :-- | :-- |
| `text dev` | Di-render saat diminta | Di-render saat diminta |
| `text start`, `bun` | Di-prerender oleh `text build` | Di-render saat diminta |
| `vercel`, `cloudflare` | Di-prerender oleh `text build` | Halaman HTML |
| `static` | Halaman HTML | Halaman HTML |

<!-- s:11c905d6a6 -->
Halaman yang di-render di server memerlukan `text start` atau `bun` (lihat [Deploy](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Host statis tidak bisa memberikan respons berbeda untuk setiap klien, sehingga adapter `static` tidak mendukung frame. Di Vercel dan Cloudflare, frame untuk halaman statis disertakan dalam build. Halaman dinamis (`[id]`, `force-dynamic`) menyajikan HTML di sana, karena adapter `vercel` dan `cloudflare` tidak me-deploy renderer.

<!-- s:022d3d5541 -->
`text start` dan `bun dist/server.js` me-render halaman yang tersisa saat diminta dengan `.text/server/live.mjs`, dan menyimpan 128 frame terakhir selama 10 detik. Setiap server me-render paling banyak 20 halaman yang belum di-cache per 10 detik. Setelah batas itu, curl menerima halaman HTML hingga kuota terisi kembali. Jika `live.mjs` tidak bisa dimuat di server, misalnya karena modul halaman membaca `window` pada tingkat teratas, halaman tersebut menyajikan HTML.

<!-- s:2500855fbd -->
`text build` melaporkan frame yang di-prerender:

<!-- s:37f210b46a -->
Konfigurasi

<!-- s:ac46338e16 -->
Ubah ukuran untuk seluruh aplikasi, atau nonaktifkan frame:

<!-- s:36fb2e113c -->
Halaman dapat mengubah ukurannya sendiri, atau menyajikan HTML ke terminal juga:

<!-- s:11c75396f6 -->
Ukuran dibatasi pada 1–500 sel. Dengan `ansi: false` dalam `text.config.ts`, ekspor halaman diabaikan.

<!-- s:17ae9b44af -->
HTTP biasa

<!-- s:e9b0dd23eb -->
curl tidak mengikuti pengalihan kecuali Anda menyertakan `-L`. Vercel mengalihkan permintaan `http://` ke `https://`, begitu pula Cloudflare jika **Selalu gunakan HTTPS** aktif, sehingga `curl http://…` mencetak pengalihan, bukan frame. Bagikan URL `https://`.

<!-- s:740b32f53f -->
Server kustom

<!-- s:144c78c64b -->
`@textjs/app/ansi` mengekspor helper deteksi dan respons, untuk server dan fungsi yang tidak menjalankan `text start` atau adapter:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` juga menerima `(method, headers)` dengan Web `Headers` atau `IncomingHttpHeaders` milik Node. `frameToAnsi(buffer, { theme })` mengodekan `CellBuffer` yang telah di-render dengan cara yang sama seperti framework.
