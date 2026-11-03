<!-- s:c88a0b9074 -->
Berhasil

<!-- s:232761cbc8 -->
Tidak terjadi kesalahan.

<!-- s:0dbfdefc62 -->
Tidak perlu tindakan apa pun.

<!-- s:5278892fa4 -->
Yoga belum diinisialisasi

<!-- s:3cc543df2e -->
Layout berjalan di Yoga, yang disertakan sebagai WebAssembly dan harus dibuat instansinya sebelum frame pertama. Sesuatu membuat node adegan atau root secara sinkron sebelum `initYoga()` selesai.

<!-- s:08db9c8a11 -->
Gunakan helper root asinkron, yang menginisialisasi Yoga untuk Anda:

<!-- s:0cc02c96a3 -->
Jika Anda memerlukan `createConsoleRootSync()` atau graf adegan inti secara langsung, tunggu `initYoga()` sekali saat startup:

<!-- s:0f5cc351a1 -->
Aplikasi yang dimulai dengan `text dev` tidak pernah mengalami kesalahan ini.

<!-- s:cebca37b05 -->
Di-render di luar root konsol

<!-- s:c3b259f977 -->
Hook atau komponen Text.js (`useInput`, `<ScrollBox>`, …) di-render di bawah root React yang bukan root konsol, paling sering karena `react-dom` me-render komponen yang ditujukan untuk konsol.

<!-- s:6f1ee54e3e -->
Render komponen konsol melalui `renderToConsole` (atau `createConsoleRoot`), bukan `react-dom`:

<!-- s:c7cb019122 -->
Untuk menampilkan UI yang sama di halaman, gunakan `<TextCanvas>` dari `@textjs/react/dom`, yang membuat root konsolnya sendiri.

<!-- s:b657e4704a -->
Elemen host tidak dikenal

<!-- s:a8bb5bc9a5 -->
Reconciler hanya memahami dua elemen intrinsik, `tx-box` dan `tx-text`. Elemen berhuruf kecil seperti `<div>` atau `<span>` diteruskan kepadanya.

<!-- s:407e421c11 -->
Gunakan komponen yang diekspor sebagai gantinya:

<!-- s:2381168639 -->
<Box> bersarang di dalam <Text>

<!-- s:2e17219271 -->
`<Text>` menata rangkaian teks inline; elemen ini tidak dapat memuat kontainer Flexbox. Sebuah `<Box>` (atau komponen yang me-render elemen tersebut, seperti `<Spacer>` atau `<Divider>`) di-render di dalam `<Text>`.

<!-- s:cd12727fb7 -->
Pindahkan `<Box>` ke luar dan letakkan elemen teks sejajar secara berdampingan dalam satu baris:

<!-- s:0346a73e37 -->
`<Text>` bersarang diperbolehkan; elemen ini di-render sebagai span inline.

<!-- s:32864d644a -->
Render setelah unmount

<!-- s:c194b81d64 -->
`root.render()` dipanggil pada root konsol setelah `root.unmount()`. Root yang telah di-unmount sudah melepas renderer dan listener inputnya.

<!-- s:4d43c601c1 -->
Buat root baru, atau biarkan root tetap ter-mount dan render pohon yang berbeda:

<!-- s:41d1a6160d -->
Dalam pengujian, periksa `root.unmounted` sebelum me-render dari callback asinkron.

<!-- s:c5d7700094 -->
Modifier tidak dikenal dalam kombinasi tombol

<!-- s:7729dd7762 -->
Setiap bagian kombinasi sebelum `+` terakhir harus berupa modifier: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) atau `mod` (`⌘` di Apple, `Ctrl` di platform lain).

<!-- s:d5ba2b08ed -->
Tombol tidak dikenal dalam kombinasi tombol

<!-- s:a68eb32bc2 -->
Bagian terakhir kombinasi harus berupa satu karakter, tombol bernama (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) atau tombol fungsi (`f1`–`f12`).

<!-- s:69f231367c -->
Urutan terdiri dari penekanan tombol yang dipisahkan spasi (`"g g"`). Alternatif dipisahkan koma (`"j, down"`).

<!-- s:92663abe8d -->
Kombinasi tombol kosong

<!-- s:aa16466cb6 -->
Kombinasi berakhir tanpa tombol, misalnya `"ctrl+"` atau `""`.

<!-- s:13284de673 -->
Tentukan nama tombolnya. Untuk mengikat tombol plus itu sendiri, tulis `"ctrl++"`:

<!-- s:f329e5f580 -->
Diharapkan satu penekanan tombol

<!-- s:95712ddbf5 -->
Penekanan tombol adalah satu tindakan penekanan konkret. `keyEventFromCombo()` menerima urutan seperti `"g g"`, atau alat MCP `press` menerima alternatif seperti `"a,b"`.

<!-- s:0348879743 -->
Buat satu event per penekanan. `app.press()` dalam pengujian dan alat MCP `press` memisahkan urutan yang dipisahkan spasi untuk Anda:

<!-- s:467193a3d5 -->
Tidak ada stdout untuk renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` menulis frame ANSI ke `process.stdout` secara default. Fungsi ini berjalan di lingkungan yang tidak memilikinya (browser, worker) dan tidak menerima opsi `stdout`.

<!-- s:90c3d0ac1f -->
Jalankan di Bun atau Node, atau berikan stream yang dapat ditulisi:

<!-- s:d3a77e5829 -->
Di browser, gunakan `renderToConsole` sebagai gantinya.

<!-- s:f201fe8e80 -->
<Image src> tanpa DOM

<!-- s:b9f409f560 -->
`<Image src>` mendekode gambar melalui `<img>` dan canvas. Tidak ada `document` di sini (terminal, server, pengujian), sehingga URL tidak dapat dimuat.

<!-- s:3c284cd278 -->
Dekode gambar sendiri dan teruskan piksel RGBA:

<!-- s:775d3d31e6 -->
Tidak ada kanvas 2D untuk <Image>

<!-- s:7da15f3e88 -->
Browser menolak konteks kanvas `2d`, biasanya karena kebijakan atau perlindungan terhadap fingerprinting menonaktifkan kanvas, atau halaman kehabisan memori GPU.

<!-- s:59ad35999f -->
Teruskan `pixels` yang didekode di tempat lain, atau render cadangan `alt`. `<Image>` sudah menampilkan teks `alt` saat pemuatan gagal:

<!-- s:ca446b6432 -->
<Image> gagal dimuat

<!-- s:f11b7bffe8 -->
Permintaan gambar gagal: 404, kesalahan jaringan, atau server lintas origin yang tidak mengirim `Access-Control-Allow-Origin`. Piksel dibaca dari kanvas, sehingga gambar lintas origin memerlukan CORS.

<!-- s:5e5daf0ad8 -->
Sajikan gambar dari origin Anda sendiri (`public/`), atau aktifkan CORS pada host gambar:

<!-- s:aca80fe237 -->
Digunakan di luar <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` dan `<Link>` membaca state yang disediakan `<AppRouter>`. Komponen di-render di luarnya, biasanya dalam pemanggilan `renderToConsole` mandiri atau pengujian unit.

<!-- s:0dd134139b -->
Jalankan aplikasi dengan `text dev`, `text start` atau `text run`, yang memasang `<AppRouter>` untuk Anda. Saat melakukan rendering secara manual (pengujian, penyematan), pasang router alih-alih halaman:

<!-- s:f72dd41076 -->
File route tidak memiliki komponen default

<!-- s:bb105b223b -->
File `page`, `layout`, `loading`, `error` dan `not-found` harus mengekspor komponen React dengan `export default`. File ini tidak mengekspor apa pun secara default, atau mengekspor sesuatu yang bukan fungsi.

<!-- s:737da9f930 -->
Route handler tidak mengembalikan Response

<!-- s:cb8f799843 -->
Handler `route.ts` menghasilkan `undefined` (atau nilai lain yang bukan `Response`), biasanya karena salah satu cabang tidak memiliki `return`.

<!-- s:ec7e161fb3 -->
Kembalikan `Response` dari setiap cabang:

<!-- s:62e5198b56 -->
Tidak ada build produksi

<!-- s:6668a2f9b4 -->
`text start` menyajikan keluaran `text build`, dan direktori keluaran (`outDir`, default `dist`) tidak berisi build.

<!-- s:498f1313ed -->
Jika Anda mengubah `outDir` di `text.config.ts`, jalankan kedua perintah dari root proyek yang sama.

<!-- s:dfda64bc1d -->
Tidak ada direktori app/

<!-- s:38ac920023 -->
`text run` me-render App Router di terminal Anda dan tidak dapat menemukan direktori route.

<!-- s:6853e006ef -->
Jalankan dari root proyek, atau teruskan direktori proyek:

<!-- s:5a6362131f -->
text run / text mcp memerlukan Bun

<!-- s:773405124b -->
`text run` dan `text mcp` mengimpor file route `.tsx` Anda secara langsung, yang memerlukan pemuat TypeScript bawaan Bun. Saat dimulai dengan Node, CLI menjalankan ulang dirinya dengan Bun jika `bun` ada di `PATH`; kesalahan ini berarti `bun` tidak ada di sana.

<!-- s:6f7a84fdc6 -->
Instal [Bun](https://bun.sh), atau jalankan perintah langsung dengan Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` dan `text start` berfungsi di Node.

<!-- s:89a2fef8aa -->
Perintah CLI tidak dikenal

<!-- s:eba41925ed -->
CLI `text` memiliki enam perintah: `dev`, `build`, `start`, `run`, `proxy` dan `mcp`.

<!-- s:8399f0df32 -->
Tidak ada `text deploy`. Buat build untuk platform Anda dengan `text build --adapter <name>` dan deploy keluarannya dengan CLI platform tersebut. Lihat [Deploy](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL server OpenCode tidak valid

<!-- s:486a7eb67b -->
`--target` (atau `OPENCODE_SERVER_URL`) harus berupa origin HTTP(S) saja. Nilainya memuat path, kueri, hash atau kredensial. Kredensial dalam URL akan tersimpan di log dan riwayat browser.

<!-- s:a2f7bb7ff8 -->
Sebagai gantinya, atur kata sandi server dengan `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Port bridge bentrok dengan OpenCode

<!-- s:8780127b8f -->
Bridge diminta mendengarkan pada port lokal yang sama dengan server OpenCode yang menjadi tujuan proxy-nya.

<!-- s:0b359d8121 -->
Bridge sudah berjalan

<!-- s:76e9990092 -->
Bridge lain (`bunx @textjs/opencode@latest proxy` atau `text proxy`) sudah mendengarkan pada port ini. Anda dapat menghubungkannya alih-alih memulai bridge lain.

<!-- s:d5c7dd3e92 -->
Hubungkan ke bridge yang berjalan, atau mulai bridge kedua pada port lain:

<!-- s:20a5f0b929 -->
Port bridge sedang digunakan

<!-- s:4fb3fcf34c -->
Sesuatu selain bridge Text.js sedang mendengarkan pada port yang diminta.

<!-- s:4a35b098e4 -->
Atau cari proses lain tersebut: `lsof -i :4096`.

<!-- s:f694899be6 -->
Template tidak dikenal

<!-- s:13309ae8df -->
`--template` harus menyebutkan salah satu template bawaan: `starter`, `dashboard` atau `opencode`.

<!-- s:162e762178 -->
Direktori tujuan tidak kosong

<!-- s:24518256d0 -->
create-text-app hanya membuat struktur proyek di direktori baru atau kosong agar tidak pernah menimpa berkas Anda. Direktori `.git` dan folder editor (`.vscode`, `.idea`) diperbolehkan.

<!-- s:2d505908ff -->
Pilih nama direktori baru:

<!-- s:0c1a816fb9 -->
Nama proyek tidak valid

<!-- s:46e6e56ab7 -->
Nama direktori menjadi nama dalam `package.json`, yang harus berupa nama paket npm yang valid: berhuruf kecil, sesuai untuk URL, maksimal 214 karakter, dan bukan salah satu dari `textjs`, `react`, `react-dom`, `node_modules` atau `favicon.ico`.

<!-- s:5aa32a2677 -->
Host diblokir

<!-- s:7c7e94bc6b -->
`text dev`, serta `text start` saat terikat ke loopback (bawaan), hanya menjawab permintaan yang ditujukan ke `localhost`, nama `*.localhost` atau alamat IP. Ini melindunginya dari DNS rebinding. Sebuah permintaan datang dengan header `Host` lain, biasanya melalui tunnel, reverse proxy atau nama host LAN.

<!-- s:8caece973a -->
Izinkan host di `text.config.ts`. `text dev` membaca `vite.server.allowedHosts` milik Vite, dan `text start` membaca `server.allowedHosts`. Awalan `.` mengizinkan subdomain:

<!-- s:2c7d7369a1 -->
`text start --host` dengan alamat apa pun selain loopback melewati pemeriksaan ini. Lihat [Di balik proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Opsi text.config tidak dikenal

<!-- s:5117146873 -->
`text.config.ts` mengekspor kunci yang tidak dibaca Text.js, biasanya akibat salah ketik (`basepath` alih-alih `basePath`) atau opsi Vite di tingkat teratas.

<!-- s:31ae46d91d -->
Perbaiki ejaannya, atau pindahkan opsi Vite ke dalam `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` memeriksa tipe konfigurasi dan mendeteksi kesalahan ini di editor Anda.

<!-- s:d1de5d5931 -->
Route yang di-render di server memerlukan server yang terus berjalan

<!-- s:d06541fc12 -->
Sebuah halaman mengekspor `runtime = "server"`: halaman tersebut di-render di server dan mengalirkan frame ke setiap tab yang terbuka melalui sesi yang berlangsung selama tab tersebut terbuka. Host statis, Vercel Functions dan Cloudflare Workers tidak bisa mempertahankan sesi tersebut, sehingga `text build --adapter static|vercel|cloudflare` menolak aplikasi alih-alih menghasilkan route yang tidak bisa di-render.

<!-- s:27f8e0c99e -->
Deploy dengan server yang terus berjalan:

<!-- s:3ba9e63872 -->
Atau render route di browser dengan menghapus ekspor tersebut:

<!-- s:b39194c0e6 -->
Ekspor dynamic tidak valid

<!-- s:218844a290 -->
Sebuah route handler mengekspor `dynamic` dengan nilai yang tidak didukung Text.js. Next.js juga menerima `"error"`, yang me-render route secara statis dan menggagalkan build jika route membaca data permintaan. Text.js tidak bisa mendeteksi pembacaan permintaan, sehingga menolak `"error"`.

<!-- s:78a6bdcb90 -->
Gunakan `"force-static"` untuk menyimpan handler dalam cache. Handler yang di-cache menerima permintaan tanpa string kueri, header, cookie atau body:

<!-- s:95d0435b57 -->
Gunakan `"force-dynamic"`, atau hapus ekspor tersebut, jika handler membaca permintaan. Lihat [Penyimpanan cache](/docs/caching).
