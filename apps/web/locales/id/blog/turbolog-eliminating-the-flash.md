<!-- s:fe58dc6ae4 -->
Setiap frame Text.js adalah satu panggilan `console.log`. Hingga 0.4, setiap frame juga didahului oleh `console.clear()`. Saat beban tinggi, konsol berkedip kosong di antara frame.

<!-- s:7a82fe5fe2 -->
Mengukur kedipan

<!-- s:1d16f5a106 -->
Untuk mengukurnya, kami membuat `bench/devtools`. Alat ini menjalankan Chrome for Testing, membuka frontend DevTools yang sesungguhnya sebagai halaman dan memasang instrumentasi:

<!-- s:4da6ef7009 -->
- Pada setiap `requestAnimationFrame` di frontend DevTools, alat ini memeriksa apakah frame lengkap dengan 32 baris berada dalam viewport konsol. Paint tanpa frame lengkap dihitung sebagai paint kosong.
- Alat ini kemudian mendekode frame `Page.startScreencast` untuk mengonfirmasi hasilnya dalam piksel.
- Setiap frame memuat `FRAME:<id> · T:<epochMs>` pada baris 0, sehingga frontend bisa mengetahui frame mana yang sedang ditampilkan dan berapa lama keterlambatannya.

<!-- s:cb3c553c37 -->
Dengan `console.clear()` sebelum setiap frame, dasbor 100×32 pada 15 fps tampak kosong pada **70,6%** paint DevTools. Pada 60 fps, **81,1%**.

<!-- s:7076ddd27d -->
Penyebabnya

<!-- s:1e65554dc0 -->
`ConsoleView` DevTools menangani kedua panggilan tersebut secara berbeda:

<!-- s:56484b5ac3 -->
1. `console.clear()` memanggil `consoleCleared()`, yang membatalkan validitas viewport **secara sinkron**. Setiap pesan menghilang dalam task yang sama.
2. `console.log()` memanggil `addConsoleMessage()`, yang hanya menjadwalkan penyegaran melalui `viewportThrottler`, sebuah `Throttler` dengan batas waktu **50 ms**.

<!-- s:8a656fe37a -->
Jadi, setiap frame menghapus frame lama saat itu juga dan menggambar frame baru belakangan. Pada 15 fps, sekitar 50 dari setiap 66 ms tidak menampilkan apa pun.

<!-- s:8bb24ac9a4 -->
Menambahkan frame di akhir

<!-- s:1092cc0920 -->
Sejak 0.4, Turbolog menambahkan frame di akhir. DevTools tetap berada di bagian bawah konsol, sehingga frame baru menggantikan frame lama dalam satu paint. Span awal dengan lebar nol dan `margin-top:100vh` (tirai) mendorong frame sebelumnya keluar dari tampilan, dan mengakhiri barisnya sendiri agar tautan sumber DevTools tidak pernah mempersempit baris 0.

<!-- s:6e8cb684de -->
Konsol tetap harus dikosongkan pada akhirnya. Pengosongan hanya terjadi pada frame pertama, setelah `invalidate()`, saat idle setelah 100 frame menumpuk, dan pada batas mutlak 300.

<!-- s:58637d56ab -->
Menyesuaikan laju dengan throttler

<!-- s:14c65af87d -->
Mengirim frame lebih cepat daripada kemampuan DevTools menggambarnya tidak mempercepat apa pun. Log yang tiba saat throttler masih menunggu akan memulainya ulang, sehingga frame terbuang: pada 60 fps DevTools menggambar 67 dari 295 frame yang dikirim. Turbolog mengatur jarak antarframe setidaknya **66 ms**, sekitar 15 fps, dan tetap merender input diskret secara sinkron saat intervalnya memungkinkan.

<!-- s:8a90fd55c3 -->
Memutus penguncian fase

<!-- s:e96505e7a5 -->
Pengosongan juga menambahkan keterlambatan sekitar 50 ms pada setiap frame berikutnya. Setelah pengosongan, DevTools menyisipkan baris sintetis `Console was cleared`. Baris ini mengambil slot langsung throttler dan mendorong frame berikutnya ke timer 50 ms, dan pada ritme tetap 66 ms setiap frame berikutnya tetap terkunci pada timer tersebut.

<!-- s:57527b9818 -->
Renderer kini menunggu **110 ms** satu kali setelah setiap pengosongan. Setelah itu, setiap frame tiba lebih dari 50 ms setelah penyegaran sebelumnya selesai dan mengambil jalur langsung DevTools. Median keterlambatan tampilan turun dari **63 ms menjadi 10,4 ms**.

<!-- s:003645d0bf -->
Hasil

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, dasbor 100×32, frontend DevTools yang sesungguhnya:

<!-- s:9ee75054af -->
| Penggerak | FPS | Paint kosong | Digambar / dikirim | Keterlambatan p50 |
| :-- | --: | --: | --: | --: |
| Pengosongan per frame | 15 | 70,6% | 70 / 75 | 60,4 ms |
| **Menambahkan di akhir (1.0)** | **15** | **1,0%** | **74 / 75** | **10,4 ms** |
| Pengosongan per frame | 60 | 81,1% | 45 / 300 | 9,8 ms |
| Menambahkan di akhir, tanpa pengaturan laju | 60 | 0,8% | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Sisa 1% berasal dari frame pertama, yang sengaja mengosongkan konsol. Paint kosongnya menampilkan baris `Console was cleared`, bukan konsol kosong.

<!-- s:315471c65a -->
Lebih sedikit properti per span

<!-- s:e210e7e85d -->
Kode sumber DevTools menunjukkan satu biaya tambahan. DevTools menyalin setiap *longhand* dari gaya `%c` ke setiap pembungkus baris, sehingga shorthand `font:` dan `margin:` berkembang menjadi sekitar 33 properti per span. Span kini hanya menggunakan longhand, masing-masing sekitar 7, dengan warna heksadesimal.

<!-- s:5b341c4930 -->
Mode penambahan di akhir dirilis dalam Text.js 0.4, dan perbaikan penguncian fase dirilis dalam 1.0. Keduanya tidak memerlukan perubahan kode aplikasi.
