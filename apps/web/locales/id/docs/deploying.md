<!-- s:04615ef523 -->
`text build` menghasilkan `dist/` yang portabel. Adaptor mengubahnya menjadi keluaran yang diharapkan platform.

<!-- s:087f8d3137 -->
Adaptor

<!-- s:04908c6c09 -->
| Adaptor | Keluaran | Dijalankan dengan |
| :-- | :-- | :-- |
| *(tidak ada)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Host statis apa pun |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
Adaptor juga dapat ditentukan melalui `TEXTJS_ADAPTER`. Saat `text build` berjalan di Vercel (`VERCEL=1`) atau Cloudflare Pages (`CF_PAGES=1`), adaptor yang sesuai dipilih secara otomatis.

<!-- s:9d8df946e5 -->
Adaptor server (`bun`, `vercel`, dan `cloudflare`) menjalankan pipeline yang sama dengan `text start`: [middleware](/docs/middleware), `rewrites`, [route handler](/docs/route-handlers) dengan [cache route](/docs/caching), aset statis, lalu dokumen konsol untuk URL halaman. Klien terminal seperti curl menerima frame pertama halaman sebagai teks ANSI. Pada `vercel` dan `cloudflare`, ini hanya mencakup halaman statis (lihat [curl dan klien terminal](/docs/curl)). Adaptor server menyajikan file dengan hash di bawah `/assets/` dengan `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Statis

<!-- s:9ebd0d2866 -->
Gunakan untuk host tanpa server, seperti GitHub Pages, S3, atau CDN. Route handler `GET` dengan `dynamic = "force-static"` atau `revalidate` menjalani prerender menjadi file: `app/api/feed.json/route.ts` menjadi `dist/api/feed.json`. Salinan `index.html` ditulis ke `404.html` agar deep link membuka aplikasi konsol. Host statis tidak dapat membedakan curl dari browser, sehingga curl menerima halaman HTML.

<!-- s:1e90536a2a -->
Build gagal dan mencantumkan setiap alasannya jika aplikasi memerlukan server: `middleware.ts`, [route yang di-render di server](/docs/server-rendering), route handler dinamis, route handler dengan segmen dinamis, atau metode selain `GET`. Konfigurasikan `rewrites` pada host sebagai gantinya.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
Adaptor `bun` menulis satu server mandiri yang tidak memerlukan `node_modules` saat runtime. Server ini membaca `PORT` (default `3000`) dan `HOSTNAME` (default `0.0.0.0`), dan tidak pernah menyajikan `server.js` atau `.text/`. Proses ini berjalan dalam jangka panjang, sehingga juga menghosting [route yang di-render di server](/docs/server-rendering) (`export const runtime = "server"`) beserta sesi aktifnya, seperti `text start`. Gunakan dalam container:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Atau push ke repositori Git yang terhubung ke Vercel: build menjalankan `text build`, mendeteksi Vercel, dan menulis `.vercel/output`.

<!-- s:3ee6894582 -->
| Keluaran | Isi |
| :-- | :-- |
| `static/` | Build klien (di bawah `basePath`) |
| `functions/_textjs/server.func` | Satu fungsi Node.js 22 yang melayani setiap route handler, dengan streaming |
| `functions/_middleware.func` | Edge Routing Middleware: `middleware.ts`, dan path kanonis untuk setiap aplikasi |
| `config.json` | Header aset, pencocok middleware, rewrites, route handler, dan dokumen konsol |

<!-- s:3f3ba93b7d -->
Edge middleware menggunakan protokol `x-middleware-next` / `x-middleware-rewrite`, sehingga penggantian header dan rewrites berlangsung di router Vercel sebelum mencapai fungsi atau CDN. Semua pencocok menggunakan satu pola route `src` yang sama. Permintaan yang tidak tercakup oleh pencocok mana pun melewati middleware kecuali path-nya mungkin tidak dalam bentuk kanonis (escape persen, karakter yang dienkode parser URL, `//`, segmen `.` atau `..`, garis miring di akhir). Middleware kemudian mencocokkan path kanonis, memeriksa `has` / `missing`, dan menulis ulang permintaan ke path tersebut agar Vercel merutekannya dengan cara yang sama. Aplikasi tanpa `middleware.ts` mendapat edge function yang sama, yang hanya melakukan penulisan ulang. Karena setiap build menyertakan fungsi Edge, deploy dari akun Vercel yang sudah login: deployment anonim (`vercel deploy --temporary`) tidak menerima fungsi Edge.

<!-- s:b5af065e25 -->
Fungsi handler bersifat internal. Setiap route handler meneruskan path yang cocok ke fungsi tersebut melalui header permintaan `x-textjs-path`. Header tersebut dihapus dari setiap permintaan sebelum dan sesudah middleware, dan edge middleware tidak pernah meneruskannya (dari klien maupun dari `middleware.ts`), sehingga hanya route handler yang dapat menetapkannya. Permintaan untuk `/_textjs/*` mengembalikan `404` tanpa menjalankan fungsi, sebelum dan sesudah middleware serta rewrites. Route yang dihasilkan mencocokkan dengan membedakan huruf besar dan kecil, seperti pencocok dan rewrites pada setiap host lainnya.

<!-- s:5e18b8a450 -->
Pengujian adaptor menjalankan keluaran ini terhadap emulasi lokal router Vercel. Perilakunya untuk pencocokan `src`, tangkapan `dest`, transformasi header, dan route `status` diperiksa terhadap deployment nyata; edge middleware tidak diperiksa karena tidak dapat di-deploy secara anonim.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
Keluaran menggunakan mode lanjutan Pages:

<!-- s:9f0923168f -->
| File | Kegunaan |
| :-- | :-- |
| `_worker.js` | Middleware, rewrites, route handler, dan dokumen konsol |
| `_routes.json` | Mengirim setiap permintaan ke worker. Tanpa middleware atau `basePath`, `/assets/*` tetap berada di CDN statis Pages |
| `_headers` | Cache immutable untuk `/assets/*` (ditambahkan di akhir file Anda) |
| `404.html` | Membuat Pages menjawab file yang tidak ditemukan dengan `404`, bukan aplikasi (dipertahankan jika Anda memilikinya) |

<!-- s:9bc2b010d1 -->
`.text/` (bundle server dan manifes build) dihapus dari `dist/`, karena Pages menerbitkan direktori apa adanya.

<!-- s:1200dbc88d -->
Aktifkan flag kompatibilitas `nodejs_compat` dalam proyek Pages (Settings → Runtime) atau di `wrangler.toml`; cache data menggunakan `AsyncLocalStorage`. File statis disajikan melalui binding `ASSETS`, dan revalidasi latar belakang menggunakan `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Dengan middleware, setiap permintaan menjalankan worker, termasuk aset dengan hash, agar middleware melihat setiap path yang dapat digunakan untuk mengakses file. Setiap permintaan yang menjalankan worker merupakan satu pemanggilan Functions dan dihitung dalam kuota permintaan Workers Anda. Untuk pemuatan halaman, ini mencakup dokumen beserta setiap file yang diambilnya (2 untuk aplikasi uji kecil dengan satu bundle JavaScript; lebih banyak untuk aplikasi dengan lebih banyak file). Pada paket Workers Free, Pages menyajikan file statis tanpa worker setelah kuota harian habis, sehingga melewati middleware. Jika middleware melindungi apa pun dalam `dist/`, atur Settings → Runtime → Fail open / closed ke **Fail closed**.

<!-- s:600050383d -->
Pembaruan

<!-- s:e8733a2bfb -->
Perbaikan keamanan dalam `@textjs/app` hanya diterapkan pada deployment setelah Anda melakukan build dan deploy ulang:

<!-- s:c74adc728a -->
- Vercel: deploy `.vercel/output` yang baru.
- Cloudflare Pages: deploy `dist/` yang baru, beserta `_worker.js` dan `_routes.json`.
- Bun: deploy seluruh `dist/` yang baru (`server.js`, aset, dan bundle aktif) lalu mulai ulang server.
- `text start`: jalankan `text build` lalu mulai ulang.

<!-- s:8047727085 -->
Deployment lama tetap dapat diakses melalui URL masing-masing (misalnya URL pratinjau Vercel dan Cloudflare Pages). Hapus deployment tersebut atau lindungi dengan proteksi akses platform.

<!-- s:f5e077273b -->
Route yang di-render di server

<!-- s:049ef31493 -->
[Route yang di-render di server](/docs/server-rendering) menyimpan satu sesi per tab terbuka, sehingga memerlukan server yang berjalan dalam jangka panjang: `text start` atau adaptor `bun`. Adaptor `static`, `vercel`, dan `cloudflare` menggagalkan build dengan `TX030` saat halaman mengekspor `runtime = "server"`.

<!-- s:eb19728e6b -->
Di balik proxy

<!-- s:21a17d0b45 -->
`text start` mengikat ke `127.0.0.1` dan, saat terikat ke loopback, hanya menjawab `localhost`, `*.localhost`, dan host beralamat IP (perlindungan DNS rebinding). Host lain menerima `403` dengan `TX028`. Tempatkan pengaturan publik di `text.config.ts`:

<!-- s:43bd5471c8 -->
Tanpa `origin` atau `trustProxy`, `request.url` dibentuk dari header `Host` yang telah divalidasi melalui `http`.

<!-- s:689cebe287 -->
Batasan

<!-- s:f45e3fb003 -->
- `proxy` dalam `text.config.ts` hanya berjalan di `text dev` dan `text start`; adaptor tidak menyertakannya. Gunakan `rewrites`, yang didukung setiap adaptor server.
- Setiap instans serverless memiliki cache dalam memorinya sendiri. Lihat [Caching](/docs/caching#platform-notes).
- `rewrites` yang menggunakan grup ekspresi reguler mentah diterjemahkan ke route Vercel sebisa mungkin; parameter bernama (`:slug`, `:path*`) diterjemahkan secara persis.
