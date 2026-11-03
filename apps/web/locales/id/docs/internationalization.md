<!-- s:43751f7845 -->
Text.js merender aksara Ibrani, Arab, Persia, dan aksara kanan-ke-kiri lainnya dalam urutan yang benar, sejajar dengan kisi sel, di DevTools, terminal, dan cermin DOM. Text.js mengimplementasikan Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) dan lulus rangkaian uji kesesuaian resmi: seluruh 770.241 kasus `BidiTest.txt` (setiap input dalam setiap arah paragraf) dan seluruh 91.707 kasus `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Arah

<!-- s:0c7b144a82 -->
Setiap paragraf (setiap baris dalam `<Text>` yang dipisahkan oleh `\n`) memilih arah dasarnya sendiri dari karakter kuat pertamanya, seperti `dir="auto"` dalam HTML. Paragraf kanan-ke-kiri rata kanan secara default.

<!-- s:c17beb4498 -->
| `align` | Paragraf kiri-ke-kanan | Paragraf kanan-ke-kiri |
| :-- | :-- | :-- |
| `"start"` (default) | kiri | kanan |
| `"end"` | kanan | kiri |
| `"left"` / `"center"` / `"right"` | sesuai nilai | sesuai nilai |

<!-- s:6db8fa68bb -->
Pada `<Text>` bersarang, `dir` mengisolasi span seperti `<bdi>` dalam HTML: isinya ditata secara terpisah dan tidak dapat mengubah urutan teks di sekitarnya. Gunakan untuk nama, judul, dan teks lain dari pengguna yang arahnya tidak diketahui.

<!-- s:68088feb2d -->
Cara rendering

<!-- s:d401630cda -->
1. **Bungkus dalam urutan logis.** Baris diputus persis seperti pada teks kiri-ke-kanan, berdasarkan lebar sel.
2. **Susun ulang setiap baris.** Algoritma menentukan tingkat penyematan untuk seluruh paragraf (penyematan dan isolasi eksplisit, tipe lemah dan netral, tanda kurung berpasangan), lalu menyusun ulang setiap baris hasil pembungkusan secara terpisah (aturan L1–L2). Tanda kurung dan karakter cermin lainnya bertukar pada tingkat kanan-ke-kiri (L4), sehingga `(abc)` tetap `(abc)` di dalam teks Ibrani.
3. **Bentuk huruf Arab.** Huruf mengambil bentuk kontekstualnya (terpisah, awal, tengah, akhir) dari blok Arabic Presentation Forms, yang dihitung dalam urutan logis pada setiap rentang tingkat di baris tersebut (ZWJ dan ZWNJ diperhitungkan sesuai posisinya). Satu huruf menempati satu sel, bentuk tersambung tetap terjaga di semua batas span (kursor, perubahan warna), dan konsol tidak perlu membentuknya.
4. **Kunci urutan.** Sel kini menyimpan glif dalam urutan tampilan. Browser dan banyak terminal akan menjalankan bidi untuk kedua kalinya, sehingga driver mengunci urutannya:

<!-- s:153724c967 -->
| Output | Cara mengunci urutan |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Span yang berisi karakter kanan-ke-kiri dibungkus dalam `LRO … PDF` (U+202D / U+202C). Sanitizer `%c` DevTools menghapus `direction` dan `unicode-bidi`. |
| Terminal (`AnsiDriver`, `text run`) | Baris dengan teks kanan-ke-kiri dibungkus dalam `LRO … PDF` untuk terminal yang menjalankan bidi per baris. `renderToTerminal` beralih ke mode eksplisit ECMA-48 BDSM (`CSI 8 l`, dipatuhi oleh terminal berbasis VTE) sekali saat masuk dan kembali ke mode implisit (`CSI 8 h`) saat keluar; frame `renderToAnsi` sekali pakai yang berisi teks kanan-ke-kiri diawali dengan `CSI 8 l`. Berikan `bidi: "none"` untuk mengeluarkan sel apa adanya. |
| Cermin DOM (`<ConsoleMirror>`) | Cermin menggunakan `direction: ltr` (agar halaman host RTL tidak dapat membaliknya), dan span yang berisi teks kanan-ke-kiri mendapatkan `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>`, dan `<Divider title>` melalui langkah yang sama (`drawLogicalText(buffer, x, y, text, …)` menggambar setiap baris tunggal dengan cara ini), sehingga labelnya tampil berurutan dan tersambung.

<!-- s:3b67946601 -->
Teks tanpa karakter kanan-ke-kiri melewati semua langkah ini. Model teks yang sepenuhnya kiri-ke-kanan terdeteksi saat grafemnya disegmentasi (satu perbandingan per grafem) dan digambar melalui jalur yang tidak berubah; frame konsol identik hingga tingkat byte.

<!-- s:26ac17c25a -->
Lebar sel

<!-- s:552e751976 -->
Susunan font bawaan adalah `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Tidak satu pun font ini memiliki glif Ibrani atau Arab, sehingga browser menggunakan font pengganti per karakter. Pada macOS, font tersebut adalah Courier New, yang berjarak tetap pada 0,6 em: 7,2012 px per glif pada ukuran 12 px dibandingkan 7,2246 px pada Menlo. Lebarnya 0,3% lebih sempit, cukup untuk menggeser satu baris penuh teks Ibrani sekitar setengah sel.

<!-- s:851f84e769 -->
`CssConsoleDriver` mengukur setiap span kanan-ke-kiri menggunakan canvas dengan font konsol (pembentukan huruf Blink dan font pengganti yang sama dengan yang digunakan DevTools), lalu menambahkan padding sebesar selisih LayoutUnit (1/64 px) yang tepat. Lebar span akhirnya sama dengan sel kisi yang dicakupnya (grafem lebar seperti emoji dihitung dua sel). Span dipersempit paling banyak setengah sel, sehingga font pengganti proporsional (Times New Roman di sebelah Cascadia Mono pada Windows) meluap alih-alih membiarkan span berikutnya menimpa glifnya. Diukur di frontend DevTools sebenarnya (Chromium 151) pada frame 64×21 berisi baris Ibrani, Arab, campuran, dan emoji dalam teks Ibrani serta judul kotak RTL (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Frame | Pergeseran tepi kanan antarbaris |
| :-- | --: |
| Sel dicatat tanpa penguncian | 14,5 px (DevTools menyusun dan membentuk ulang) |
| Terkunci, tanpa penyesuaian lebar | 2,22 px |
| Driver bawaan | 0,156 px |
| Kontrol: sel yang sama, setiap glif RTL diganti dengan `x` | 1,67 px |

<!-- s:a7ec844aae -->
Frame bawaan menyamai kontrol yang seluruhnya Latin pada setiap baris kecuali baris emoji, yang hasilnya lebih baik: emoji disesuaikan bersama span kanan-ke-kiri di sekitarnya (0,03 px), sedangkan baris emoji kiri-ke-kanan pada kontrol tidak disesuaikan (1,66 px).

<!-- s:318b8b5f4c -->
DevTools menggambar setiap span `%c` dengan `contain: paint` dan menyelaraskan masing-masing ke piksel perangkat secara terpisah, sehingga saat dua latar belakang bertemu pada posisi pecahan, piksel di antaranya bisa tidak masuk ke keduanya dan menyisakan garis tipis 1 px. Di Chrome dan Edge, span dengan latar belakang memperpanjangnya 1 px ke bawah tetangga kanan yang opak, dan span yang disesuaikan menambahkan piksel tersebut ke padding-nya. Tidak satu pun dari empat frame di atas menampilkan garis tipis.

<!-- s:7deafc8e74 -->
Berikan `measureText: false` untuk menonaktifkan penyesuaian, atau sediakan fungsi pengukur `(text, bold, italic) => px` Anda sendiri.

<!-- s:f088ff48f9 -->
Input dan penyuntingan

<!-- s:6aca925fed -->
`<Input>` dan `<Textarea>` mempertahankan kursor logis. Tombol panah bergerak melalui teks dalam urutan penyimpanan, sehingga pada teks kanan-ke-kiri, ← bergerak ke kanan secara visual. Kursor blok berada pada karakter logis yang dicakupnya, di mana pun penyusunan ulang menempatkannya. Dalam rentang kanan-ke-kiri, posisi itu adalah sel di sebelah kiri karakter sebelumnya. Seleksi juga merupakan rentang logis, sehingga sorotannya dapat mencakup sel yang tidak bersebelahan pada baris dengan arah campuran. Pengguliran horizontal pada `<Input>` satu baris mengikuti kolom logis, sehingga nilai kanan-ke-kiri yang panjang dapat menggulir kursor hingga tidak terlihat. Kursor pada spasi atau di akhir teks digambar sebagai spasi tanpa putus yang terisolasi, sehingga tetap netral dan tidak pernah bergabung dengan angka di kedua sisinya.

<!-- s:68c8d3995f -->
Batasan

<!-- s:fbb8008232 -->
- **Pemisah paragraf.** Baris dipisahkan pada `\n`. U+2029 dan pemisah paragraf lainnya mengakhiri paragraf bidi tetapi tidak memulai baris baru.
- **Tab.** Tab diperluas menjadi spasi sebelum bidi berjalan, sehingga berfungsi sebagai whitespace (WS), bukan pemisah segmen (S).
- **Pembentukan huruf.** Hanya huruf dengan bentuk presentasi yang dibentuk: Arab, Persia, Urdu, dan huruf lainnya dalam U+FB50–U+FDFF dan U+FE70–U+FEFF. Lam-alef tetap berupa dua huruf tersambung dalam dua sel, bukan ligatur satu glif. Aksara Suryani, N'Ko, dan aksara sambung lainnya mempertahankan bentuk nominalnya.
- **Penyalinan.** Teks yang disalin dari konsol menggunakan urutan tampilan (dengan tanda `LRO`/`PDF`), bukan urutan logis.
- **Terminal.** Terminal yang mengabaikan BDSM maupun `LRO` dan menjalankan bidi sendiri (misalnya dengan bidi diaktifkan di iTerm2) mungkin menyusun ulang baris kanan-ke-kiri lagi.
- **Cermin DOM.** `<ConsoleMirror>` tidak menyesuaikan lebar, sehingga rentang kanan-ke-kiri di sana dapat bergeser hingga 0,3% dari lebarnya.

<!-- s:f4d4dadbf6 -->
Menerjemahkan focus pad

<!-- s:7791d4db4e -->
`<FocusPad>` dari `@textjs/react/dom` (juga dirender oleh `<TextCanvas>`) meminta pengunjung membuka konsol, mengeklik halaman, dan menekan tombol. Teksnya menggunakan bahasa Inggris secara default. Untuk menerjemahkannya, berikan `messages` dengan string yang ingin Anda ganti. Kunci yang tidak disertakan tetap menggunakan teks bahasa Inggrisnya, yang tercantum dalam `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
String yang mengandung nilai berupa fungsi yang mengembalikan seluruh kalimat, sehingga terjemahan dapat menempatkan nilai tersebut di bagian mana pun dalam kalimat. `step`, `pressShortcut`, `then`, `defaultAction`, dan `shortcutOpens` adalah fungsi. `step` menerima nomor langkah dan jumlah langkah. `then` menerima prop `action`, atau teks `defaultAction` jika tidak ada `action`. `defaultAction` menerima tombol petunjuk pertama, atau `null` jika tidak ada petunjuk. `pressShortcut` menerima tombol pintasan untuk pembaca layar, dan `shortcutOpens` menerima pintasan sebagai elemen `<kbd>`.

<!-- s:e9475554da -->
`messages` juga mencakup label yang dibacakan pembaca layar dan kontrol ukuran konsol (`sizeControl`). `<TextCanvas>` menerima prop `messages` yang sama. `<ViewportControl>` juga menerimanya dan menggunakan kunci kontrol ukuran. Label tombol seperti ⌘⌥J, Ctrl+Shift+J, dan Enter tidak diterjemahkan.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules`, dan `reorderIndices` menyediakan akses ke algoritma itu sendiri: aturan P1–I2, L1, dan L2.
