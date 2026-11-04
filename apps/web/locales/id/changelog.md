<!-- s:f70688822a -->
Semua perubahan penting pada Text.js didokumentasikan dalam file ini.

<!-- s:1ab5f276ed -->
Formatnya didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), dan proyek ini mengikuti [Pemversian Semantik](https://semver.org/spec/v2.0.0.html). Rilis 0.1.0 hingga 0.4.0 diberi tag di git dan tidak dipublikasikan ke npm.

<!-- s:2e16922cfc -->
Ditambahkan

<!-- s:01d85a9a48 -->
- textjs.org: versi bahasa Spanyol, Prancis, Jerman, Portugis Brasil, Korea, serta Mandarin Sederhana dan Tradisional telah keluar dari status draf di textjs.org/es, /fr, /de, /pt-br, /ko, /zh-cn dan /zh-tw. Pemilih bahasa di footer dan tombol bahasa browser menawarkan bahasa tersebut, seperti halnya bahasa Jepang. Mesin pencari mengindeks halaman terjemahan dan mencocokkan masing-masing dengan versi bahasa Inggrisnya.
- textjs.org: versi bahasa Italia, Rusia, Turki, Polandia, Indonesia, Vietnam, dan Hindi telah keluar dari status draf di textjs.org/it, /ru, /tr, /pl, /id, /vi dan /hi. Pemilih bahasa di footer dan tombol bahasa browser menawarkan bahasa tersebut, seperti halnya bahasa lainnya. Mesin pencari mengindeks halaman terjemahan dan mencocokkan masing-masing dengan versi bahasa Inggrisnya.
- textjs.org: versi bahasa Arab, Ibrani, Persia, dan Urdu telah keluar dari status draf di textjs.org/ar, /he, /fa dan /ur. Pemilih bahasa di footer dan tombol bahasa browser menawarkan bahasa tersebut, seperti halnya bahasa lainnya. Mesin pencari mengindeks halaman terjemahan dan mencocokkan masing-masing dengan versi bahasa Inggrisnya.

<!-- s:5b88618770 -->
Diubah

<!-- s:33280e468a -->
- `@textjs/react`: `<FocusPad>` dan `<ViewportControl>` menggunakan tumpukan font `--mono` halaman untuk label monospace jika halaman mendefinisikannya, dan menggunakan Geist Mono sebagai cadangan seperti sebelumnya. Halaman dengan label berbahasa Arab atau Ibrani dapat menambahkan font untuk aksaranya ke `--mono`.

<!-- s:afe76b8d59 -->
Diperbaiki

<!-- s:f0905efd51 -->
- textjs.org: di ponsel, kode inline yang lebih panjang dari baris kini terbungkus ke baris berikutnya alih-alih memperlebar halaman. textjs.org/docs/internationalization sebelumnya terlalu lebar 92 px pada layar 390 px.

<!-- s:f71df9184f -->
- `@textjs/react`: `<FocusPad messages>` mengganti string bawaan mana pun pada pad untuk situs terjemahan. Ini mencakup setiap baris, label pembaca layar, dan kontrol ukuran konsol. `<TextCanvas>` dan `<ViewportControl>` juga menerima `messages`. `<ViewportControl>` hanya menggunakan kunci kontrol ukuran. String yang memuat nilai, seperti “Lalu klik di sini dan tekan ↑ ↓.”, berupa fungsi yang mengembalikan seluruh kalimat. `defaultFocusPadMessages` memuat teks bahasa Inggris. Lihat [Menerjemahkan focus pad](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: pada halaman kanan-ke-kiri, focus pad tetap menampilkan label tombol seperti ⌘ ⌥ J dan ukuran konsol seperti 120×36 dari kiri ke kanan, serta mencerminkan kontrol ukuran dan bilah langkahnya. Pada halaman berbahasa Mandarin dan Jepang, spasi di antara kedua kalimatnya dihilangkan; bahasa Korea tetap mempertahankannya.
- textjs.org: textjs.org/ja tidak lagi berstatus draf. Pemilih bahasa di footer membuka halaman yang sama dalam bahasa Inggris atau 日本語. Browser yang diatur ke bahasa Jepang menampilkan tombol 日本語で読む, dan browser berbahasa Inggris di textjs.org/ja menampilkan Baca dalam bahasa Inggris. Tombol tidak muncul lagi setelah Anda memilih bahasa atau menutupnya. Mesin pencari mengindeks halaman terjemahan bahasa Jepang dan mencocokkan masing-masing dengan versi bahasa Inggrisnya.
- textjs.org: di textjs.org/ja, focus pad menggunakan bahasa Jepang pada setiap halaman, termasuk label di bawah tombol setiap demo.

<!-- s:27b507a9de -->
- `@textjs/core`: konsol Chromium dan Firefox membersihkan output sprite animasi pada 16 MB, bukan 4 MB, sehingga textjs.org/doom menampilkan “Konsol telah dibersihkan” sekitar setiap 19 detik, bukan setiap 4,5 detik. Safari, serta sprite yang digambar sebagai setengah blok `▀`, tetap menggunakan 4 MB. Penggunaan heap puncak halaman di textjs.org/doom naik dari 10,8 MB menjadi sekitar 12–13 MB.
- textjs.org: halaman dokumentasi hanya mengunduh Markdown-nya sendiri, bukan seluruh 33 halaman, sehingga halaman dokumentasi bahasa Inggris memuat JavaScript (gzip) 43–47 KB lebih sedikit dan halaman dokumentasi /ja 60–64 KB lebih sedikit. Mengarahkan kursor atau fokus ke tautan halaman dokumentasi lain mengambil halaman tersebut lebih awal, sehingga tetap langsung terbuka.

<!-- s:b3d1adfa39 -->
- textjs.org/ja: pencarian ⌘K menampilkan judul bagian dokumentasi bahasa Jepang dan mencocokkan kueri bahasa Jepang dengannya. Sebelumnya, pencarian mencantumkan judul bagian bahasa Inggris di bawah judul halaman bahasa Jepang. Nama bahasa Inggris tetap menemukan halaman: `routing` menemukan ルーティング dan `open the console` menemukan コンソールを開く.
- textjs.org: contoh dokumentasi yang berjalan di konsol Anda kembali menampilkan perubahannya di pratinjau halaman pada textjs.org/ja, serta untuk contoh Teks dua arah di textjs.org/docs/internationalization. Baris di atas contoh dalam konsol kini berbunyi “▼ Dokumentasi › Penghitung”, bukan “▼ Dokumentasi › Pengantar › Penghitung”.

<!-- s:125517f5e0 -->
- textjs.org/doom memutar efek suara Doom, dengan panning stereo dan pelemahan berdasarkan jarak milik Doom sendiri. Suara dimulai saat klik atau penekanan tombol pertama pada halaman, dijeda bersama game, dan mengikuti Sfx Volume di menu Options → Sound Volume milik Doom. Tidak ada musik.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: petunjuk fokus (“Klik halaman untuk menggunakan keyboard”) berupa bilah kuning amber dengan teks hitam tebal pada setiap tema. Sebelumnya, petunjuk ini menggunakan warna tema yang dibalik. Setiap kali muncul, petunjuk berkedip 4 kali selama sekitar 6 detik, lalu tetap berwarna amber. Petunjuk tidak berkedip saat pengurangan gerakan aktif. Setiap siklus kedipan mencatat hingga 8 frame konsol tambahan.
- textjs.org: Doom pindah ke textjs.org/doom. textjs.org/playground/doom mengalihkan ke sana.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: panel Masalah Chrome tidak lagi melaporkan “Elemen kolom formulir harus memiliki atribut id atau name” pada setiap halaman. `<textarea>` keyboard tersembunyi diberi nama `textjs-input`, dan `<select>` ukuran konsol milik `ViewportControl` (juga dalam `sizeControl` milik `FocusPad`) memiliki `id` dan nama `textjs-console-size`. `<textarea>` keyboard juga menonaktifkan integrasi 1Password, LastPass, Bitwarden, dan Dashlane.
- textjs.org: header konsol di textjs.org/doom berbunyi “Text.js / doom”, bukan “Text.js / playground / doom”.
- textjs.org/doom: jendela sempit tidak lagi menyisakan “·” setelah “Lihat sumber”.
- textjs.org: pada jendela sempit, pemilih demo Playground memudar di tepi yang masih memiliki demo lain untuk digulir, alih-alih memotong kata pada demo terakhir.
- textjs.org/doom berjalan pada 35 tic per detik milik Doom. Di dalam level, game berjalan 3,8× lebih cepat pada layar 60 Hz (131 tic per detik) dan 5,5× pada 120 Hz (192), karena halaman mengira pembacaan waktu tambahan yang dilakukan Doom saat menggambar level sebagai busy-wait, lalu memajukan jam Doom satu tic pada setiap frame animasi dan callback timer.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` menggambar setengah blok `▀` di semua tempat, seperti `<Image>` pada 1.3.
- `@textjs/core/experimental`: `drawPixels` menerima `encoding: "rgba"` untuk sprite lossless dengan alpha lembut dan lebih dari 256 warna, serta fungsi `fallback` yang menggambar sel di tempat sprite tidak dapat ditampilkan.
- `@textjs/app`: curl, Wget, HTTPie, dan xh mendapatkan frame pertama halaman sebagai teks ANSI truecolor, bukan halaman HTML, pada `text dev`, `text start`, serta adapter `bun`, `vercel`, dan `cloudflare`. `text build` melakukan prerender frame untuk halaman statis. `text start` dan `bun` me-render halaman dinamis dan halaman yang di-render di server saat diminta, serta menjawab path yang tidak dikenal dengan halaman tidak ditemukan milik aplikasi dan `404`. Ukuran frame default adalah 80 × 24. Ubah ukuran atau nonaktifkan frame dengan `ansi` di `text.config.ts` atau `export const ansi` pada halaman. Adapter `static` menyajikan halaman HTML kepada curl. Lihat [curl dan klien terminal](https://textjs.org/docs/curl).
- `@textjs/app/ansi` mengekspor `wantsAnsi` dan `ansiResponse` untuk server yang tidak menggunakan `text start` atau adapter, dan `@textjs/react` mengekspor `frameToAnsi`.
- textjs.org: draf versi bahasa Jepang di textjs.org/ja, dimulai dengan dokumentasi Pengantar, Instalasi, dan Routing serta antarmuka situs. Paragraf yang belum diterjemahkan tampil dalam bahasa Inggris. Versi ini belum diindeks atau ditawarkan di pemilih bahasa.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` kini menggambar sprite piksel dalam konsol Chromium dan Firefox, hingga 8 × 16 piksel per sel untuk pixel art dan 4 × 8 untuk foto. Ini sengaja melanggar janji [kebijakan dukungan](https://textjs.org/docs/support-policy) bahwa frame terlihat sama antar-rilis minor. Berikan `renderMode="halfblock"` untuk mempertahankan setengah blok versi 1.3. Safari, terminal (termasuk `text run`), output ANSI dan teks biasa, serta halaman yang di-render di server (`runtime = "server"`) tetap menggambar setengah blok.
- `@textjs/app`: skrip dan pemeriksaan uptime yang mengambil halaman dengan curl, Wget, HTTPie, atau xh kini mendapatkan teks ANSI. Untuk tetap mendapatkan HTML, kirim `Accept: text/html`, atau tetapkan `ansi: false` di `text.config.ts`.
- `@textjs/app`: komponen server asinkron tidak lagi berjalan saat `text build` melakukan prerender shell halaman. Komponen menampilkan fallback `<Suspense>` seperti sebelumnya, tanpa memulai permintaan data saat build.
- `@textjs/app`: pemutar frame untuk halaman yang di-render di server berukuran 3 KB lebih kecil, 22,4 KB gzip, bukan 25,4 KB untuk `examples/dashboard`. Pemutar ini tidak lagi menyertakan metode menggambar `CellBuffer`, batas kotak, atau pemotongan teks.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: grafik dan spinner mempertahankan kisi pada Windows 10. Font konsolnya adalah Consolas, yang tidak memiliki blok seperdelapan ▁▂▃▅▆▇, kuadran, braille, ▶, atau ✓, dan glif penggantinya membuat baris melewati tepi kanan frame. `CssConsoleDriver` kini mengukur, sekali, glif mana yang digambar font konsol dengan selisih lebih dari seperlima sel, lalu menggambarnya sebagai glif terdekat yang dimiliki Consolas: `_` `▄` `▌` `█` untuk seperdelapan, setengah blok untuk kuadran dan braille, `►` `◄` `√` `×` untuk panah, centang, dan silang. Font yang dapat menampungnya, seperti Cascadia Mono pada Windows 11 dan Menlo pada macOS, menggambar glif aslinya. `measureText: false` menonaktifkan ini.
- `@textjs/core`: tidak ada lagi garis vertikal tipis 1 px di antara latar belakang yang bersebelahan di DevTools Chrome dan Edge, seperti di samping “akun” dan “jumlah” di textjs.org/coffee. Chromium menyelaraskan setiap span `%c` ke piksel perangkat secara terpisah dan bisa membuat piksel pertemuan dua span tidak menjadi bagian keduanya. `CssConsoleDriver` kini memperpanjang latar belakang span 1 px ke bawah tetangga kanan yang opak (`padding-right:1px;margin-right:-1px`). Frame Firefox dan Safari tidak berubah.
- `@textjs/core`: sprite `<Image>` di Chrome dan Edge mengikuti aturan 1 px yang sama seperti teks. Teks di kiri sprite transparan tidak lagi menggambar strip latar belakang selebar 1 px di atas tepi kiri sprite, dan sprite merapat ke teks opak di kanannya, termasuk teks invers. Sprite yang sendirian dalam barisnya kini mencapai tepi kanan frame, seperti baris teks di atas dan bawahnya.
- `@textjs/react`: `<ConsoleMirror>` menggambar foto di samping teks sebagai setengah blok, seperti konsol, bukan sebagai gambar.

<!-- s:757b866128 -->
- `@textjs/react/experimental` mengekspor `<Pixels>` untuk framebuffer langsung dan `useKeyState` untuk tombol yang ditahan; `@textjs/core/experimental` mengekspor `drawPixels`. API ini dapat berubah dalam rilis minor.
- textjs.org/playground/doom: mainkan episode shareware Doom di konsol DevTools.
- `@textjs/react`, `@textjs/app`: saat halaman tidak memiliki fokus, baris terakhir frame konsol berbunyi “Klik halaman untuk menggunakan keyboard”, sehingga pengunjung yang mengeklik aplikasi di konsol tahu mengapa tombol berhenti berfungsi. Petunjuk muncul saat aplikasi memiliki handler `useInput` atau `usePaste` atau target fokus, hanya di konsol browser, termasuk pada route yang di-render di server. Mirror inline dan pratinjau VS Code tidak menampilkannya. Nonaktifkan dengan `focusHint: false` di `text.config.ts` atau `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` mengembalikan apakah halaman memiliki fokus. Untuk menentukan sendiri kapan aplikasi membutuhkan keyboard, tetapkan `focusHint: false` dan render `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` menandai pintasan yang selalu aktif dan tidak menampilkan petunjuk dengan sendirinya.

<!-- s:c96685f5e0 -->
- `@textjs/core`: saat sprite `<Pixels>` beranimasi, `ConsoleRenderer` mengelompokkan keyframe setiap 51 ms di Chromium, mengatur interval frame menjadi 33 ms di Safari, dan membersihkan output yang ditambahkan di akhir dalam `CssConsoleDriver` pada 4 MB (`SPRITE_MAX_BYTES`). Sprite statis dan aplikasi khusus teks tetap menggunakan pengaturan interval yang ada serta batas pembersihan 300 frame.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` membaca teks yang dikonfirmasi oleh IME atau dead key dari textarea atau input tersembunyi, sekali per konfirmasi dan tidak pernah di tengah komposisi. `engine.bindTextSink(element)` menghubungkan textarea yang Anda render sendiri ke `InputEngine`. Keduanya mengembalikan fungsi yang menghapus listener.
- `@textjs/app`: `POST /__textjs/input` menerima `{ type: "text", text }` untuk teks IME dan dead key. `InputMessage` dan `parseInputMessage` di `@textjs/app/frame-protocol` menyertakannya.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware dan route handler mendapatkan path kanonis. `/docs/` dan `/docs//intro` diterima sebagai `/docs` dan `/docs/intro`, sehingga middleware yang mengalihkan untuk menambahkan garis miring akhir kini mengalihkan tanpa henti. Hapus pengalihan tersebut. Segmen dinamis tidak boleh memuat garis miring terenkode: `/files/a%2Fb` mengembalikan `400`.
- `@textjs/app`: dengan middleware, `--adapter cloudflare` mengirim setiap permintaan ke worker, termasuk aset dengan hash, dan dengan `basePath` juga mengirim permintaan di luar path dasar. Setiap permintaan yang menjalankan worker adalah satu pemanggilan Functions dan dihitung dalam kuota permintaan Workers Anda. Pada paket Workers Free, atur proyek Pages ke fail closed (Settings → Runtime → Fail open / closed), atau Pages akan menyajikan file Anda tanpa middleware setelah kuota harian habis.

<!-- s:cb257a7494 -->
- IME bahasa Mandarin, Jepang, dan Korea serta dead key berfungsi dalam konsol inline textjs.org. Konsol sebelumnya membersihkan textarea di tengah komposisi, sehingga aplikasi menerima huruf mentah atau karakter yang salah.
- `<FocusPad>` mempertahankan fokus keyboard pada aplikasi setelah klik. Sebelumnya, fokus langsung dilepas, sehingga IME bahasa Mandarin, Jepang, dan Korea tidak dapat menyusun teks.
- Dead key yang tidak menyusun karakter (Windows, serta Linux tanpa IME) mencapai aplikasi saat textarea tersembunyi memiliki fokus. Pada US-International, `'` lalu `e` menghasilkan `é` dan `'` lalu `t` menghasilkan `'t`. `InputEngine` memblokir keydown yang menyelesaikan dead key, sehingga browser tidak menyisipkan apa pun. `DeadKeyTracker` di `@textjs/core` meneruskan keydown tersebut, dan pratinjau VS Code juga menggunakannya.
- Pratinjau VS Code mengirim teks IME dan dead key yang sebelumnya dibuang, serta tidak lagi meneruskan dead key atau penekanan tombol komposisi IME ke aplikasi. Dengan server `text dev` dari `@textjs/app` 1.1.0 atau lebih lama, pratinjau mengirim teks sebagai penekanan tombol atau tempelan.
- `@textjs/core`: `InputEngine.handleTextInput` mengabaikan teks saat `shouldCapture` mengembalikan `false`, seperti yang sudah dilakukan untuk input tombol dan tempelan.
- `text dev` melakukan pre-bundle `@textjs/app/live-stub` dan `@textjs/app/live-player`. Aplikasi dengan halaman `runtime = "server"` baru menemukannya setelah pemuatan halaman pertama, sehingga Vite membundelnya lagi di tengah pemuatan, yang menyebabkan 404 untuk chunk usang dan “Pemanggilan hook tidak valid” dari dua salinan React.
- Grafik dan spinner pas dalam frame pada Windows. Consolas tidak memiliki blok ▁▂▃▅▆▇, kuadran, braille, ▶, atau ✓, sehingga Windows menggambarnya dengan font pengganti selebar hingga 1,8 sel dan baris grafik melewati tepi kanan frame. Susunan font konsol kini `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, dan Windows 11 menggambar seluruh frame dengan Cascadia Mono. `<ConsoleMirror>`, pratinjau VS Code, dan tampilan frame ekstensi DevTools juga menempatkan Cascadia Mono sebelum Consolas.
- `@textjs/opencode`: pada Node di Windows, bridge menemukan OpenCode yang diinstal dengan `npm i -g opencode-ai`. Node tidak dapat memulai shim `opencode.cmd` milik npm berdasarkan namanya, sehingga bridge bertindak seolah OpenCode belum diinstal. Kini bridge menelusuri `PATH` dengan setiap ekstensi `PATHEXT` dan menjalankan shim `.cmd` melalui `cmd.exe`. Pada Bun (`bunx`), ini sudah berfungsi.
- `text build` berfungsi pada Windows. Sebelumnya, perintah gagal untuk setiap template, dengan `Could not resolve entry module "virtual:textjs/api"` atau tanpa pesan error.
- `text build` mencetak error saat prerender shell konsol atau build route yang di-render di server gagal. Sebelumnya, perintah keluar dengan kode 1 setelah baris “Build gagal” dari Vite, tanpa alasannya.
- `text dev` pada Windows me-render ulang route yang di-render di server saat Anda mengedit file, dan memuat ulang browser saat halaman mengubah ekspor `runtime`-nya.
- `text dev` pada Windows tidak lagi menjalankan `middleware.ts` untuk file sumber yang disajikan Vite sebagai modul, seperti `/app/page.tsx`, sehingga pengalihan autentikasi tidak lagi merusak klien pengembangan.
- `text run` dan `text mcp` berfungsi saat path proyek memuat nama pendek Windows 8.3, seperti `C:\Users\RUNNER~1`. Sebelumnya, keduanya menampilkan “Error aplikasi” karena CLI dan aplikasi memuat `@textjs/app` dua kali.
- `dist/` yang dibangun pada Windows menyajikan halaman hasil prerender-nya pada Linux dan macOS. Manifes route langsung sebelumnya menyimpan path dengan garis miring terbalik.
- `text build` berfungsi saat opsi `vite` di `text.config.ts` menetapkan `build.rollupOptions.input`. Input tersebut sebelumnya mengganti entri bundel API, route yang di-render di server, dan adapter, sehingga build gagal.
- `text dev` keluar saat Anda menghentikannya dalam detik-detik pertama setelah pemuatan halaman, dan `server.close()` selesai. Menutup Vite saat mengoptimalkan dependensi yang baru ditemukan sebelumnya tidak pernah selesai (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Keamanan

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 dan versi sebelumnya memungkinkan permintaan melewati `middleware.ts` dengan menulis path terlindungi dengan cara lain, seperti `/ad%6din`, `/api//admin`, atau `/admin%2Fx`. Middleware mencocokkan path sebagaimana dikirim, sementara halaman, route handler, dan file statis dicari setelah mendekodenya (dua kali untuk route handler). Ini memengaruhi `text dev`, `text start`, serta build `--adapter bun`, `vercel`, dan `cloudflare`. Build statis tidak dapat menggunakan middleware dan tidak terpengaruh. Perbarui ke 1.2.0, lalu build dan deploy ulang: `.vercel/output` untuk Vercel, `dist/` untuk Cloudflare Pages, dan seluruh `dist/` untuk Bun (mulai ulang server). Hapus deployment lama yang masih dapat diakses melalui URL-nya sendiri, atau lindungi deployment tersebut.
- Setiap host kini menentukan satu pathname kanonis per permintaan dan menggunakannya untuk matcher, `request.nextUrl`, dan setiap pencarian. Host mendekode escape persen dan mengenkode ulang path seperti yang ditulis `new URL()`, menyelesaikan segmen `.` dan `..`, serta menghapus garis miring berulang dan di akhir. Path dengan `%2F`, `%5C`, atau pengodean persen tidak valid mendapatkan `400`. `text dev`, `text start`, dan adapter Bun menyajikan file statis hanya dengan nama persisnya, sehingga pada macOS dan Windows `/ADMIN/report.txt` tidak lagi menyajikan `public/admin/report.txt`.
- Matcher, sumber rewrite, segmen route, dan `basePath` dibandingkan dalam bentuk terenkode yang sama seperti path permintaan, sehingga `matcher: "/café/:path*"` dan `"/caf%c3%a9/:path*"` melindungi `/caf%C3%A9`, dan `"/ops%40corp/:path*"` melindungi `/ops@corp`. Middleware tanpa matcher tidak berjalan di luar `basePath`. Matcher dengan garis miring akhir, seperti `/admin/`, cocok dengan `/admin`, dan kondisi `host` mengabaikan titik di akhir nama host.
- Sesi langsung untuk route `runtime = "server"` tidak me-render halaman yang di-rewrite middleware ke path atau kueri lain, seperti rewrite dari `/restricted` ke `/login`, atau yang dijawab dengan status error seperti `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: fungsi route handler mendapatkan path-nya dalam header permintaan yang hanya ditetapkan route hasil generasi, sehingga `/api/x/%252e%252e/admin` tidak lagi mencapai `/api/admin`, dan tidak ada bentuk penulisan `/_textjs/*` yang menjalankan fungsi tersebut. Route hasil generasi mencocokkan huruf besar-kecil, sehingga `/LEGACY/x` tidak lagi mencapai rewrite untuk `/legacy/:path*` yang tidak pernah diperiksa middleware. Setiap path yang mungkin tidak kanonis, termasuk karakter mentah seperti `{`, melewati edge middleware, yang kini disertakan pada setiap build Vercel dan me-rewrite permintaan ke path kanonisnya.
- `--adapter cloudflare`: file statis dicari menggunakan path terenkode, sehingga `/x/%252e%252e/admin/report.txt` tidak lagi menyajikan `/admin/report.txt`. Dengan `basePath`, file di luarnya tidak lagi disajikan tanpa worker.
- `text dev` tidak menyajikan file `public/` di bawah `/public/…` atau `/@fs/…`, sumber khusus server seperti `middleware.ts` dan `text.config.ts` dengan variasi huruf besar-kecil, di bawah path `/@fs/` terenkode, sebagai permintaan modul tanpa ekstensi (`/text.config?import`) atau melalui rewrite konfigurasi, maupun route handler di luar `basePath`.

<!-- s:a0125c854e -->
- Text.js me-render dalam konsol Firefox dan Safari. `CssConsoleDriver` mendeteksi browser melalui pemeriksaan fitur CSS. Saat span `%c` tetap inline, driver menulis tinggi baris 14 px tanpa margin, menonaktifkan pembungkusan lunak, dan menggunakan tirai `line-height: 100vh`.
- Pengaturan ukuran responsif menyisakan ruang untuk kolom tautan sumber Firefox. Safari menempatkan Menlo pertama dalam susunan font: halamannya tidak dapat menggunakan SF Mono yang diinstal pengguna, yang mungkin digunakan Web Inspector untuk menggambar.
- Berikan `browser: "chromium" | "firefox" | "safari"` ke `createConsoleRoot`, `ConsoleRenderer`, atau `CssConsoleDriver` untuk memilih konsol.
- Shell hasil prerender membawa CSS untuk kedua jenis konsol.
- `<FocusPad>` menampilkan pintasan konsol untuk browser pengunjung: ⌘⌥K atau Ctrl+Shift+K di Firefox, dan ⌘⌥C di Safari dengan catatan untuk mengaktifkan “Tampilkan fitur untuk pengembang web”.
- `<FocusPad>` hasil prerender me-render pintasan setiap browser. Tetapkan `data-browser` (`firefox` atau `safari`) dan `data-os` (`mac`) pada `<html>` sebelum penggambaran pertama untuk hanya menampilkan pintasan pengunjung; tanpanya, pad menampilkan pintasan Chrome untuk Windows dan Linux hingga hidrasi.

<!-- s:74de7c87f7 -->
- ⌘⌥K dan Ctrl+Shift+K (pintasan konsol Firefox) diteruskan ke browser, bukan ke aplikasi.
- Pengaturan ukuran responsif mempelajari toolbar browser dengan tinggi di bawah 60 px (milik Safari dan Firefox) saat DevTools ditutup, sehingga konsol yang ditambatkan di bawah mendapatkan semua baris yang muat. `<FocusPad>` menggunakan tinggi yang dipelajari untuk mengetahui apakah DevTools ditambatkan.
- `<FocusPad>` menulis pintasan Windows dan Linux dalam status kliknya sebagai `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: bridge mencetak kode pemasangan saat dimulai, dan textjs.org/opencode memintanya saat koneksi pertama. Hingga halaman mengirim kode tersebut, bridge menjawab `428` dan tidak meneruskan apa pun ke OpenCode, bahkan untuk origin yang diizinkan. Setiap kode berlaku untuk satu kali bridge berjalan, token yang dikembalikan hanya berfungsi dari origin yang melakukan pemasangan, dan sepuluh kode salah mengunci pemasangan hingga bridge dimulai ulang.
- `@textjs/opencode`: deployment pratinjau Cloudflare Pages untuk textjs.org tidak lagi diizinkan secara default. Berikan `--allow-origin` untuk menggunakannya.
- textjs.org/opencode menolak bridge dari `@textjs/opencode` 1.0.x. Jalankan `bunx @textjs/opencode@latest proxy`.
- textjs.org mengirim Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, dan `Cross-Origin-Resource-Policy`. Halaman OpenCode hanya terhubung ke server di `127.0.0.1` atau `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: tinjau diff per file, telusuri riwayat prompt, konfigurasikan pintasan leader, serta kelola akun penyedia dan server MCP. Sandbox menyertakan panel terminal berskrip.
- OpenCode Lite: ketik `/` untuk mencari perintah atau `@` untuk melampirkan file proyek. Tab membuka direktori di menu file. Sesi terhubung menelusuri proyek server; sandbox menelusuri repositori contohnya.
- textjs.org/coffee: demo terminal.shop mengikuti ukuran konsol seperti aplikasi SSH, dengan layout kecil, sedang, dan besar serta “terminal Anda terlalu kecil” di bawah 20 × 10. Akun menambahkan metode pembayaran, profil dengan nama yang dapat diedit, dan perubahan jadwal mingguan untuk langganan. Saat keluar dari akun, keranjang serta FAQ, tentang, dan info debug akun terbuka tanpa masuk.

<!-- s:d106fb27b3 -->
Performa

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` dan `Text` meneruskan prop scene yang sudah dibersihkan ke reconciler, alih-alih menyalin objek prop saat mount dan pembaruan.
- `@textjs/core`: `SceneNode.getTextModel()` melewati penelusuran pohon inline pada daun `<Text>` berisi satu string dan menggunakan kembali buffer `Uint16Array` `runOf` berisi nol yang di-cache. `CssConsoleDriver` memindai sel BMP berurutan dengan gaya yang cocok dalam loop bagian dalam, dan `ConsoleRenderer` melewati `countYogaNodes()` pada frame yang tidak berubah.
- textjs.org: route dan tab pendamping konsol dipisah menjadi chunk JS dan CSS per route. Foto toko dienkode ulang dari master `photos/final`, dan foto produk sekunder dimuat saat kursor diarahkan atau slide berubah.

<!-- s:6909c337fb -->
- `<ViewportControl>` menggunakan `minWidth` dalam piksel, bukan `20ch`, dan mencantumkan font pengganti dengan metrik yang cocok bersama `<FocusPad>`, sehingga pemilih ukuran mempertahankan lebarnya saat `Geist Mono` dimuat.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: bridge textjs.org/opencode sebagai paket tersendiri tanpa dependensi. Jalankan `bunx @textjs/opencode proxy` (atau `npx`) untuk memulainya tanpa menginstal Vite, React, dan MCP SDK. `text proxy` tetap berfungsi dan menjalankan bridge yang sama.

<!-- s:884a8abcf6 -->
- Paket framework dan CLI kini bernama `@textjs/app`, diubah dari `@textjs/next` agar namanya tidak menyiratkan integrasi resmi Next.js. `@textjs/next` tidak lagi direkomendasikan dan digantikan oleh `@textjs/app`, serta tidak mendapatkan rilis baru. Untuk beralih, jalankan `bun remove @textjs/next && bun add @textjs/app` dan ganti `@textjs/next` dengan `@textjs/app` dalam impor, termasuk subpath seperti `@textjs/app/link`. CLI tetap bernama `text`, dan template create-text-app bergantung pada `@textjs/app`.
- Pil `[▼]` dan inspektur dalam konsol disebut Dev Overlay, dan judul inspektur berbunyi `▼ Dev Overlay · Turbolog`. Text.js DevTools hanya merupakan nama ekstensi Chrome. `<TextDevOverlay>` dan prop-nya tidak berubah.
- Route handler yang mengekspor `dynamic = "error"` gagal dengan `TX031`. Text.js memperlakukannya sebagai `"force-static"` tanpa memeriksa apakah handler membaca permintaan, padahal itulah makna nilai tersebut di Next.js. Gunakan `"force-static"`.

<!-- s:e21d3058df -->
- `text start` menjawab `Host` yang diblokir dengan `TX028`, seperti `text dev`. Setiap server menyebutkan setelan yang dibacanya: `vite.server.allowedHosts` untuk `text dev` dan `server.allowedHosts` untuk `text start`.
- textjs.org: bab Pengiriman di Belajar tidak lagi meminta Anda menambahkan rewrite `vercel.json`. Pada Vercel dan Cloudflare Pages, `text build` menulis fallback `index.html` sendiri. Contoh rewrite kini menggunakan `_redirects` milik Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` mengizinkan ekspor `dynamic` dan `revalidate` di `route.ts`, dan `valid-route-module` memeriksa nilai `dynamic` di sana.

<!-- s:9fc693fec9 -->
- textjs.org: video bab Belajar yang sedang diputar berpindah ke pemutar mini di sudut saat Anda menggulir melewatinya. Tombol Takarir di bawah setiap video mengaktifkan atau menonaktifkan takarir dan mengingat pilihannya.
- `<TextDevOverlay>` menerima prop `pill`, `shortcut`, dan `shell`, sehingga aplikasi tanpa App Router dapat memasang inspektur dengan tombol dan kontrol temanya sendiri.
- `<FocusPad>` menerima `banner`, yang ditampilkan sebagai baris pertama pesan (misalnya logo teks aplikasi) dan di atas pemberitahuan pada perangkat sentuh.

<!-- s:45920d8903 -->
- textjs.org: pemilih Playground mencantumkan Dasbor, Streaming, Snake, OpenCode, dan Kopi (terminal.shop). Setiap demo memiliki URL sendiri: OpenCode di `/opencode` dan terminal.shop di `/coffee`, dan logo teksnya mengawali pesan. Penghitung dan Formulir dipindahkan dari Playground; dokumentasi tetap menjalankan keduanya sebagai contoh langsung.
- `<FocusPad>` memiliki layout baru. Setiap status menampilkan bilah progres tiga bagian, judul, satu elemen besar, dan sebaris teks. Sebelum konsol terbuka, elemen besar tersebut adalah pintasan DevTools. Saat menunggu klik, elemennya berupa penunjuk. Setelah aktif, elemennya berupa `hints` aplikasi sebagai tampilan tombol yang menyala saat tombol diterima, dan tombol tanpa petunjuk ditampilkan kembali di bawahnya. Label langkah, lencana “Aktif” terpisah, dan baris “Lihat konsol.” dihapus. Baris muncul bertahap saat status berubah, tidak pernah pada penggambaran pertama, dan gerakan dinonaktifkan dengan `prefers-reduced-motion`. Teks sekunder memenuhi kontras WCAG AA pada kedua tampilan, dan pemilih ukuran konsol menampilkan cincin fokus saat dicapai dengan keyboard.
- textjs.org: Playground menggunakan layout `<FocusPad>` baru. Demo aktif pada pemilih memiliki permukaan yang sama dengan tampilan tombol, kolom perintah OpenCode menyamai sudut dan ukuran teks kolom URL, catatan terminal.shop menggunakan dua baris, bukan tiga, “Lihat sumber” berada pada garis dasar kontrol ukuran, dan teks redup pada pad memenuhi kontras AA.

<!-- s:01075dcc87 -->
- `text dev` menyajikan path `proxy` melalui proxy untuk setiap permintaan. `fetch()` mengirim `Accept: */*`, sehingga server pengembangan sebelumnya menjawabnya dengan HTML aplikasi terlebih dahulu, dan template opencode gagal saat pertama dijalankan dengan “Token '<' tidak terduga”.
- `text dev` tidak lagi memuat salinan kedua React saat pemindaian dependensi Vite membaca file khusus server. Pemindaian memicu pemeriksaan impor khusus server, yang mencetak stack trace, lalu “Pemanggilan hook tidak valid” di konsol, dan merusak Fast Refresh.
- `text dev` menangani URL halaman dengan string kueri, seperti `/?demo`. Vite sebelumnya memperlakukannya sebagai folder proyek dan memantau seluruh disk, sehingga pada Linux halaman tidak pernah dimuat.
- create-text-app: pil pengembangan tidak lagi menutupi petunjuk tombol pertama pada layar pertama template mana pun, nama proyek default adalah `my-app` agar sesuai dengan dokumentasi, template lolos konfigurasi yang direkomendasikan `eslint-plugin-textjs`, dan README dasbor menjelaskan build `--adapter static`.
- `<FocusPad>` dan `<ViewportControl>` menetapkan batas hanya dengan properti longhand. React sebelumnya memperingatkan “Memperbarui properti gaya saat render ulang (border)” dalam pengembangan setiap kali petunjuk tombol berkedip.
- Teks yang menjadi item terakhir dalam baris kini mempertahankan posisinya saat memendek. Setelah `<Spacer>`, teks sebelumnya tetap berada di posisi yang ditinggalkan teks terpanjang, dan elemen saudara yang menyusut agar muat pada baris meluap tetap menyusut.
- `<FocusPad>` mengganti langkah, subjudul, dan baris tombol saat `action` atau `hints` berubah, sehingga pergantian demo dalam satu pad tidak dilaporkan sebagai pergeseran layout.
- `@textjs/react/testing` memuat Yoga saat diimpor, sehingga pengujian dapat membuat stub `fetch` sebelum `render()` pertamanya.

<!-- s:64f8dbac91 -->
Rilis stabil pertama. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Perubahan yang memutus kompatibilitas:** paket framework dan CLI kini bernama `@textjs/next` (`textjs` sudah digunakan di npm). Perbarui impor dari `textjs` ke `@textjs/next`.
- Bridge OpenCode adalah `bunx @textjs/app proxy` dan berjalan dari direktori mana pun.
- Konsol menyesuaikan panel DevTools yang ditambatkan secara default (tambatan bawah, kiri, atau kanan, zoom halaman, pembungkusan toolbar). DevTools yang tidak ditambatkan menggunakan ukuran cadangan `120×36`. Pad mendapatkan kontrol ukuran.

<!-- s:dd18fee429 -->
- `useKeymap` dengan layar bantuan `?` otomatis, petunjuk tombol, dan palet perintah `Ctrl+K`.
- Komponen data: `List` (tervirtualisasi), `Table`, `Tree`.
- Grafik: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, serta `Gradient` dan `Image`.
- Kontrol: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm`, dan notifikasi toast.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hook untuk timer, animasi, pengukuran, breakpoint, penyimpanan, dan clipboard.
- Teks kanan-ke-kiri. Text.js mengimplementasikan Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) dan lolos seluruh 770.241 kasus `BidiTest.txt` serta 91.707 kasus `BidiCharacterTest.txt`. Huruf Arab dibentuk, dan `<Text dir>` mengisolasi span.
- Kode error `TX###` yang stabil. Error framework membawa kode dan tautan ke `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` untuk me-render komponen menjadi teks dalam pengujian.
- `@textjs/react/terminal` dan `text run`, yang me-render aplikasi App Router dalam terminal sungguhan.
- `text mcp`, yang menyajikan aplikasi melalui Model Context Protocol agar agen pemrograman dapat menavigasinya, menekan tombol, dan membaca frame tanpa browser.
- Ekstensi Text.js DevTools, panel di samping Konsol dengan pohon komponen, inspektur frame, dan linimasa.
- `eslint-plugin-textjs` dan ekstensi VS Code dengan pratinjau langsung.
- `apps/terminal-shop`: etalase terminal.shop dalam konsol, menggunakan API asli (sandbox pengembangan secara default, produksi dikunci ganda).
- textjs.org: Belajar, kursus 10 bab yang berjalan dalam konsol. Prerender saat build dengan hidrasi, font dengan metrik yang cocok yang dihosting sendiri, route `.html` tanpa garis miring, dan halaman dokumentasi baru dengan pratinjau langsung.

<!-- s:25c8658848 -->
- Memutus penguncian fase throttle DevTools setelah pembersihan. Setelah frame yang membersihkan konsol, renderer menunggu 110 ms sekali agar frame berikutnya masuk ke jalur langsung DevTools. Jeda tampilan p50 turun dari 63 ms menjadi 10 ms.
- Penggambaran parsial pita kerusakan: hanya pita baris yang tersentuh mutasi yang digambar ulang.
- Hash per baris yang di-cache, ID gaya bilangan bulat, dan frame idle tanpa alokasi.
- Tidak ada timer idle saat halaman tersembunyi atau tidak memiliki fokus.

<!-- s:2f477ecf74 -->
- Tidak ada span lapisan gambar kosong semu pada pergantian baris, dan tidak ada tirai ganda.
- Tirai berada pada barisnya sendiri, sehingga tautan sumber DevTools (`VM12:1`) tidak pernah membungkus baris 0.
- Spinner default berukuran tepat sesuai sel (Menlo tidak memiliki glif braille). Varian `braille` harus diaktifkan secara khusus.
- `text build` pada Node tidak lagi membundel build pengembangan React.
- textjs.org: pergeseran layout kumulatif bernilai 0 pada setiap route. Playground dan OpenCode berbagi satu layout pad.
- textjs.org: sidebar dokumentasi dan Belajar tetap tertambat di bagian bawah halaman panjang.
- textjs.org: tab file, blok kode, dan tabel prosa hanya bergulir secara horizontal, sehingga iOS Safari tidak pernah mengambil alih usapan halaman vertikal.
- textjs.org: `scrollbar-gutter: stable` hanya berlaku untuk perangkat dengan mouse. Pada iOS Safari, setelan ini membuat guliran pertama melompat.
- textjs.org: penjangkaran gulir dinonaktifkan. Pada iOS Safari, fitur ini menambatkan bagian hero di bawah header melekat.

<!-- s:986367c89f -->
Frame tanpa kilatan dan rendering di server.

<!-- s:f92fe85dce -->
- Frame ditambahkan di akhir alih-alih menjalankan `console.clear()` + `console.log()` per frame. DevTools menerapkan pembersihan secara sinkron tetapi menggambar pesan baru dengan throttle 50 ms, sehingga pembersihan membuat konsol kosong pada 70,6% penggambaran DevTools pada 15 fps dan 81,1% pada 60 fps. Span tirai selebar nol di awal menyembunyikan frame sebelumnya. Konsol hanya dibersihkan pada frame pertama, setelah `invalidate()`, saat idle setelah 100 frame menumpuk, atau pada 300 frame.
- Frame yang dikeluarkan diatur agar berjarak setidaknya 66 ms (sekitar 15 fps). Frame yang lebih cepat memulai ulang throttle DevTools dan dibuang: pada 60 fps DevTools menggambar 67 dari 295 frame yang dikeluarkan.
- Playground dan OpenCode merupakan focus pad layar penuh.

<!-- s:79bc055b31 -->
- CSS span yang hanya memakai properti longhand, yang mengurangi properti yang disalin DevTools ke setiap baris dari sekitar 33 menjadi sekitar 7. Warna heksadesimal, dan rangkaian kosong yang kuncinya hanya berdasarkan latar belakang.
- Parsing Markdown inkremental dan baris `Markdown`, `Code`, dan `Diff` yang dimemoisasi.
- Prop host satu lintasan, pembaruan prop terbatas, dan tanpa penataan ulang layout Yoga saat ukuran teks tidak mungkin berubah.
- Waktu satu frame streaming turun dari 0,79 ms menjadi 0,14 ms, satu tick spinner dari 0,90 ms menjadi 0,056 ms. Output identik hingga tingkat bit.

<!-- s:52e989e27d -->
- Rendering di server. Halaman yang mengekspor `runtime = "server"` di-render di server, termasuk komponen `async function`, dan mengalirkan delta sel tingkat baris melalui server-sent events ke pemutar frame berukuran sekitar 19 kB gzip.
- Prerender parsial. `text build` menyisipkan frame pertama setiap route statis ke dalam HTML-nya, sehingga konsol menggambar sebelum modul apa pun dimuat.
- `middleware.ts`, konfigurasi segmen route (`dynamic`, `revalidate`) dan `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: perangkat pengujian yang mengendalikan frontend DevTools asli dan mengukur penggambaran kosong, frame yang dibuang, jeda tampilan, dan penggunaan CPU DevTools.

<!-- s:7932537f20 -->
- DevTools tidak lagi mengubah teks `path:line`, `//host:port`, dan `data:` menjadi tautan.
- Bridge OpenCode menemukan daemon terkelola (port sementara, autentikasi dasar), mengirim header CSRF saat menulis, dan melaporkan kegagalan dalam satu baris.

<!-- s:6dddbd2f6c -->
- Input diskret (penekanan tombol, penempelan) di-render secara sinkron dalam task yang sama alih-alih menunggu frame animasi berikutnya.
- TUI OpenCode yang dirampingkan dan sesuai dengan versi aslinya.
- Penyempurnaan menyeluruh tampilan seluler dan responsif textjs.org.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: parser dan renderer font FIGlet dengan 17 font bawaan, untuk `<FigletText>` dan `<AsciiFont>`. Output sesuai dengan 273 referensi yang direkam dari biner `figlet` 2.2.5.
- `text proxy`: bridge CORS lokal agar textjs.org dapat berkomunikasi dengan server OpenCode Anda.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: klien OpenCode terhubung yang di-render di `console.log`, dengan demo cadangan saat tidak ada server yang berjalan.
- Template `opencode` untuk `create-text-app`.
- textjs.org: halaman utama baru, pendamping konsol langsung, Playground, halaman OpenCode, dan dokumentasi.
- Alur kerja deploy GitHub Pages dengan pembuatan route statis.

<!-- s:a1b0bb2bf5 -->
Tonggak pertama.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` pada typed array datar, layout Yoga WASM, pengukuran teks `Intl.Segmenter`, dan driver pengodean run-length `%c`. Satu `console.log` per frame yang berubah dan tidak ada saat idle.
- `@textjs/react`: reconciler React 19, komponen PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`, dan lainnya), utilitas `className` bergaya Tailwind pada tingkat sel, tema, dan `FocusPad` DOM.
- `textjs`: App Router berbasis sistem berkas (`layout`, `page`, `loading`, `error`, `not-found`, segmen dinamis, route handler), `text dev`, `text build`, `text start`, dan inspektur `[▼]` di dalam konsol.
- `create-text-app` dengan template `starter` dan `dashboard`.
