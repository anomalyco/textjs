<!-- s:263d7e4a86 -->
Ekstensi Text.js DevTools menambahkan panel **Text.js** di sebelah Konsol. Ekstensi ini memeriksa aplikasi yang melakukan rendering di konsol.

<!-- s:becd3b25ff -->
- **Komponen:** pohon React dari setiap root konsol, beserta prop, hook, key, dan node scene `tx-box` / `tx-text` di baliknya, yang ditata dalam sel.
- **Frame:** frame saat ini dalam bentuk kisi sel. Arahkan kursor ke sel untuk melihat komponen yang menggambarnya. Klik untuk memilih node. Node tersebut disorot di konsol yang sedang berjalan.
- **Linimasa:** waktu React, layout, paint, dan encode per frame, frame yang dilewati dibandingkan dengan yang dikeluarkan, pengaturan interval frame, dan span `%c`.
- **Kontrol:** jeda dan lanjutkan keluaran, aktifkan atau nonaktifkan wireframe layout, kunci atau sesuaikan ukuran kisi, salin frame sebagai teks.

<!-- s:98304b8243 -->
Instalasi

<!-- s:2452819f12 -->
Ekstensi dibangun dari `packages/devtools-extension` dan dimuat tanpa dikemas:

<!-- s:3754c750b3 -->
1. Buka `chrome://extensions` dan aktifkan **Mode pengembang**.
2. Klik **Muat yang belum dipaketkan** dan pilih `packages/devtools-extension/dist`.
3. Muat ulang aplikasi Anda dan buka DevTools. Panel **Text.js** muncul setelah halaman membuat root konsol.

<!-- s:e0c59fa53a -->
Proses build juga menulis `release/textjs-devtools-<version>.zip`, yang siap untuk Chrome Web Store.

<!-- s:364bc3ef6f -->
Komponen

<!-- s:e1204a3559 -->
Pilih komponen untuk melihat prop, hook dalam urutan pemanggilan (`State`, `Ref`, `Memo`, `Effect`, dan seterusnya, beserta nilai saat ini), serta node scene yang direndernya, dengan posisi, ukuran, dan inset kotak dalam sel. Mengarahkan kursor ke baris akan menyorot node di konsol. **Node host** menampilkan atau menyembunyikan elemen `tx-box` dan `tx-text` di antara komponen.

<!-- s:77b62adc9c -->
Pohon diperbarui setelah commit selama panel terbuka. Nilai merupakan ringkasan untuk ditampilkan, bukan objek aktif.

<!-- s:a0d819048c -->
Frame

<!-- s:2cceea6000 -->
Inspektur frame menggambar buffer sel milik renderer: setiap glif, warna latar depan, latar belakang, dan atribut. Mengarahkan kursor ke sel akan menampilkan karakter dan warnanya, node scene teratas pada sel tersebut menurut urutan paint (dengan memperhitungkan `overflow`, offset gulir, dan `zIndex`), serta komponen yang me-render node itu. Mengeklik akan memilih node di **Komponen** dan menyorotnya di konsol yang sedang berjalan dengan overlay sorotan milik renderer itu sendiri.

<!-- s:57a8990372 -->
Linimasa

<!-- s:2187cf7a17 -->
Setiap batang mewakili satu frame renderer:

<!-- s:f53def4922 -->
| Fase | Pengukuran |
| --- | --- |
| React | Pekerjaan React sinkron yang dituntaskan pada awal frame |
| Layout | Layout Yoga |
| Paint | Rasterisasi scene ke buffer sel |
| Encode | Pembuatan string format `%c` dan pemanggilan `console.log()` |

<!-- s:9b988f3cfb -->
Frame yang dilewati digambar redup: tidak ada perubahan, jadi tidak ada yang dicatat ke log. Grafik interval frame menunjukkan jeda antarframe yang dikeluarkan dibandingkan dengan interval minimum 66 ms.

<!-- s:8abccb04ec -->
Pengukuran waktu berhenti pada `console.log()`. Pemformatan dan penggambaran pesan berlangsung di dalam DevTools dan tidak bisa diamati dari halaman, sehingga linimasa tidak menampilkannya. Rendering konkuren yang melakukan commit di antara frame dihitung sebagai commit, tanpa pengukuran waktu.

<!-- s:5ae438610c -->
Cara kerja

<!-- s:1dda342130 -->
Seperti React DevTools, ekstensi memasang hook global sebelum halaman berjalan:

<!-- s:5a865fb9ae -->
Setiap root konsol mendaftar ke hook tersebut saat dibuat. Tanpa ekstensi, hook tidak ada, dan root hanya memeriksa keberadaannya sekali tanpa melakukan pekerjaan per frame. Saat ekstensi terpasang tetapi panel tertutup, setiap frame memerlukan satu pembacaan properti. Pohon dan frame hanya dihitung saat panel memintanya.

<!-- s:843fc9a8ad -->
Pesan mengalir dari halaman → content script → service worker → panel. Content script berjalan di setiap halaman agar hook tersedia sebelum aplikasi Anda dimulai. Itulah satu-satunya akses yang diminta ekstensi. Ekstensi tidak memuat kode jarak jauh dan tidak mengirim apa pun ke luar komputer.

<!-- s:e425f181df -->
Privasi

<!-- s:f2cd52a110 -->
Ekstensi tidak mengumpulkan data. Ekstensi tidak membuat permintaan jaringan, tidak menyimpan apa pun, dan tidak memiliki analitik. Pohon komponen, frame, dan data waktu hanya berpindah antara halaman dan panel DevTools dalam browser yang sama, lalu dibuang saat Anda menutup DevTools. **Salin frame** menulis teks frame ke papan klip saat Anda mengekliknya.

<!-- s:639d5ea4c0 -->
Keterbatasan

<!-- s:153a772b79 -->
- Chrome dan browser berbasis Chromium, versi 111 atau lebih baru.
- Aplikasi yang dimulai sebelum ekstensi dipasang perlu dimuat ulang.
- Hanya frame teratas pada tab yang diperiksa.
- Waktu berasal dari `performance.now()`, yang resolusinya dikurangi oleh browser menjadi sekitar 0,1 ms.
