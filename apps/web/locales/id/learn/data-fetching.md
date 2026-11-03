<!-- s:23fef6717c -->
Acme Deploys membutuhkan data nyata. Route handler berada di samping halaman Anda di `app/`, menggunakan API Web `Request` dan `Response`, serta berjalan pada `text dev` dan `text start`. Origin-nya sama dengan aplikasi, sehingga permintaan tidak memerlukan pengaturan CORS.

<!-- s:c6876ef862 -->
Route handler

<!-- s:b226d3ca25 -->
Panggil dari prompt konsol saat `text dev` berjalan:

<!-- s:9ce3eb974c -->
Mengambil data di halaman

<!-- s:c02131685f -->
Ambil data dalam effect dan tampilkan `<Spinner>` hingga data tiba. `r` mengambil ulang data; `n` mengirim deployment baru, yang muncul dengan status building dan berubah menjadi ready setelah build selesai.

<!-- s:34de603227 -->
Status pemuatan dan error

<!-- s:8b95fe08be -->
Alih-alih menangani `loading` secara manual, `loading.tsx` di samping halaman ditampilkan saat halaman ditangguhkan, dan `error.tsx` menangkap apa pun yang dilempar halaman. Keduanya adalah komponen biasa:

<!-- s:6c694827e4 -->
Streaming

<!-- s:c16e24a117 -->
Handler dapat mengembalikan `ReadableStream`, yang mengalirkan log build ke dasbor baris demi baris. Lihat [Route handler](/docs/route-handlers) untuk server-sent events dan penggunaan proksi untuk daemon lokal.
