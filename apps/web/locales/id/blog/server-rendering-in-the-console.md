<!-- s:f0ba49aa8c -->
Text.js 0.4 menambahkan tempat kedua untuk me-render halaman. Secara default, pohon React halaman berjalan di tab browser. Halaman yang mengekspor `runtime = "server"` berjalan di server, dan browser menerima frame-nya.

<!-- s:1a12ccffbb -->
`Load` adalah komponen `async function`. Di server, komponen ini menangguhkan rendering ke `<Suspense>` atau `loading.tsx` terdekat hingga promise-nya selesai, dan bisa membaca file, basis data, serta modul `node:*` secara langsung. Komponen async memuat data dan tidak bisa menggunakan hook. Komponen biasa di sekitarnya tetap menggunakan hook, fokus, `useInput`, `<Link>`, dan `useRouter()`, yang berperilaku sama di kedua runtime.

<!-- s:f6c454b214 -->
Yang diunduh browser

<!-- s:6764f4bb25 -->
Halaman yang di-render di server tidak mengirim React, Yoga, atau route Anda. Browser memuat pemutar frame berukuran sekitar 21 kB gzip, yang menyimpan `CellBuffer` dan `CssConsoleDriver` yang sama dengan yang digunakan renderer klien. Pemutar ini mengatur laju frame pada 15 fps yang sama, sehingga frame yang di-render di server menghasilkan panggilan `console.log` yang sama seperti di klien.

<!-- s:c1c4090983 -->
Protokol

<!-- s:20c7e299b3 -->
Setiap tab membuka sesinya sendiri di server: root React, riwayat router dalam memori, dan buffer sel. Satu endpoint menangani kedua arah:

<!-- s:0cce1c98cc -->
Server hanya mengirim baris yang hash-nya berubah sejak frame terakhir yang diterima koneksi tersebut. Setiap baris dikirim sebagai rentetan teks yang merujuk ke tabel gaya yang hanya menerima penambahan di akhir. Grafem lebar, klaster emoji, dan warna semitransparan tiba secara utuh.

<!-- s:bff22f361e -->
Jarak antarframe minimal 66 ms, dan setiap frame dibandingkan dengan yang terakhir diterima socket. Ketika koneksi lambat berhenti menguras buffer, state perantara dilewati, dan frame berikutnya melompat ke state terbaru.

<!-- s:f0809ea8c7 -->
Jika aliran terputus, pemutar menyambung kembali dengan ID sesinya di header `x-textjs-live` dan melanjutkan sesi yang sama dari keyframe baru, dengan state yang tetap utuh. ID sesi berupa nilai acak 192-bit yang disimpan dalam memori, tidak pernah di URL. Sesi tanpa koneksi berhenti me-render dan dilepas setelah 30 detik.

<!-- s:2c75bd5d29 -->
Kedua endpoint menolak permintaan lintas situs, dan setiap event input divalidasi berdasarkan skema tetap. Satu sesi menerima maksimal 64 event per POST dan sekitar 240 per detik.

<!-- s:a36b73dab0 -->
Komponen async dan data

<!-- s:2620366315 -->
Promise setiap komponen async disimpan dalam cache per sesi, dengan komponen dan props-nya sebagai kunci, sehingga rendering yang dicoba ulang menggunakan kembali permintaan yang sedang berlangsung. Cache dibersihkan saat route berubah dan saat Anda memanggil `router.refresh()`:

<!-- s:64ce138e40 -->
Modul khusus server diberi nama `*.server.ts`. Build gagal jika kode yang dikirim ke browser mengimpor modul tersebut, atau mengimpor modul bawaan `node:*`, dan menyebutkan pengimpornya.

<!-- s:981308ad14 -->
Prerender parsial

<!-- s:9142a7d770 -->
Prerender parsial bekerja tanpa server. `text build` kini me-render setiap route statis satu kali dan menyisipkan frame pertamanya langsung ke HTML route sebagai `<script>` klasik berukuran kecil, sehingga konsol menampilkan hasil sebelum modul apa pun dimuat.

<!-- s:d51b081ec7 -->
Shell mencakup semua yang di-render secara sinkron. Batas `<Suspense>` yang masih menunggu menampilkan fallback-nya, termasuk komponen async, dan `fetch()` tidak pernah selesai selama shell di-render.

<!-- s:33ba4145a3 -->
Saat JavaScript mulai berjalan, renderer klien atau pemutar frame mengalirkan frame yang sebenarnya. Karena 0.4 juga menambahkan frame di akhir alih-alih membersihkan konsol, renderer yang melakukan hidrasi dimulai dengan `initialClear: false` dan mencatat log di bawah shell, lalu tirainya menggeser shell keluar dari tampilan dalam proses penggambaran DevTools yang sama. Konsol dibersihkan tepat satu kali, oleh shell.

<!-- s:f6986897ee -->
Shell di-render pada ukuran `viewport` yang dikonfigurasi, secara default `120 × 36`, karena build tidak bisa mengetahui ukuran konsol pengunjung. Dengan `viewport.responsive` aktif, frame langsung pertama menyesuaikan ukurannya dengan konsol yang ditambatkan. Route dinamis tidak me-render shell, dan `ppr: false` di `text.config.ts` menonaktifkan prerender.

<!-- s:c61865edfd -->
Memilih runtime

<!-- s:aa5baec7ef -->
Runtime klien tetap menjadi default. Penekanan tombol digambar dalam task yang sama, dan aplikasi bisa di-deploy ke hosting statis mana pun. Runtime server cocok untuk dasbor dan tampilan admin yang membaca data privat, serta route dengan dependensi yang tidak Anda inginkan di bundel browser. Satu aplikasi bisa menggabungkan keduanya, dan navigasi di antara keduanya memuat URL tujuan sebagai dokumen baru.

<!-- s:68f8c75df7 -->
Referensi lengkap ada di [Rendering di server](/docs/server-rendering).
