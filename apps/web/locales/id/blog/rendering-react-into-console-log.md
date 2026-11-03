<!-- s:16c98cd381 -->
Text.js me-render aplikasi React di konsol Chrome DevTools. Selain input tersembunyi, halaman ini tidak memiliki UI. Setiap frame aplikasi berupa satu panggilan `console.log`.

<!-- s:fe9cd991d4 -->
Konsol sebagai layar

<!-- s:5ae20a07fc -->
`console.log` menerima string format. Setiap `%c` menerapkan CSS dalam argumen berikutnya ke teks yang mengikutinya, hingga `%c` berikutnya:

<!-- s:2822a0243c -->
Gaya ini dapat mengatur warna, latar belakang, cetak tebal, cetak miring, dan garis bawah, sementara font konsol adalah monospace (Menlo di macOS). Dengan font monospace dan warna yang dapat berubah pada setiap rangkaian karakter, konsol berfungsi sebagai kisi sel karakter bergaya. Bingkai, panel, input, dan grafik semuanya dapat digambar di sana.

<!-- s:585742694b -->
Frame adalah kisi sel

<!-- s:04a12244bc -->
Renderer menyimpan setiap frame dalam `CellBuffer`. Karakter berada dalam satu typed array, warna teks dan latar belakang dalam dua array lainnya, serta atribut seperti cetak tebal dan garis bawah dalam array keempat. Array tersebut dialokasikan sekali untuk ukuran tertentu dan digunakan kembali pada setiap frame.

<!-- s:2ff86351b3 -->
Untuk mencatat frame ke konsol, driver menelusuri setiap baris dan mengelompokkan sel bersebelahan dengan gaya yang sama menjadi rangkaian. Setiap rangkaian menjadi satu span `%c`, dan baris digabungkan dengan `\n`. Dasbor uji kami berukuran 100×32, dengan 3.200 sel, dikodekan menjadi sekitar 200 span.

<!-- s:48a9b4f008 -->
Satu panggilan per frame

<!-- s:aa2cafe395 -->
Mencatat setiap baris sebagai pesan tersendiri tidak berhasil. Setiap pesan mendapat bingkai dan tautan sumbernya sendiri di DevTools, dan DevTools meringkas pesan identik yang berurutan dengan penghitung pengulangan, sehingga dua baris tabel yang identik akan bergabung menjadi satu. Frame yang dicatat sebagai satu pesan tetap utuh.

<!-- s:ea38228d16 -->
Dua hal dalam teks perlu di-escape terlebih dahulu. Karakter literal `%` ditulis sebagai `%%`, sehingga teks seperti `100%` tidak dapat memakai argumen gaya. DevTools juga mengubah URL menjadi tautan dan menggambarnya ulang dengan warnanya sendiri, sehingga `://` dan `www.` diberi word joiner (U+2060), yang tidak memiliki lebar:

<!-- s:ec8783435a -->
Frame saat idle tidak mencatat apa pun

<!-- s:8b7f1f9d06 -->
Setiap baris buffer dihitung hash-nya. Jika tidak ada hash yang berubah sejak frame terakhir, driver berhenti sebelum membangun string dan tidak menyentuh konsol. Aplikasi yang sedang menunggu input tidak membuat panggilan apa pun.

<!-- s:43c3523265 -->
Ketika ada baris yang berubah, driver membersihkan konsol dan mencatat frame baru:

<!-- s:5b584e930a -->
Hanya baris yang hash-nya berubah yang dikodekan ulang. Baris lainnya menggunakan kembali span dari frame sebelumnya.

<!-- s:99a3c4d459 -->
Input

<!-- s:e95aae4719 -->
Konsol tidak menerima penekanan tombol, sehingga halamanlah yang mengumpulkannya. `<textarea>` tersembunyi menerima penekanan tombol, penempelan teks, dan komposisi IME, lalu mengubahnya menjadi event tombol untuk aplikasi. Mengeklik halaman akan memfokuskan input tersebut.

<!-- s:88cae4fc43 -->
Selanjutnya

<!-- s:cb5f6bd294 -->
Prototipe `@textjs/core` 0.0.x di npm memuat semuanya dalam satu paket. Text.js 0.1 memindahkan renderer yang dijelaskan di sini ke `@textjs/core`, reconciler React ke `@textjs/react`, dan menambahkan App Router.
