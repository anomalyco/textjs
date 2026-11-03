<!-- s:329a4263b5 -->
`@textjs/app/testing` me-render aplikasi Anda di luar layar, menekan tombol, dan mengembalikan frame sebagai teks biasa. Pengujian berjalan tanpa browser atau DevTools.

<!-- s:22ea22bed4 -->
Pengujian pertama Anda

<!-- s:79e830f1ed -->
Halaman mengambil data dari `/api/deployments`, yang tidak memiliki server saat `bun test` berjalan, sehingga `beforeEach` mengganti `fetch` dengan stub berisi data yang sama. `render` menggunakan grid 80×24 secara default. `lastFrame()` mengembalikan seluruh frame sebagai teks, `lines()` mengembalikannya baris demi baris, dan `cell(x, y)` memberikan karakter dan warna satu sel.

<!-- s:e8fdbe8cac -->
Menekan tombol

<!-- s:8db83c740c -->
`press` menerima string tombol yang sama dengan `useKeymap`. Setiap pemanggilan berjalan di dalam `act()` dan menuntaskan pemrosesan frame yang dihasilkan, sehingga asersi berikutnya melihat pembaruan tersebut.

<!-- s:7c6ee6548f -->
Tabel menggambar `›` di depan baris yang disorot, sehingga pengujian ↓ menemukan baris tersebut dan memeriksa commit-nya. Tombol angka mengurutkan berdasarkan kolom, dan kolom keempat adalah Build.

<!-- s:5350d592a4 -->
Menjalankan pengujian

<!-- s:88993d5c83 -->
Pengujian ini berjalan dengan runner apa pun yang mendukung pengujian `async`: Bun, Vitest, atau Jest. Di konsol, tekan `Enter` untuk menjalankan rangkaian pengujian dan `f` untuk membuat satu pengujian gagal dan melihat bentuk kegagalannya.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:b458212c22 -->
`toAnsi()` mengembalikan frame sebagai ANSI truecolor, sehingga snapshot juga mendeteksi regresi warna:
