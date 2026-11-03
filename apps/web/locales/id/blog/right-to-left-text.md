<!-- s:bd59ce7974 -->
Text.js kini me-render aksara Ibrani, Arab, Persia, dan aksara kanan-ke-kiri lainnya dalam urutan yang benar, dengan huruf Arab tersambung, pada kisi sel yang sama dengan konten lainnya.

<!-- s:4673b00c8b -->
Setiap paragraf menentukan arah dasarnya dari karakter kuat pertamanya, seperti `dir="auto"` dalam HTML, dan paragraf kanan-ke-kiri diratakan ke kanan. Pada `<Text>` bersarang, `dir` mengisolasi span seperti `<bdi>`, sehingga nama pengguna yang arahnya tidak diketahui tidak dapat mengubah urutan teks di sekitarnya.

<!-- s:9026fc3194 -->
Algoritma

<!-- s:f13f3bb4af -->
Dukungan kanan-ke-kiri merupakan implementasi Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0), yang ditulis dari awal di `@textjs/core`. Algoritma ini menentukan tingkat penyematan untuk setiap paragraf, termasuk penyematan eksplisit dan isolat, tipe lemah dan netral, serta tanda kurung berpasangan. Lalu setiap baris hasil pemenggalan diurutkan ulang secara terpisah, dan karakter bercermin ditukar pada tingkat kanan-ke-kiri, sehingga `(abc)` tetap `(abc)` di dalam teks Ibrani.

<!-- s:82ed91ab82 -->
Unicode menerbitkan dua berkas kesesuaian untuk algoritma ini. Keduanya disimpan di repositori dalam format gzip, dan rangkaian pengujian menjalankan setiap kasus:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` mencantumkan input sebagai urutan kelas bidi, masing-masing beserta arah paragraf yang berlaku. Text.js lulus seluruh 770.241 kasus.
- `BidiCharacterTest.txt` mencantumkan string nyata beserta tingkat dan urutan yang diharapkan. Text.js lulus seluruh 91.707 kasus.

<!-- s:3939cd5f43 -->
Dari urutan logis ke sel

<!-- s:e682972504 -->
Sebaris teks kanan-ke-kiri melalui empat langkah sebelum mencapai konsol:

<!-- s:a497c14c9c -->
1. **Penggal dalam urutan logis.** Baris dipenggal pada posisi yang sama seperti teks kiri-ke-kanan, berdasarkan lebar sel.
2. **Urutkan ulang setiap baris.** Tingkat yang telah ditentukan menetapkan urutan tampilan grafem pada baris tersebut.
3. **Bentuk huruf Arab.** Huruf mengambil bentuk kontekstualnya (terpisah, awal, tengah, akhir) dari blok Arabic Presentation Forms. Satu huruf menempati satu sel, dan bentuk tersambung tetap terjaga meski ada kursor atau perubahan warna di tengah kata.
4. **Kunci urutannya.** Sel kini memuat glif dalam urutan tampilan.

<!-- s:5d1156720d -->
Langkah terakhir diperlukan karena DevTools akan menjalankan bidi pada teks untuk kedua kalinya dan membaliknya lagi. Gaya `%c` tidak dapat menonaktifkannya, karena sanitizer DevTools menghapus `direction` dan `unicode-bidi`. Jadi driver membungkus setiap span yang berisi karakter kanan-ke-kiri dengan `LRO` dan `PDF` (U+202D dan U+202C), yang memaksa tampilan kiri-ke-kanan persis sesuai isi sel.

<!-- s:aba313fc71 -->
Pergeseran setengah sel

<!-- s:1109446b98 -->
Baik SF Mono maupun Menlo tidak memiliki glif Ibrani atau Arab, sehingga browser menggunakan font cadangan per karakter. Di macOS, font tersebut adalah Courier New, yang juga berlebar tetap, dengan lebar 7,2012 px per glif pada ukuran 12 px dibandingkan Menlo yang lebarnya 7,2246 px. Lebarnya 0,3% lebih sempit, cukup untuk menggeser satu baris penuh teks Ibrani sekitar setengah sel.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` mengukur setiap span kanan-ke-kiri menggunakan kanvas dengan font konsol, yang memakai font cadangan Blink yang sama dengan DevTools, lalu menambahkan ruang pada span sebesar selisih tepatnya dalam LayoutUnits (1/64 px). Setiap span akhirnya selebar sel kisi yang dicakupnya. Span dipersempit paling banyak setengah sel, sehingga font cadangan yang jauh lebih lebar akan meluap alih-alih menimpa span berikutnya.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` mengukur hasilnya di frontend DevTools yang sebenarnya, pada frame 64×21 berisi baris Ibrani, Arab, campuran, dan emoji dalam teks Ibrani:

<!-- s:e6a33dfaa2 -->
| Frame | Pergeseran tepi kanan antarbaris |
| :-- | --: |
| Sel dicatat tanpa penguncian urutan | 14,5 px |
| Urutan dikunci, tanpa penyesuaian lebar | 2,22 px |
| Driver yang dirilis | 0,156 px |
| Kontrol: setiap glif RTL diganti dengan `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
Kontrol menggunakan frame yang sama dengan teks Latin. Driver yang dirilis menghasilkan perataan yang lebih baik daripada kontrol karena emoji di dalam span kanan-ke-kiri ikut disesuaikan bersama span tersebut.

<!-- s:d37099863b -->
Teks kiri-ke-kanan tidak berubah

<!-- s:41ce31b66a -->
Teks tanpa karakter kanan-ke-kiri melewati seluruh proses ini. Pemeriksaan berlangsung saat segmentasi grafem, satu perbandingan per grafem, dan teks yang sepenuhnya kiri-ke-kanan di-render melalui jalur yang sama seperti sebelumnya, sehingga frame konsolnya identik hingga tingkat byte.

<!-- s:a8fff567e6 -->
Teks kanan-ke-kiri hadir di Text.js 1.0. [Internasionalisasi](/docs/internationalization) membahas input, penyuntingan, terminal, dan API.
