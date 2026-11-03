<!-- s:710c25737e -->
Dalam framework DOM, komponen menjadi node DOM yang ditata dan digambar browser di halaman. Dalam Text.js, komponen menjadi sel, dan setiap frame sel yang berubah menjadi satu panggilan `console.log` di DevTools. Kami menyebutnya Arsitektur Terbalik.

<!-- s:d00a01bf6f -->
Pipeline

<!-- s:12c6e8f741 -->
Setiap tahap ada karena konsol adalah tampilan yang tidak biasa. Konsol menggunakan monospace dan berorientasi baris, gayanya diatur dengan `%c`, dan DevTools menentukan kapan konsol digambar ulang.

<!-- s:db7daa7cf2 -->
Reconciler

<!-- s:f3cdc101e1 -->
`@textjs/react` adalah reconciler React 19 (`react-reconciler@0.34.0`) dengan dua elemen host, `tx-box` dan `tx-text`, serta instance teks untuk children berupa string. Semua yang Anda impor, dari `<Box>` hingga `<Markdown>`, dibangun di atasnya. Commit dijadwalkan pada `requestAnimationFrame`, dan penekanan tombol atau penempelan memicu rendering sinkron dalam task yang sama.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, yang dikompilasi ke WebAssembly, menata tree dengan `pointScaleFactor = 1`, sehingga setiap kotak menempati sel utuh. Teks diukur dengan `Intl.Segmenter` dan tabel lebar karakter Asia Timur, sehingga `你好` memakai empat sel dan `🚀` memakai dua sel. Jika suatu edit tidak bisa mengubah ukuran node teks, Yoga tidak dipanggil lagi.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Frame berupa kisi typed array yang dialokasikan sekali: karakter dalam `Uint32Array`, warna depan dan latar belakang sebagai `0xRRGGBBAA` yang dipadatkan, atribut sebagai bitmask `Uint16Array`. Proses penggambaran menulis ke array tersebut dan melacak baris yang disentuhnya.

<!-- s:2a9b8dd7b1 -->
Gerbang

<!-- s:1cdfa61881 -->
Setiap baris memiliki hash FNV-1a 32-bit yang disimpan dalam cache. Hanya baris yang ditulis sejak frame terakhir yang dihitung ulang hash-nya. Jika tidak ada baris yang berubah, driver kembali sebelum membangun string dan tidak memanggil konsol. Spinner pada tab tersembunyi tidak memakai sumber daya karena tidak berjalan.

<!-- s:a36177ad5b -->
Run-length encoding

<!-- s:c372fac68d -->
Baris yang berubah dipindai ulang menjadi rangkaian bergaya identik, dan setiap rangkaian menjadi satu span `%c`. Rangkaian berlanjut melewati pergantian baris. String CSS diinternalkan dengan ID gaya berupa bilangan bulat, sehingga jalur eksekusi utama tidak pernah membangun string yang sama dua kali. Dasbor 100×32 terdiri dari 3.200 sel dan 149 span.

<!-- s:922d9e42bd -->
String format juga melindungi dari dua perilaku DevTools. Karakter literal `%` ditulis sebagai `%%`. Word joiner ditempatkan setelah `://`, di dalam `www.` dan dalam `path:line`, agar DevTools tidak mengubah teks Anda menjadi tautan dan menggambarnya ulang dengan warnanya sendiri.

<!-- s:f55ed8e2b0 -->
Satu panggilan

<!-- s:b57bb25475 -->
Setiap frame yang berubah menjadi satu panggilan:

<!-- s:e3e37e3616 -->
Frame ditambahkan di akhir, mengikuti pembatas laju 50 ms DevTools dan diganti dalam satu proses penggambaran. [Turbolog: menghilangkan kilatan](/blog/turbolog-eliminating-the-flash) membahas bagian tersebut.

<!-- s:99a3c4d459 -->
Input

<!-- s:e569f67f37 -->
Konsol tidak bisa menerima penekanan tombol, jadi halaman yang menerimanya. `<textarea>` tersembunyi mengumpulkan input tombol, tempelan, dan komposisi IME, sementara event `wheel` menggulir `ScrollBox`. Di textjs.org, halaman Playground dan OpenCode merupakan satu focus pad besar. Buka konsol, lalu klik halaman untuk mengetik.

<!-- s:7db6aa160c -->
Yang dilihat halaman

<!-- s:03e00f4b44 -->
Halaman tidak bisa membaca ukuran konsol, hanya ukuran jendelanya sendiri, jadi Text.js memperkirakannya: panel yang ditambatkan mengecilkan `innerWidth` atau `innerHeight` sementara `outer*` tetap, dan setiap hipotesis posisi tambatan dihitung untuk tingkat zoom Chrome. Kecocokan terbaik yang dipilih. Konstanta (padding horizontal 56 px, bingkai antarmuka konsol 104 px, jarak antarbaris 14 px) diukur pada frontend DevTools yang sebenarnya.
