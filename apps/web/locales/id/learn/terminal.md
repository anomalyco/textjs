<!-- s:3ddc060411 -->
`text run` menjalankan aplikasi yang sama di terminal. Layout, komponen, keymap, dan route handler dipakai bersama, dan keluarannya berupa ANSI truecolor alih-alih span CSS `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Tambahkan skrip dan jalankan:

<!-- s:ad1db08664 -->
`text run` mengimpor setiap file di `app/`, memasang App Router dengan riwayat dalam memori, dan menggambarnya dalam layar penuh. `<Link>`, `useRouter()`, `notFound()` dan `redirect()` tetap berfungsi tanpa perubahan, dan pemanggilan `fetch("/api/…")` dengan origin yang sama menjalankan route handler Anda dalam proses yang sama. `Ctrl+C` keluar dan memulihkan riwayat gulir Anda. Ini memerlukan Bun.

<!-- s:86d6034750 -->
Keluar dengan `q`

<!-- s:f06966bd5c -->
Pengguna terminal mengharapkan `q`. `useApp().exit()` melepas aplikasi dan memulihkan terminal; di browser, ini melepas aplikasi konsol.

<!-- s:62111506f4 -->
CLI Anda sendiri

<!-- s:e5f8a30037 -->
Untuk satu komponen, gunakan `renderToTerminal`. Fungsi ini memasang satu elemen tanpa App Router, dan `fetch("/api/…")` hanya menjangkau route handler Anda saat dijalankan melalui `text run`, jadi teruskan datanya ke komponen:

<!-- s:718df08aaf -->
Jalankan dengan `bun cli.tsx`. `DeploymentsPage` mengambil data barisnya, jadi memerlukan `text run`.

<!-- s:76d0fa5082 -->
Perbedaannya

<!-- s:505bd1bfa2 -->
Terminal menggambar ulang lebih cepat (hingga 60 fps alih-alih ~15) dan menyesuaikan ukuran kisi dengan jendela, bukan konsol yang ditambatkan. Gambar memerlukan data piksel alih-alih URL. Selebihnya, termasuk dasbor ini, menggunakan kode yang sama.
