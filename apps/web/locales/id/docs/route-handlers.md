<!-- s:da329a4f1b -->
Route handler mendefinisikan endpoint API di direktori `app` dengan API Web `Request` dan `Response`.

<!-- s:895d99d1b5 -->
Konvensi

<!-- s:ac1d1b9fcb -->
Ekspor `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` atau `OPTIONS`. Handler berjalan pada `text dev`, `text start` dan setiap [adapter deploy](/docs/deploying) server, setelah [middleware](/docs/middleware). Simpan handler `GET` dalam cache dengan [konfigurasi segmen route](/docs/caching).

<!-- s:53eeba0ff3 -->
Handler dinamis

<!-- s:bfa759b36e -->
Nilai `params` didekode. Path dengan garis miring atau garis miring terbalik yang dikodekan (`%2F`, `%5C`) mendapat `400`, jadi teruskan ID yang bisa memuat `/` dalam parameter kueri atau kodekan sebagai base64url.

<!-- s:6c694827e4 -->
Streaming

<!-- s:734a652dda -->
Kembalikan `ReadableStream` untuk server-sent events:

<!-- s:9ff4b304cc -->
Rewrite

<!-- s:7ca1bb6854 -->
Server memproksikan tujuan eksternal, sehingga browser tidak membuat permintaan lintas origin.

<!-- s:82320e9df7 -->
Proksi daemon lokal

<!-- s:7730eaa5fb -->
Gunakan `proxy` untuk mengakses proses di mesin Anda:

<!-- s:c00af013ff -->
Inilah cara [template OpenCode](/docs/opencode) terhubung ke server lokal.
