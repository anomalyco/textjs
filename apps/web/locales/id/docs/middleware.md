<!-- s:88013af27d -->
Middleware menjalankan kode sebelum permintaan selesai. Middleware dapat mengalihkan, melakukan rewrite, mengatur header dan cookie, atau mengembalikan respons sendiri.

<!-- s:895d99d1b5 -->
Konvensi

<!-- s:9e6d75b727 -->
Buat `middleware.ts` di direktori root proyek (atau `src/`), di sebelah `app/`. Ekspor fungsi `middleware` (atau ekspor default) dan `config` opsional.

<!-- s:a4d39cdaaf -->
Middleware berjalan sebelum [route handler](/docs/route-handlers), file statis dan halaman konsol, pada `text dev`, `text start` dan setiap [adapter deploy](/docs/deploying) server. Middleware menggunakan `Request` dan `Response` Web, sehingga file yang sama berjalan di Node, Bun, Vercel Edge dan Cloudflare Workers.

<!-- s:dda0880da2 -->
Pencocokan path

<!-- s:1e1ec8c339 -->
Tanpa `config.matcher`, middleware berjalan untuk setiap permintaan. Matcher menggunakan sintaks yang sama dengan Next.js:

<!-- s:473d472bc8 -->
| Matcher | Kecocokan |
| :-- | :-- |
| `/about` | `/about` dan `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, bukan `/a` |
| `/user/:id(\\d+)` | `/user/42`, bukan `/user/ada` |
| `/((?!api/).*)` | Semua kecuali `/api/*` |

<!-- s:256aeeefbc -->
Tambahkan kondisi dengan `has` dan `missing` (header, cookie, kueri atau host):

<!-- s:d756420343 -->
Matcher berlaku pada pathname tanpa `basePath`. Pada `text dev`, permintaan modul Vite sendiri (`/@vite/*`, file sumber) tidak pernah menjalankan middleware.

<!-- s:75cd7297e6 -->
Setiap host menentukan satu pathname kanonis sebelum middleware berjalan, lalu menggunakannya untuk pencocokan, `request.nextUrl` serta pencarian route, handler dan file. Escape persen didekode dan path dikodekan ulang sesuai cara `new URL()` menuliskannya, segmen `.` dan `..` diselesaikan, serta garis miring berulang dan di akhir dihapus. `/ad%6din//users/` mencapai middleware sebagai `/admin/users`, sementara `/café` tetap `/caf%C3%A9`. Matcher yang ditulis dengan garis miring di akhir, seperti `/admin/`, cocok dengan `/admin`. Permintaan dengan path yang memuat garis miring atau garis miring terbalik terkode (`%2F`, `%5C`), karakter kontrol atau pengodean persen yang tidak valid mendapatkan `400`. Route membedakan huruf besar dan kecil: `/Admin` tidak cocok dengan `/admin`, dan file statis hanya disajikan dengan nama persisnya.

<!-- s:3f5746eb4e -->
Cocokkan URL tempat file disajikan, bukan hanya nama filenya. Cloudflare Pages juga menyajikan `report.html` di `/report`, sehingga matcher untuk `/report.html` tidak melindungi `/report`. Cantumkan keduanya, `matcher: ["/report", "/report.html"]`, atau simpan file yang dilindungi dalam direktori dan cocokkan direktori tersebut, seperti `/reports/:path*` untuk file di `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Efek |
| :-- | :-- |
| `NextResponse.next()` | Lanjutkan ke route |
| `NextResponse.redirect(url, status?)` | `307` secara default; `url` harus absolut |
| `NextResponse.rewrite(url)` | Sajikan path lain; origin eksternal diteruskan melalui proksi |
| `NextResponse.json(body, init?)` | Berikan respons JSON |
| `new Response(...)` | Berikan respons apa pun |

<!-- s:a8292924c3 -->
Jangan kembalikan apa pun untuk melanjutkan tanpa perubahan. `next()` dan `rewrite()` menerima `{ status }` untuk mengubah status respons akhir. Hanya respons yang dibuat oleh `NextResponse.next()` / `NextResponse.rewrite()` yang mengarahkan routing: `Response` lainnya, termasuk yang dikembalikan oleh `fetch()`, dikirim ke klien apa adanya setelah header `x-middleware-*` dihapus.

<!-- s:583e778785 -->
`request.nextUrl` mengecualikan `basePath` dari `pathname`, sementara `href` dan `toString()` menyertakannya. Agar tetap berada di dalam aplikasi, buat salinannya: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Header

<!-- s:37748fa2c3 -->
Teruskan `request.headers` untuk mengubah apa yang diterima handler berikutnya, dan `headers` untuk menambahkan header respons:

<!-- s:60bf4677c2 -->
Header respons dari middleware ditambahkan ke respons akhir kecuali route handler mengatur header yang sama.

<!-- s:ef657b8fe3 -->
Cookie

<!-- s:5d3635224b -->
`request.cookies` membaca header `Cookie`; `response.cookies` menulis `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Cookie yang diatur pada respons `next()` atau `rewrite()` juga terlihat oleh route handler dalam permintaan yang sama.

<!-- s:a65a1ce099 -->
Pekerjaan latar belakang

<!-- s:de593dc070 -->
Argumen kedua memiliki `waitUntil()`, yang menjaga runtime serverless tetap aktif setelah respons dikirim:

<!-- s:63e13e87b3 -->
Catatan

<!-- s:971c06c875 -->
- Halaman yang dirender di sisi klien dirender di browser, sehingga rewrite ke halaman lain mengubah file yang disajikan, bukan route yang dirender aplikasi konsol. Rewrite ke route handler, file statis dan origin eksternal berperilaku sesuai harapan.
- Middleware dapat membaca body permintaan; route handler tetap menerimanya. Body permintaan yang dikecualikan oleh matcher tidak pernah disentuh.
- `request.url` selalu memiliki origin server: target permintaan seperti `//other.host/x` dinormalisasi menjadi satu garis miring di awal.
- [Adapter statis](/docs/deploying#static) tidak dapat menjalankan middleware.
