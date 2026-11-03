<!-- s:5c794493de -->
Render pohon React sebuah route di server dan alirkan frame-nya ke konsol. Prerender frame pertama setiap route statis ke dalam HTML-nya.

<!-- s:f5f9690d9e -->
Dua runtime

<!-- s:26b5b0c1e5 -->
Setiap halaman di-render di salah satu dari dua tempat:

<!-- s:2b217df435 -->
| | Klien (default) | Server (`runtime = "server"`) |
| --- | --- | --- |
| Pohon React berjalan di | Tab browser | `text dev` / `text start` / adaptor `bun` (Bun atau Node) |
| Yang diunduh browser | Aplikasi lengkap: React, Yoga WASM, route Anda | Pemutar frame, sekitar 21 kB gzip |
| Akses data | `fetch()` ke route handler | Langsung: basis data, file, `node:*`, rahasia |
| Komponen asinkron | Gunakan `use()` atau efek | Komponen `async function` didukung |
| Latensi penekanan tombol | Task yang sama, sinkron | Satu perjalanan bolak-balik ke server |
| Berfungsi di host statis | Ya | Tidak, memerlukan `text start` atau `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Kedua runtime menghasilkan frame yang sama. Pemutar frame mengodekan sel dengan `CssConsoleDriver` yang sama dan berjalan pada laju yang sama, sekitar 15 fps, sehingga frame yang di-render di server cocok dengan panggilan `console.log` klien byte demi byte.

<!-- s:70a0b18bdd -->
Mengaktifkan

<!-- s:660b2936b0 -->
Ekspor `runtime` dari sebuah halaman:

<!-- s:567f4b3d2b -->
`runtime` dibaca per halaman sebagai ekspor string statis (anotasi tipe, `as const`, atau ekspor ulang diperbolehkan; nilai hasil komputasi tidak). Layout, `loading.tsx`, `error.tsx`, dan `not-found.tsx` di-render di tempat halamannya di-render: layout yang digunakan bersama oleh halaman klien dan server berjalan di kedua tempat dan dikirim ke browser, sementara layout dan boundary segmen yang hanya berisi halaman server tetap di server. Hook, fokus, `useInput`, `<Link>`, dan `useRouter()` berperilaku sama seperti di klien.

<!-- s:43c4fa1dac -->
Memilih runtime

<!-- s:ac38ce3c55 -->
Gunakan runtime **klien** (default) untuk:

<!-- s:ced9e65891 -->
- UI yang banyak melibatkan pengetikan, dengan setiap penekanan tombol harus digambar dalam task yang sama, seperti editor dan filter.
- Aplikasi yang di-deploy ke host statis atau CDN.
- Alat yang bisa digunakan secara offline.

<!-- s:54292284aa -->
Gunakan runtime **server** untuk:

<!-- s:bb8a20e6e2 -->
- Dasbor dan tampilan admin yang membaca basis data, file, antrean, atau API privat. Kredensial tetap di server.
- Route dengan dependensi berat (SDK, parser, tabel sintaks) yang tidak Anda inginkan dalam bundel browser.
- Halaman yang harus dimuat cepat di jaringan lambat. Browser mengunduh pemutar berukuran 21 kB (gzip), bukan aplikasi lengkap.

<!-- s:920f4ad7e8 -->
Anda bisa mencampur runtime dalam satu aplikasi. Navigasi di antaranya memuat URL tujuan sebagai dokumen baru. Bundel browser mengganti setiap halaman server dengan stub, sehingga modul server dan apa pun yang diimpornya tidak pernah dikirim ke klien.

<!-- s:2de98cc507 -->
Beri nama modul khusus server `*.server.ts`. Build gagal jika kode yang dikirim ke browser (halaman klien atau layout yang digunakan halaman klien) mengimpor modul `*.server.*` atau modul bawaan `node:*`, dengan menyebutkan pengimpornya.

<!-- s:1c109f371d -->
[Middleware](/docs/middleware) melindungi route server dengan cara yang sama seperti melindungi dokumen: middleware berjalan untuk route tujuan sebelum sesi dibuka, sebelum setiap navigasi dalam sesi (`router.push`, Kembali dan Maju), dan setiap kali cookie sesi atau `Authorization` berubah. Saat middleware akan mengalihkan, menolak, atau menulis ulang, browser memuat URL sebagai dokumen, dan middleware menjawab permintaan tersebut.

<!-- s:44ec23073a -->
Komponen server asinkron

<!-- s:491e80d70d -->
Di server, setiap komponen `async function` menangguhkan rendering ke `<Suspense>` atau `loading.tsx` terdekat sampai promise-nya selesai:

<!-- s:155b6ae10f -->
Setiap promise disimpan dalam cache per sesi dengan kunci berdasarkan komponen dan props, sehingga render yang dicoba ulang menggunakan kembali permintaan yang sudah berjalan. Cache dikosongkan saat route berubah dan saat `router.refresh()` dipanggil. Untuk mengakses ulang data setelah input, panggil `router.refresh()`:

<!-- s:abfa753a7c -->
Props yang diteruskan ke komponen asinkron harus bisa diserialisasi: string, angka, objek biasa, array, `Date`, `URL`, `Map`, `Set`, dan elemen. Props berupa fungsi bukan bagian dari kunci (teruskan data, bukan callback). Setiap sesi menyimpan paling banyak 256 promise dalam cache. Anda juga bisa membungkus komponen secara manual dengan `serverComponent(fn)` dari `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Hook (`useState`, `useInput`, …) tidak berfungsi di dalam komponen `async function`. Render komponen biasa di sekeliling atau di bawahnya untuk interaksi.

<!-- s:5ae438610c -->
Cara kerja

<!-- s:ec3e56dbc6 -->
- **Satu sesi per tab.** Setiap pemuatan halaman membuka sesinya sendiri: root React, riwayat router dalam memori, dan buffer sel di server. ID sesi adalah nilai acak 192-bit yang hanya disimpan browser dalam memori.
- **Delta sel.** Server hanya mengirim baris yang hash-nya berubah sejak frame terakhir yang diterima koneksi tersebut. Setiap baris dikirim sebagai rangkaian teks yang merujuk ke tabel gaya yang hanya menerima penambahan di akhir, dan grafem lebar, kelompok emoji, serta warna translusen tetap dipertahankan persis.
- **Backpressure.** Jarak antar-frame setidaknya 66 ms, dan setiap frame dibandingkan dengan data terakhir yang diterima soket. Saat koneksi lambat berhenti menguras data, status perantara dilewati, dan frame berikutnya langsung melompat ke status terbaru.
- **Koneksi ulang.** Jika aliran terputus, pemutar menghubungkan ulang dengan ID sesinya di header `x-textjs-live` (tidak pernah di URL) dan melanjutkan sesi yang sama, dengan status tetap utuh, dari keyframe baru. Pembaruan bilah alamat yang terlewat diputar ulang. Sesi tanpa koneksi berhenti me-render dan dilepas setelah 30 detik; jika server melupakannya, pemutar membuka sesi baru.
- **Riwayat.** Kembali dan Maju menggeser kedua riwayat dengan jumlah entri yang sama, dan `router.back()` di server juga menggeser riwayat browser.
- **Keamanan.** Kedua endpoint menolak permintaan lintas situs (`Sec-Fetch-Site` dan `Origin`; `X-Forwarded-Host` hanya diperhitungkan dengan `server.trustProxy`). POST input memerlukan body JSON dan header `x-textjs-live`. Setiap event divalidasi terhadap skema tetap, dan tujuan navigasi harus berupa path pada origin Anda. Hanya halaman dalam manifes `app/` Anda yang bisa di-render. Sesi terikat pada cookie yang digunakan saat sesi dibuka.
- **Batas.** Paling banyak 64 event per POST dan sekitar 240 per detik per sesi (`429` jika melebihi), batas waktu body 5 detik, 32 sesi per alamat klien, dan `maxSessions` per proses (sesi yang paling lama terputus dikeluarkan terlebih dahulu).

<!-- s:981308ad14 -->
Prerender parsial

<!-- s:294fed5642 -->
`text build` me-render setiap route statis satu kali, pada ukuran `viewport` yang dikonfigurasi, dan menyisipkan frame pertama tersebut langsung ke HTML route sebagai `<script>` klasik berukuran kecil. Konsol menggambar sebelum modul apa pun dimuat:

<!-- s:7eb15c9cc8 -->
1. **Shell statis.** Semua yang di-render secara sinkron. Setiap boundary `<Suspense>` yang masih menunggu menampilkan fallback-nya, termasuk komponen server asinkron (yang tidak berjalan saat shell di-render), `use()`, dan modul lazy. `fetch()` tidak pernah selesai saat shell di-render, sehingga data yang dimuat dalam efek juga tetap dalam status pemuatan.
2. **Celah dinamis.** Saat JavaScript mulai berjalan, renderer klien atau pemutar frame mengalirkan frame yang sebenarnya. Frame ditambahkan di akhir, di bawah shell, dan tirai milik frame yang melakukan hidrasi menggeser shell keluar dari pandangan dalam proses penggambaran DevTools yang sama. Shell mencatat waktu penggambarannya, sehingga frame hidrasi pertama menunggu hingga jendela pascapembersihan DevTools berakhir alih-alih masuk ke jalur lambatnya.

<!-- s:94c6827f2c -->
Selama pemuatan, hanya shell yang membersihkan konsol. Renderer yang melakukan hidrasi dimulai dalam mode menambahkan di akhir (`initialClear: false`), sehingga tidak ada kedipan, dan shell hanya menggambar pada path yang menjadi tujuan render-nya. Route dinamis (`[id]`, `force-dynamic`) tidak me-render shell.

<!-- s:1eef464bae -->
Nonaktifkan dengan `ppr: false` di `text.config.ts`. Prerender menjalankan komponen Anda saat build, jadi pastikan kode tingkat atas modul bebas dari variabel global khusus browser. Route yang melempar error, memanggil `redirect()` / `notFound()`, atau melakukan navigasi saat prerender tidak mendapat shell (layar error tidak pernah disematkan ke HTML), dan build memberi tahu alasannya.

<!-- s:c50a022df3 -->
Shell di-render pada ukuran `viewport.width × viewport.height` (default `120 × 36`) karena build tidak bisa mengetahui ukuran konsol pengunjung; frame yang melakukan hidrasi kemudian menyesuaikan ukuran dengan konsol sebenarnya. Shell berupa `<script>` inline: jika Content Security Policy melarang skrip inline, izinkan melalui hash atau tetapkan `ppr: false`.

<!-- s:ff96d35008 -->
Deploy

<!-- s:e8a05a5448 -->
`text build` menulis file berikut:

<!-- s:8e75669ec0 -->
| File | Tujuan |
| --- | --- |
| `index.html`, `<route>/index.html` | Route klien beserta shell-nya. Berfungsi di host statis mana pun. |
| `assets/player-[hash].js` | Pemutar frame. |
| `.text/server/live.mjs` | Route server, App Router, dan renderer konsol. |
| `.text/pages/…`, `.text/live.html` | Dokumen route server. |
| `.text/ansi/…` | Frame pertama untuk [curl dan klien terminal lainnya](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` dan [adaptor `bun`](/docs/deploying#bun) menyajikan semuanya. Route server memerlukan proses yang berjalan lama: adaptor `static`, `vercel`, dan `cloudflare` menggagalkan build (`TX030`).
