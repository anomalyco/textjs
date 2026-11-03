<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) adalah agen pemrograman sumber terbuka. **OpenCode Lite** adalah klien konsol untuk agen tersebut, dibuat dengan Text.js.

<!-- s:a0fa47c98f -->
Coba

<!-- s:8b5f5ed2de -->
- Di situs ini: kunjungi [OpenCode](/opencode) dan buka DevTools.
- Secara lokal: `bunx create-text-app my-app --template opencode`.

<!-- s:db57075dd8 -->
Situs ini menjalankan sandbox dengan agen berskrip. Ketik prompt apa saja.

<!-- s:867840c638 -->
Anatomi

<!-- s:7b522f9378 -->
| Area | Komponen |
| :-- | :-- |
| Transkrip | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Kartu alat | `<Code>` dan `<Diff>` |
| Prompt | `<Textarea>` |
| Palet | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
Tombol

<!-- s:9bda94e125 -->
| Tombol | Tindakan |
| :-- | :-- |
| `Enter` | Kirim |
| `Shift+Tab` | Ganti agen (build / plan) |
| `Ctrl+P` | Perintah |
| `Ctrl+X` lalu `L` | Sesi |
| `Ctrl+X` lalu `N` | Sesi baru |
| `Esc` dua kali | Hentikan sesi yang berjalan |

<!-- s:b2700ea8eb -->
Hubungkan server lokal

<!-- s:a98495bd7f -->
Biarkan bridge tetap berjalan. Di [halaman OpenCode](/opencode), masukkan `http://127.0.0.1:4096`, tekan **Hubungkan**, dan izinkan akses jaringan lokal jika Chrome memintanya. Lalu masukkan kode pemasangan yang dicetak bridge. Halaman tetap terpasang hingga bridge dimulai ulang atau Anda menekan **Putuskan koneksi**. Gunakan URL bridge, bukan port layanan: bridge menyediakan kredensial layanan dan header CORS. Hentikan dengan Ctrl+C setelah selesai.

<!-- s:7c6a89edc5 -->
Untuk server foreground yang sudah berjalan di port 4.096, jalankan `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` dan hubungkan halaman ke port **4.097**. Untuk server foreground yang dilindungi kata sandi, ekspor `OPENCODE_PASSWORD` server tersebut di shell bridge; jangan masukkan kata sandi ke URL browser.

<!-- s:951b1ef5cb -->
Bridge ini adalah paket `@textjs/opencode`. Paket ini tidak memiliki dependensi dan juga berjalan dengan `npx` di Node 22 atau yang lebih baru. Di dalam proyek Text.js, `text proxy` menjalankan bridge yang sama.
