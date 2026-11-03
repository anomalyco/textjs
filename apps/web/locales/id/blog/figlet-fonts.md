<!-- s:3c9b7877c3 -->
Text.js 0.3 menambahkan `@textjs/font`, parser dan renderer untuk font FIGlet. Paket ini menyertakan 17 font dari distribusi FIGlet 2.2.5, masing-masing sebagai satu modul ES, dan keluarannya sama persis dengan biner `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Mengapa FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` memiliki dua gaya huruf bawaan, `block` dan `compact`, sejak 0.1. FIGlet telah menjadi standar untuk gaya huruf semacam ini sejak 1991, dan tersedia ratusan font `.flf`. Dukungan format ini memungkinkan semua font tersebut dimasukkan ke aplikasi konsol.

<!-- s:7fdbff5714 -->
Font FIGlet berupa file teks biasa. Baris header menetapkan tinggi, karakter hardblank, dan aturan layout, lalu setiap karakter digambar sebagai blok baris dengan penanda akhir di ujung setiap baris. Dalam layout bawaannya, FIGlet menggeser setiap karakter ke kiri hingga menyentuh karakter sebelumnya, lalu menggunakan aturan smushing font untuk menentukan apakah dua subkarakter yang bersentuhan digabungkan menjadi satu.

<!-- s:4c761bba4d -->
Mode layout

<!-- s:3f1c38cf92 -->
`figlet` memiliki lima layout horizontal, dan `renderFiglet` menerima kelima layout yang sama melalui `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Efek |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout bawaan font, biasanya dengan smushing |
| `"full"` | `-W` | Lebar penuh; karakter tidak pernah bersentuhan |
| `"fitted"` | `-k` | Karakter digeser mendekat hingga bersentuhan |
| `"smushed"` | `-S` | Smushing dengan aturan font |
| `"universal"` | `-o` | Karakter berikutnya menimpa karakter sebelumnya |

<!-- s:7a1307992e -->
Angka dari -1 hingga 63 merupakan mode layout `-m` mentah: `-1` berarti lebar penuh, `0` berarti fitted, dan `1` hingga `63` memilih aturan smushing. Keenam aturan smushing horizontal telah diimplementasikan: karakter sama, garis bawah, hierarki, pasangan berlawanan, X besar, dan hardblank. Parser juga menangani bagian format lainnya: baris komentar, karakter bertag kode dalam desimal, oktal, dan heksadesimal, glif karakter yang hilang, serta font kanan-ke-kiri seperti `ivrit`.

<!-- s:0c920c94d3 -->
Pemenggalan baris juga mengikuti FIGlet. `width` memenggal di batas kata, dan di dalam kata jika kata lebih lebar daripada baris, pada posisi yang sama dengan `figlet -w`. `figlet -w 80` mencetak paling banyak 79 kolom, sehingga `-w N` setara dengan `width: N - 1`.

<!-- s:729dda48fc -->
Mencocokkan keluaran biner

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` menyimpan 273 keluaran yang dihasilkan dengan menjalankan `figlet` 2.2.5 asli untuk setiap font bawaan dalam setiap mode layout, dengan pemenggalan baris, perataan, teks kanan-ke-kiri, mode paragraf, dan masukan regresi FIGlet sendiri beserta flag dari `run-tests.sh`. Setiap kasus menyimpan argumen, masukan, dan keluaran persisnya, dan pengujian mengubah baris perintah kembali menjadi opsi:

<!-- s:d31215cb4b -->
Semua 273 keluaran cocok. Untuk menghasilkan ulang fixture, tempatkan `figlet` 2.2.5 di `PATH` Anda dan jalankan `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Font pada kisi sel

<!-- s:ede6764977 -->
Setiap font bawaan menggambar dengan ASCII atau Latin-1 yang dapat dicetak, sehingga setiap subkarakter menempati tepat satu sel di Menlo dan sejajar pada kisi. `<FigletText>` mengukur barisnya dalam sel, sehingga huruf menempati layout flexbox seperti `<Text>` lainnya, dan `columns` serta `align` memenggal baris dan meratakannya di dalam kotaknya.

<!-- s:3cedd51e92 -->
Setiap font memiliki modul tersendiri, sehingga aplikasi hanya menyertakan font yang diimpornya, dan font diurai saat render pertama, bukan saat diimpor. `@textjs/font/all` mengekspor semua font untuk galeri.

<!-- s:9d54eeef4f -->
FIGfont lain dapat diambil dan diurai saat runtime:

<!-- s:f64649f401 -->
Lisensi

<!-- s:67e882f6b4 -->
Font bawaan identik byte demi byte dengan font dalam `figlet-2.2.5.tar.gz` dan didistribusikan di bawah lisensi BSD 3-Clause milik FIGlet. Setiap font menyimpan kreditnya dalam baris komentar, yang tersedia sebagai `font.comment`. Font populer tanpa izin redistribusi, seperti Doom, Larry 3D, ANSI Shadow, dan Calvin S, tidak disertakan.

<!-- s:ee98166722 -->
Referensi lengkap tersedia di [Font](/docs/fonts).
