<!-- s:7e7d3cb07e -->
`text build --embed` membangun aplikasi Anda agar situs lain dapat menambahkannya dengan satu tag skrip, seperti halaman pemasaran, situs dokumentasi, halaman WordPress atau Webflow, atau aplikasi React 18. Pengunjung yang membuka DevTools mendapatkan aplikasi Anda di konsol. Pengunjung lain mengunduh `embed.js` (sekitar 3 kB dengan gzip) saja, kecuali halaman memiliki `<text-console>`.

<!-- s:2aa1d07d89 -->
Embed bersifat eksperimental. `text build --embed`, opsi `embed`, `<text-console>`, dan ekspor `@textjs/app/experimental` dapat berubah dalam rilis minor. Lihat [Perubahan yang memutus kompatibilitas](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Menambahkan aplikasi ke situs

<!-- s:f296ccaeef -->
Bangun aplikasi:

<!-- s:2198c52791 -->
Unggah `dist/` ke host statis atau CDN mana pun, atau salin ke folder `public/` situs, lalu tambahkan satu tag ke halaman situs:

<!-- s:aa94ef1985 -->
`embed.js` memuat file lainnya relatif terhadap URL-nya sendiri, sehingga `dist/` berfungsi dari path atau origin mana pun. Isinya hanya `embed.js` dan `assets/`, tanpa `index.html` atau `404.html` yang dapat menggantikan file milik situs. Aplikasi dengan [route yang di-render di server](#server-rendered-routes), route handler, atau middleware memerlukan server, bukan unggahan statis biasa. Adaptor `vercel` dan `cloudflare` menjalankan route handler dan middleware, dan route yang di-render di server memerlukan `text start` atau adaptor `bun`.

<!-- s:5c139759a2 -->
Untuk menunjukkan lokasi aplikasi kepada pengunjung, tambahkan [`<text-console>`](#text-console) di mana saja pada halaman. Elemen apa pun dengan `data-textjs-engage` juga memulai aplikasi saat ditekan:

<!-- s:6a70ec16e1 -->
Untuk mencobanya secara lokal, jalankan `text dev --embed`. Perintah ini menyajikan `/embed.js` dengan frame pertama yang baru pada setiap permintaan, dan halaman pratinjau di `/` (`/__textjs/embed` dengan `standalone`) yang memuatnya seperti situs lain. Situs pada port lokal lain juga dapat memuat `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Konfigurasi

<!-- s:aa9630bf92 -->
`text build --embed` sama dengan `embed: true` di `text.config.ts`. Berikan objek untuk mengubah nilai default:

<!-- s:fbe8efc9f4 -->
| Opsi | Default | Deskripsi |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | Route yang dibuka konsol. Harus diawali dengan `/` |
| `globalName` | `"text"` | Nama global tempat aplikasi memasang API konsolnya setelah dimulai. `false` tidak memasang apa pun |
| `initialClear` | `false` | Bersihkan konsol halaman sebelum frame pertama. Secara default, log halaman sebelumnya tetap berada di atas aplikasi |
| `standalone` | `false` | Bangun juga halaman milik aplikasi (`index.html`), seperti yang dilakukan `text build` tanpa `embed` |
| `allowOrigins` | `[]` | Situs yang halamannya boleh menjalankan route yang di-render di server dari server ini. Lihat [Route yang di-render di server](#server-rendered-routes) |
| `credentials` | `false` | Kirim kredensial browser untuk server ini bersama permintaan sesi langsung dari `allowOrigins`, alih-alih membuang cookie dan `Authorization`. Memerlukan origin yang persis |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (default 120 × 36) adalah ukuran frame pertama. `title`, `hints`, dan `action` adalah nilai default `<text-console>`. `embed.js` tidak memiliki frame pertama yang di-prerender dengan `ppr: false`, atau ketika `middleware.ts` dapat cocok dengan `initialPath`, karena siapa pun dapat mengunduh `embed.js`. Mirror tetap kosong sampai aplikasi menggambar.

<!-- s:7ca27066c7 -->
Cara kerjanya

<!-- s:1fe89ec57c -->
- **Tidak ada lagi yang dimuat sampai ada [niat menggunakan konsol](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` mencatat frame pertama yang di-prerender ke log, lalu menunggu. Aplikasi dimuat saat DevTools ditambatkan (saat pemuatan atau sesudahnya), saat pengunjung menekan pintasan DevTools pada halaman (F12, Ctrl+Shift+J, I, C atau K, atau ⌘⌥J, I, C atau K pada Mac), atau saat mereka menekan `<text-console>` atau elemen `[data-textjs-engage]`. Setelah itu, pemuatan ulang di tab yang sama langsung memulainya. DevTools di jendelanya sendiri tidak mengubah ukuran halaman, sehingga pengunjung yang membukanya dari menu melihat frame pertama sampai mereka menekan salah satu elemen tersebut.
- **Pada layar sentuh, aplikasi tidak dimulai.** Pada perangkat yang cocok dengan `(hover: none) and (pointer: coarse)`, `embed.js` tidak mencatat log apa pun dan tidak menambahkan listener. Satu-satunya file yang dimuat adalah file `<text-console>`, untuk mirror.
- **Tombol hanya diteruskan ke aplikasi setelah pengunjung mengaktifkannya.** Untuk mengaktifkannya, mereka menekan `<text-console>` atau elemen `[data-textjs-engage]`, atau mengeklik halaman (bukan tautan, tombol, atau kolom) untuk mengembalikan fokus dari DevTools. Ketikan di kolom milik halaman atau di elemen `[data-textjs-bypass]` tidak pernah diteruskan ke aplikasi, dan roda gulir selalu menggulir halaman.
- **URL, riwayat, dan judul halaman tidak pernah berubah.** Route, `<Link>`, dan `useRouter()` bernavigasi di dalam konsol. Pada aplikasi yang di-render di klien, URL absolut terbuka di tab baru.
- **Aplikasi Text.js pada halaman mendapat prioritas.** Saat aplikasi tersebut dimulai, embed yang sedang berjalan dilepas, berhenti membaca tombol, dan menghapus globalnya. Embed yang dimuat saat aplikasi lain menguasai konsol mencatat satu peringatan dan tidak dimulai.
- **Embed membundel React 19 sendiri.** Embed tidak memiliki `react-dom` atau impor tanpa path, sehingga versi React halaman, peta impor untuk `react`, dan React DevTools tidak memengaruhinya.

<!-- s:5bd6dcbe49 -->
File dan waktu pemuatannya

<!-- s:631a37c837 -->
| File | Dimuat | gzip |
| :-- | :-- | --: |
| `embed.js` | Bersama halaman | 2,9 kB |
| `assets/text-console-[hash].js` | Saat halaman memiliki `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` dan `assets/yoga-[hash].wasm` | Saat ada niat menggunakan konsol | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Saat ada niat menggunakan konsol, menggantikan klien, untuk [route yang di-render di server](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | Saat aplikasi pertama kali menampilkan teks kanan ke kiri (lihat [Memuat mesin bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Ukuran ini untuk kotak status berbingkai pada 120 × 36. `text build --embed` mencetak ukuran aplikasi Anda. `assets/embed-[hash].js` adalah salinan `embed.js` dengan nama yang tidak pernah berubah (lihat [Deploy](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` mendefinisikan `<text-console>` dan memuat filenya hanya saat elemen tersebut ada pada halaman. Elemen ini menggunakan Shadow DOM, sehingga CSS halaman tidak menjangkau bagian dalamnya, dan kebijakan `style-src 'self'` tidak memerlukan perubahan.

<!-- s:9ceead3eca -->
Tanpa atribut, elemen ini berupa bilah satu baris. Bilah menampilkan pintasan browser untuk membuka konsol, lalu meminta klik, lalu mencantumkan tombol aplikasi, yang menyala saat diteruskan ke aplikasi. Di Safari, langkah pertama meminta pengunjung mengaktifkan “Tampilkan fitur untuk pengembang web” di pengaturan Safari.

<!-- s:899e0c7fe3 -->
Dengan `mirror`, elemen ini menampilkan frame aplikasi pada halaman: frame pertama yang di-prerender sebelum hal lain dimuat, lalu aplikasi yang berjalan. Menekannya memulai aplikasi dan meneruskan tombol pengunjung, sehingga aplikasi berfungsi saat DevTools tertutup. `chrome` menggambar jendela DevTools di sekeliling mirror dan menyertakan `mirror`.

<!-- s:fefcb3e495 -->
| Atribut | Deskripsi |
| :-- | :-- |
| `mirror` | Tampilkan frame aplikasi |
| `chrome` | Tampilkan frame dalam jendela DevTools |
| `title` | Judul bilah (default: `title` di `text.config.ts`) |
| `hints` | Tombol yang dicantumkan, seperti `"← →:switch region, Enter:open"` (default: `hints` di `text.config.ts`) |
| `action` | Tindakan pertama, ditampilkan sebagai “Klik di sini dan …” (default: `action` di `text.config.ts`, atau tekan petunjuk pertama) |

<!-- s:392012169b -->
Pada layar sentuh, mirror menampilkan frame pertama tanpa memulai aplikasi, dan bilah disembunyikan. Teks elemen ini berbahasa Inggris.

<!-- s:13ff4ec1f4 -->
Menyiapkan ruang

<!-- s:0f4e2c234d -->
`text build --embed` mencetak satu baris CSS untuk kisi aplikasi Anda. Tempelkan ke stylesheet halaman. CSS ini menetapkan ukuran `<text-console>` sebelum file elemen dimuat, sehingga tidak ada yang bergeser pada halaman saat file tiba. Untuk kisi default 120 × 36, barisnya adalah:

<!-- s:a2d2741417 -->
Tinggi bilah adalah 58 px. Mirror mempertahankan rasio aspek kisi, hingga lebar alaminya (885 px pada 120 kolom), dan `chrome` menambahkan 43 px. Ukurannya tidak bergantung pada font. `reserveCss(cols, rows)` dari `@textjs/app/experimental` mengembalikan baris yang sama.

<!-- s:a1260c10c3 -->
Mirror di area awal yang terlihat biasanya merupakan elemen terbesar halaman, sehingga menentukan Largest Contentful Paint (LCP) halaman. Frame pertamanya digambar setelah `embed.js` lalu file elemen dimuat secara berurutan. Bagian halaman lainnya digambar seperti tanpa embed. Mirror yang lebih jauh di bawah halaman tidak memengaruhi LCP. Pada halaman dengan skrip tertunda sendiri, seperti aplikasi React, `<script type="module" async src="…">` menjalankan `embed.js` tanpa menunggunya, sehingga mirror di area awal yang terlihat digambar lebih cepat.

<!-- s:4206a424a5 -->
Penataan gaya

<!-- s:834fbf40e6 -->
Untuk menempatkan mirror di tengah, berikan margin inline otomatis:

<!-- s:6dde2b2766 -->
Secara default, warnanya gelap. Tetapkan `color-scheme: light` untuk warna terang, atau tetapkan dua warna dasar yang dicampur untuk menghasilkan semua corak lainnya. `::part(frame)` mengatur gaya frame itu sendiri. `chrome` mempertahankan latar belakang milik DevTools.

<!-- s:f5e077273b -->
Route yang di-render di server

<!-- s:eb293d9fb4 -->
Ketika `initialPath` adalah route dengan `export const runtime = "server"`, `embed.js` memuat pemutar frame alih-alih runtime klien. Pemutar ini mengalirkan frame dari server asal `embed.js`, jadi jalankan `text start` atau adaptor `bun`. Adaptor lain menggagalkan build. Lihat [Rendering di server](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Halaman di situs lain hanya dapat membuka sesi langsung ketika origin-nya ada di `allowOrigins`:

<!-- s:6ec7048857 -->
- Sesi hanya merespons origin yang membukanya.
- Secara default, Text.js membuang cookie dan header `Authorization` dari sesi situs lain, sehingga [middleware](/docs/middleware) melihat pengunjung yang belum masuk. `credentials: true` mempertahankannya, dan memerlukan origin yang persis. Browser mengirimkannya ketika halaman dan server berbagi domain yang dapat didaftarkan (`www.example.com` dan `console.example.com`) dan cookie mencakup server (`Domain=example.com`, atau ditetapkan pada `console.example.com`). Dari situs lain, browser hanya mengirim cookie yang ditetapkan dengan `SameSite=None; Secure`, dan browser yang memblokir cookie pihak ketiga tidak mengirim cookie apa pun.
- Sesi langsung mengirim preflight `OPTIONS` ke `/__textjs/live` segera setelah terhubung, dan saat terhubung kembali. Preflight tidak membawa cookie atau `Authorization`, sehingga middleware yang cocok dengan path tersebut harus mengizinkan permintaan `OPTIONS` lewat tanpa masuk.
- Di belakang reverse proxy atau CDN, tetapkan `server.trustProxy` (lihat [Di belakang proxy](/docs/deploying#behind-a-proxy)). Tanpanya, setiap pengunjung memiliki alamat proxy, sehingga semuanya berbagi satu batas sesi per klien.

<!-- s:f739524722 -->
`text dev` menerima halaman di `localhost`, `127.0.0.1`, dan `[::1]` pada port mana pun tanpa `allowOrigins`, kecuali `credentials` ditetapkan.

<!-- s:d5df7bf60f -->
Hosting

<!-- s:4bef54c1c0 -->
`text start` serta adaptor `bun`, `vercel`, dan `cloudflare` menyajikan build embed dengan header berikut. Adaptor `static` menuliskannya ke `_headers`, yang dibaca Cloudflare Pages dan Netlify. Pada host lain, seperti bucket penyimpanan atau folder `public/` milik situs, tetapkan sendiri:

<!-- s:be81a4c5ec -->
| Path | Header |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Keduanya, saat situs berada di origin lain | `Access-Control-Allow-Origin: *` dan `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Browser mengambil skrip modul dan WebAssembly dengan CORS, sehingga file di origin lain memerlukan `Access-Control-Allow-Origin`. Sajikan `yoga-[hash].wasm` sebagai `application/wasm` dalam bentuk terkompresi (lihat [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Deploy

<!-- s:01b888e293 -->
`embed.js` divalidasi ulang setiap kali halaman dimuat, sehingga pengunjung baru langsung mendapatkan deploy baru. Tab yang memuat `embed.js` sebelumnya tetap mengimpor file build sebelumnya saat pengunjung membuka konsol, mungkin beberapa jam kemudian. Pertahankan `assets/` dari deploy sebelumnya agar tetap online: salin file baru ke atas file lama alih-alih menyinkronkan dengan penghapusan, dan hapus file lama setelah satu atau dua hari. Untuk mengunci build, masukkan `assets/embed-[hash].js` miliknya ke dalam tag. File build tersebut juga harus tetap online.

<!-- s:b748b07652 -->
Saat file sudah tidak ada, `embed.js` mencatat satu peringatan yang meminta pengunjung memuat ulang, dan tidak memulai aplikasi atau memuat ulang halaman sendiri.

<!-- s:fce19037b3 -->
Kebijakan keamanan konten

<!-- s:de8e30a920 -->
`embed.js` tidak memerlukan skrip atau gaya inline. Tambahkan ini ke kebijakan halaman host, dengan `'self'` sebagai pengganti origin saat `dist/` berada di origin yang sama:

<!-- s:2da4077ce0 -->
| Direktif | Nilai | Untuk |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` dan chunk-nya |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, dalam aplikasi yang di-render di klien |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`, dan `/__textjs/live` untuk route yang di-render di server |
| `img-src` | `data:` | Hanya `<text-console mirror>` yang aplikasinya menggambar `<Image>` atau `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Memuat aplikasi sendiri

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` mengekspor bagian penyusun `embed.js`, untuk halaman yang memuat aplikasi dengan caranya sendiri:

<!-- s:238cbf53ee -->
| Ekspor | Deskripsi |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Yang dijalankan `embed.js`: mencatat frame pertama, menunggu niat membuka konsol, lalu memanggil `boot` |
| `bootEmbedClient(options)` | Memulai aplikasi yang di-render di klien dengan routing dalam memori dan input keyboard yang aksesnya dikendalikan untuk halaman |
| `bootEmbedPlayer(options)` | Memulai pemutar frame untuk route yang di-render di server |
| `createHostInput(options)` | Input keyboard yang mengikuti aturan di atas |
| `createTextConsoleMount(config)` | Mengembalikan fungsi `mount(element, shell?)` untuk `<text-console>` |
| `reserveCss(cols, rows)` | CSS yang menyediakan ruang untuk `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` dan `BYPASS_SELECTOR` adalah selektor untuk elemen yang memulai aplikasi dan elemen yang mempertahankan input tombolnya sendiri.
