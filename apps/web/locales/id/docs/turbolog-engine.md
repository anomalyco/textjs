<!-- s:aca2697522 -->
Turbolog mengubah setiap commit React menjadi satu panggilan `console.log`, atau tanpa panggilan jika tidak ada sel yang berubah.

<!-- s:d01b048a1d -->
Tujuan

<!-- s:53b8b34f5a -->
1. **Satu panggilan per frame yang berubah.**
2. **Nol panggilan saat tidak aktif.** Frame yang tidak berubah langsung kembali sebelum membangun string.
3. **Sedikit argumen gaya.** 149 span `%c` untuk 3.200 sel pada dasbor padat `100×32`.

<!-- s:e284ac0068 -->
Alur pemrosesan

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Frame disimpan dalam typed array datar untuk karakter, warna, dan atribut, yang dialokasikan satu kali.

<!-- s:6215aa69f7 -->
Gerbang perubahan

<!-- s:617da960c4 -->
Setiap baris dihitung hash-nya. Jika tidak ada perubahan, driver langsung kembali:

<!-- s:524a0717a4 -->
Pergantian frame

<!-- s:3c7194b785 -->
Turbolog menambahkan frame di akhir dan membersihkan konsol hanya pada frame pertama, setelah `invalidate()`, saat tidak aktif setelah 100 frame menumpuk, dan pada 300 frame. DevTools langsung menghapus pesan yang dibersihkan, tetapi menggambar pesan baru dengan pembatasan interval 50 ms, sehingga membersihkan setiap frame membuat konsol kosong berkedip. Frame yang ditambahkan di akhir berganti dalam satu proses penggambaran, dan span tirai selebar nol menyembunyikan frame sebelumnya. Gulir ke atas untuk melihat frame terdahulu.

<!-- s:7845be2cbb -->
Laju frame diatur sekitar 15 fps. Frame yang lebih cepat mengatur ulang pembatasan DevTools dan dibuang.

<!-- s:a36177ad5b -->
Pengodean run-length

<!-- s:d4079278eb -->
Sel yang cocok bergabung menjadi satu span `%c`. Span berlanjut melintasi baris baru, dan string CSS diintern.

<!-- s:7fe20496b0 -->
Detail Chromium

<!-- s:ff8301db1f -->
- Literal `%` di-escape sebagai `%%`.
- URL dan teks `path:line` diberi word joiner agar DevTools tidak mengubah gayanya.
- Span hanya menggunakan CSS longhand. DevTools menyalin setiap properti yang diperluas ke setiap baris.
- Span disesuaikan agar latar belakang tersusun tanpa celah.

<!-- s:41e36e3179 -->
Firefox dan Safari

<!-- s:8b2f3136a1 -->
Chromium menata setiap baris span `%c` sebagai blok inline. Firefox dan Safari mempertahankan span sebagai inline, sehingga keduanya mengabaikan margin vertikal dan membungkus baris panjang. `CssConsoleDriver` mendeteksi browser melalui pemeriksaan fitur CSS dan, untuk kedua konsol tersebut, menetapkan tinggi baris 14 px tanpa margin, menonaktifkan pembungkusan dengan `text-wrap-mode: nowrap`, serta menyembunyikan frame terdahulu dengan tirai `line-height: 100vh`. Penyesuaian ukuran konsol menyisakan ruang untuk kolom tautan sumber Firefox. Safari menempatkan Menlo di urutan pertama dalam tumpukan font, karena halamannya tidak dapat menggunakan SF Mono yang dipasang pengguna meskipun Web Inspector mungkin menggunakannya untuk menggambar. Teruskan `browser` ke `createConsoleRoot` untuk memilih konsol sendiri.

<!-- s:66b07a5809 -->
Tolok ukur

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` pada dasbor padat `100×32`, rata-rata dari 1.000 frame (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Frame | Waktu | Span `%c` |
| :-- | --: | --: |
| Penggambaran ulang penuh (layout, penggambaran, pengodean) | **0,163 ms** | 149 |
| Pengeditan satu baris | **0,011 ms** | 149 |
| Tidak aktif | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
Halaman [Status](/status) menjalankan alur pemrosesan yang sama di browser Anda. Jalankan `text.stats()` di DevTools saat demo dari [Playground](/playground) sedang berjalan.
