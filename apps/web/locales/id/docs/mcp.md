<!-- s:c351b288ae -->
`text mcp` menjalankan direktori `app/` Anda tanpa antarmuka, dalam proses yang sama, dan menyajikannya melalui [Model Context Protocol](https://modelcontextprotocol.io) agar agen pemrograman dapat menggunakannya tanpa DevTools. Agen menavigasi, menekan tombol, membaca frame sebagai teks biasa, dan memanggil route handler.

<!-- s:c66b3eaae7 -->
`text mcp` memerlukan Bun. Jika dimulai dengan Node, perintah ini menjalankan ulang dirinya dengan Bun saat `bun` tersedia di `PATH` Anda, dan gagal dengan `TX019` jika tidak. Klien MCP menjalankannya untuk Anda, jadi Anda jarang menjalankannya secara manual.

<!-- s:0ecddf15e1 -->
Penyiapan

<!-- s:91bda9ef42 -->
Setiap klien menjalankan `text mcp` dari direktori proyek Anda. Gunakan `bunx --bun` agar file route berjalan sebagai TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Atau commit untuk tim:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Untuk proyek dalam subdirektori, tambahkan path di akhir: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Alat

<!-- s:93ae76f73d -->
| Alat | Deskripsi |
| :-- | :-- |
| `list_routes` | Halaman dan route handler dalam `app/`, serta lokasi saat ini |
| `navigate` | Tambahkan atau ganti path, atau buka `back` / `forward` |
| `read_frame` | Frame sebagai teks, dengan route, ukuran, fokus, dan kursor. `styles: true` menambahkan warna dan atribut per span |
| `press` | Kombinasi tombol: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Ketik teks dengan satu tombol per karakter (hingga 2.000; gunakan `paste` untuk lebih banyak). `submit: true` menekan Enter setelahnya |
| `paste` | Satu peristiwa tempel, seperti `⌘V` |
| `scroll` | Gulir dengan roda mouse sebanyak `rows` (dan `cols`). `<ScrollBox>` bergulir dengan roda mouse tanpa fokus keyboard |
| `resize` | Atur ukuran kisi dalam kolom dan baris |
| `inspect_tree` | Pohon komponen dengan batas layar, serta setiap id yang dapat menerima fokus |
| `find` | Batas setiap kecocokan, dan komponen di bawahnya |
| `wait_for` | Tunggu teks muncul atau hilang, atau aplikasi menjadi idle |
| `logs` | Output `console.*` dan error React yang ditangkap |
| `fetch` | Panggil handler `route.ts` dalam proses yang sama. Isi dibaca hingga `maxBytes`; stream peristiwa selama `streamMs`, lalu dibatalkan |
| `reload` | Impor ulang aplikasi setelah Anda mengedit file |

<!-- s:526235e5c5 -->
Alat input mengembalikan frame baru, sehingga agen tidak memerlukan `read_frame` terpisah setelah setiap tombol. Frame saat ini dan daftar route juga tersedia sebagai sumber daya `text://frame` dan `text://routes`.

<!-- s:c30236f97d -->
Contoh pertukaran:

<!-- s:45e18bfa25 -->
Frame dan idle

<!-- s:f2e8fe0f06 -->
Sebelum alat membaca frame, alat menunggu aplikasi menjadi idle: tidak ada frame terjadwal, tidak ada `fetch` yang sedang berjalan, dan tidak ada commit atau frame selama 50 ms. Jadi agen melihat hasil inputnya, bukan frame di tengah pembaruan.

<!-- s:fbad6f5c1a -->
`<Spinner>` atau grafik yang diperbarui sekali per detik tetap dianggap idle di antara pembaruan, sehingga halaman dengan animasi tetap terbaca. Aplikasi yang me-render lebih sering daripada setiap 50 ms tidak pernah menjadi idle. Pembacaan berhenti menunggu setelah 1,5 detik (`settleMs` mengubah durasi ini), mengeluarkan frame terbaru dan menandainya sebagai `busy`. `wait_for` tanpa teks menunggu idle, dengan `quietMs` tersendiri, dan mengembalikan error jika kondisi idle tidak pernah tercapai.

<!-- s:c5250c2f7a -->
Koordinat berupa sel berbasis nol: `x` adalah kolom, `y` adalah baris. Karakter lebar seperti CJK dan emoji menempati dua kolom.

<!-- s:7ff82431c5 -->
Error dan log

<!-- s:6e07cf8702 -->
stdout membawa protokol. Output `console.*` aplikasi Anda, panggilan `process.stdout.write` yang tidak semestinya, dan error React dialihkan ke `logs`, dengan nomor agar agen dapat meminta hanya entri baru menggunakan `since`. Jika ada error yang dicatat sejak pembacaan terakhir, header frame berikutnya menyatakannya.

<!-- s:9102068439 -->
Kegagalan dikembalikan sebagai error alat, tidak pernah sebagai crash. Alat yang melewati batas waktu dibatalkan sebelum panggilan berikutnya berjalan, sehingga panggilan yang lambat tidak pernah mengetik ke frame panggilan berikutnya. Error dengan kode Text.js tetap mempertahankan kodenya, misalnya `TX007` untuk tombol yang tidak dikenal. Jika aplikasi gagal dimuat, setiap alat menjelaskan alasannya. Perbaiki file lalu panggil `reload`.

<!-- s:d3ad6f781e -->
Opsi

<!-- s:c9c30c0da4 -->
| Opsi | Deskripsi |
| :-- | :-- |
| `--path <pathname>` | Route pertama (default `/`) |
| `--cols` / `--rows` | Ukuran kisi (default: `viewport` dalam `text.config.ts`, atau 100×32 jika tidak ada) |
| `--theme <name>` | Preset tema |
| `--no-config` | Abaikan `text.config.ts` |
| `--verbose` | Tulis juga log yang ditangkap ke stderr |

<!-- s:5ae438610c -->
Cara kerja

<!-- s:7c71219a13 -->
`text mcp` menjalankan aplikasi Anda dengan cara yang sama seperti [`text run`](/docs/terminal): setiap modul route diimpor di awal, App Router menggunakan riwayat dalam memori, dan panggilan `fetch("/api/…")` dengan origin yang sama menjalankan handler Anda dalam proses yang sama. Frame dikirim ke kisi sel di luar layar, bukan ke terminal. Halaman yang di-render di server (`export const runtime = "server"`) dan komponen `async function` di dalamnya me-render dalam proses yang sama, seperti pada `text dev`, dan frame dibaca setelah semuanya selesai.

<!-- s:c965dcc0e4 -->
`reload` melepas aplikasi, menghapus setiap modul proyek dari cache modul Bun (termasuk file di luar `app/`), memindai `app/` lagi dan memasang ulang aplikasi di lokasi saat ini.

<!-- s:19d6f0da69 -->
Untuk menyematkan server dalam proses Anda sendiri, atau menggunakan transport lain:

<!-- s:68c8d3995f -->
Batasan

<!-- s:910af21777 -->
- Aplikasi berjalan di Bun, bukan browser. `window` dan `document` tidak terdefinisi, seperti pada `text run`.
- Setiap server menjalankan satu aplikasi dengan satu kisi. Setiap klien MCP memulai servernya sendiri.
- `text mcp` menjalankan salinan aplikasi tersendiri tanpa antarmuka. Perintah ini tidak dapat terhubung ke tab browser yang terbuka melalui `text dev`.
