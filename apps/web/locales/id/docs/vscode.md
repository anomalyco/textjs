<!-- s:8f3fd7167d -->
Ekstensi Text.js untuk VS Code menampilkan frame konsol di samping kode. Ekstensi ini mencerminkan aplikasi yang berjalan dengan `text dev`, atau me-render file yang terbuka saat tidak ada aplikasi yang berjalan. Ekstensi ini juga menambahkan scaffolding App Router, snippet, dan tautan untuk kode kesalahan `TX###`.

<!-- s:98304b8243 -->
Instalasi

<!-- s:80e247d2f7 -->
Instal [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) dari Visual Studio Marketplace. Di VS Code, buka tampilan Extensions (`⌘⇧X`) dan cari `textjs.vscode-textjs`, atau jalankan:

<!-- s:fd2344ec36 -->
Ekstensi ini aktif di folder mana pun yang berisi aplikasi Text.js: `text.config.ts`, atau paket yang bergantung pada `@textjs/app` dan memiliki direktori `app/`. Monorepo dengan beberapa aplikasi juga didukung.

<!-- s:74f1530aa8 -->
Pratinjau langsung

<!-- s:d9807ea49d -->
Buka `page.tsx`, `layout.tsx`, atau komponen lalu jalankan **Text.js: Open Preview** (`⌘K V`), atau klik tombol pratinjau di bilah judul editor. Panel menggambar frame dengan tampilan antarmuka DevTools dan sel Menlo yang sama seperti konsol browser Anda.

<!-- s:2f69f76b80 -->
Pratinjau mendapatkan frame dari salah satu dari dua sumber. Lencana di bilah alat menunjukkan sumber yang aktif:

<!-- s:f81cef21bf -->
| Sumber | Kapan | Yang Anda lihat |
| :-- | :-- | :-- |
| **Live** | `text dev` berjalan dan sebuah tab browser membuka aplikasi | Aplikasi sebenarnya, dengan state, data, dan ukuran kisi |
| **Headless** | Tidak ada server pengembangan, atau tidak ada tab yang terbuka | File yang terbuka, di-render oleh ekstensi sesuai ukuran panel |

<!-- s:f40888c2bb -->
`auto` (bawaan) menggunakan Live jika memungkinkan dan Headless jika tidak. Tetapkan salah satunya melalui lencana atau dengan `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Keyboard

<!-- s:9ce66a1aa7 -->
Klik konsol untuk mengirim input tombol ke aplikasi: tombol panah, `Tab`, pintasan, pengetikan, dan penempelan semuanya berfungsi seperti di browser. Klik di luar konsol untuk berhenti. Pintasan editor seperti `⌘P` dan `⌘⇧P` tetap diteruskan ke VS Code. Menggulir di atas konsol mengirim peristiwa roda gulir.

<!-- s:0910b5fd48 -->
Di kolom alamat, Anda bisa mengetik route, seperti `/deployments/dpl_a1`, untuk bernavigasi pada salah satu sumber.

<!-- s:4507d73bb4 -->
Mode Live

<!-- s:787b87d328 -->
Saat pratinjau terbuka, server pengembangan meminta tab yang terhubung untuk mengalirkan frame. Tab hanya mengirim baris yang berubah, lalu berhenti mengirim saat pratinjau ditutup, sehingga aplikasi tanpa pratinjau terbuka tidak menanggung beban tambahan. Penyimpanan file melalui Fast Refresh, dan pratinjau diperbarui bersama tab.

<!-- s:86ae14b746 -->
Aktifkan **Follow** (`textjs.preview.followEditor`) untuk memindahkan tab browser ke route `page.tsx` yang sedang Anda edit.

<!-- s:68839106d6 -->
Tab latar belakang tidak mendapatkan frame animasi, sehingga biasanya mempertahankan frame hingga terlihat lagi. Saat pratinjau memantau, tab latar belakang menggambar frame begitu input masuk, sehingga pengetikan di pratinjau tetap memicu pembaruan. Animasi di tab latar belakang diperbarui sekitar sekali per detik. Tempatkan aplikasi di jendelanya sendiri agar animasi tetap lancar.

<!-- s:1ae6e7077f -->
Mode Headless

<!-- s:1cddf967be -->
Ekstensi menjalankan runner kecil di proyek Anda. Runner ini memuat file route melalui Vite dan `@textjs/app` milik proyek, sehingga alias, TypeScript, dan JSX berperilaku sama seperti dalam `text dev`. Runner memasang App Router pada route file yang terbuka, beserta layout-nya, menggunakan riwayat dalam memori:

<!-- s:23d9451fef -->
| File | Pratinjau |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (segmen dinamis menggunakan namanya) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | Ekspor default, atau ekspor PascalCase pertama, tanpa prop |

<!-- s:f111cbfc61 -->
Pemanggilan `fetch("/api/...")` dengan origin yang sama menjalankan handler `route.ts` Anda dalam proses yang sama, seperti pada [`text run`](/docs/terminal). Kisi mengikuti ukuran panel, dan menyimpan file apa pun dalam aplikasi akan merendernya kembali. Kesalahan muncul di atas frame, dengan tautan ke halaman `TX###` terkait.

<!-- s:36cd3f2bb4 -->
Perintah

<!-- s:d542a683ff -->
| Perintah | Deskripsi |
| :-- | :-- |
| Text.js: Start Dev Server | Menjalankan skrip `dev` Anda (atau `text dev`) di terminal |
| Text.js: Stop Dev Server | Menghentikan server pengembangan yang dijalankan dari VS Code |
| Text.js: Open Preview | Membuka pratinjau langsung untuk file aktif |
| Text.js: Open in Browser Console | Membuka route saat ini di server pengembangan. Lalu [buka konsol browser](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` dengan metadata dan `params` bertipe |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` dengan `GET` dan `POST` |
| Text.js: New Loading UI / Error boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Perintah scaffolding juga tersedia di menu konteks Explorer untuk folder. Perintah ini menerima segmen [App Router](/docs/routing) seperti `settings`, `blog/[slug]`, `docs/[...path]`, dan `(marketing)/about`, serta menolak menempatkan `page` dan `route.ts` dalam segmen yang sama. Proyek JavaScript (tanpa `tsconfig.json`) mendapatkan file `.jsx` dan `.js`.

<!-- s:9ba0c1b237 -->
Snippet

<!-- s:193db2a68e -->
| Prefiks | Sisipan |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | File route, dengan nama sesuai foldernya |
| `txc` | Komponen konsol dengan nama sesuai file |
| `txroute`, `txroutep` | Route handler, dengan atau tanpa params |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Komponen |
| `input`, `select`, `tabs` | Komponen interaktif |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook |
| `metadata`, `txconfig` | Metadata route dan `text.config.ts` |

<!-- s:a6e574a6aa -->
Kode kesalahan

<!-- s:5e9e2a4649 -->
Arahkan kursor ke kode `TX###` di mana pun: dalam kode sumber, log, panel Output, atau stack trace yang ditempelkan. Tampilan saat kursor diarahkan menunjukkan judul, pesan, dan paketnya, dengan tautan ke halamannya di textjs.org. Setiap kode juga merupakan tautan (klik sambil menekan `⌘`).

<!-- s:b67d013d7e -->
Bilah status

<!-- s:be63ef7ae2 -->
Item `▼` menunjukkan status server pengembangan dan ukuran kisi konsol, misalnya `▼ :3000  120×36`. Tab melaporkan ukurannya ke server pengembangan setiap kali ukurannya berubah, bahkan tanpa pratinjau terbuka. Klik item untuk mengakses perintah utama.

<!-- s:5b827aed4d -->
Setelan

<!-- s:457ec968c0 -->
| Setelan | Bawaan | Deskripsi |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live`, atau `headless` |
| `textjs.preview.followEditor` | `false` | Mode Live: mengikuti route yang diedit |
| `textjs.preview.fontSize` | `12` | Ukuran font sel (DevTools menggunakan 12) |
| `textjs.preview.runtime` | | Biner Node.js untuk pratinjau headless (bawaan: yang disertakan dengan VS Code) |
| `textjs.devServer.url` | | URL server pengembangan (bawaan: mencari pada port 3000–3010). Hanya alamat loopback `http://` yang digunakan |
| `textjs.devServer.command` | | Perintah untuk Start Dev Server |

<!-- s:ea5e740ef1 -->
Kepercayaan ruang kerja

<!-- s:ddcdd0b053 -->
Pratinjau dan server pengembangan menjalankan kode proyek Anda (konfigurasi Vite, `text.config.*`, dan komponennya). Dalam Restricted Mode, ekstensi hanya menyediakan snippet, scaffolding, dan tautan kesalahan, serta mengabaikan `textjs.preview.runtime`, `textjs.devServer.command`, dan `textjs.devServer.url` dari setelan ruang kerja. Percayai ruang kerja untuk mengaktifkan pratinjau. File di luar folder ruang kerja Anda tidak pernah ditampilkan dalam pratinjau.

<!-- s:5ae438610c -->
Cara kerja

<!-- s:857bac4692 -->
`text dev` menyediakan tiga endpoint untuk editor. Endpoint ini hanya merespons koneksi loopback yang ditujukan ke host loopback (`localhost`, `127.0.0.1`, `[::1]`), dan hanya permintaan tanpa `Origin` atau dengan origin milik server pengembangan itu sendiri. Permintaan lintas situs dan `no-cors` dari browser ditolak:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Direktori akar proyek, tab yang terhubung, ukuran kisi, dan route saat ini |
| `GET /__textjs/frames` | Peristiwa yang dikirim server: satu peristiwa `frame` per perubahan, dikodekan sebagai delta baris |
| `POST /__textjs/input` | Tombol, tempelan, teks IME atau dead-key (`text`), roda gulir, atau navigasi untuk tab. Memerlukan JSON dan header `x-textjs-mirror: 1`, sehingga situs lain tidak bisa mengirim penekanan tombol |

<!-- s:6693972af6 -->
Tab mengirim frame ke server pengembangan melalui soket HMR Vite, yang memerlukan token per server. Format transmisi diekspor dari `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) jika Anda ingin membuat penampil sendiri. Semua ini tidak disertakan dalam keluaran `text build`.
