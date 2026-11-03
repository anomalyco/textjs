<!-- s:e9f791b208 -->
`text run` me-render aplikasi App Router di terminal. Layout, komponen, keymap, dan route handler digunakan bersama dengan browser. Keluarannya berupa ANSI truecolor, bukan span `%c`.

<!-- s:7d8aa376e3 -->
Tekan `Ctrl+C` untuk keluar. `text run` memerlukan Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` mengimpor setiap file di `app/`, memasang App Router dengan riwayat dalam memori, dan menggambarnya dalam layar penuh. `<Link>`, `useRouter()`, `notFound()` dan `redirect()` berfungsi tanpa perubahan.

<!-- s:75b65c161d -->
Panggilan `fetch("/api/...")` dengan origin yang sama menjalankan handler `route.ts` Anda dalam proses yang sama, persis seperti saat `text dev` melayaninya. URL lain mengakses jaringan.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Untuk satu komponen, atau CLI Anda sendiri:

<!-- s:e62e62bfaa -->
`useApp().exit()` melepas komponen dan memulihkan terminal.

<!-- s:082b75dda7 -->
| Opsi | Deskripsi |
| :-- | :-- |
| `stdin` / `stdout` | Bawaan `process.stdin` / `process.stdout` |
| `cols` / `rows` | Ukuran tetap (bawaan: mengikuti terminal) |
| `altScreen` | Pulihkan riwayat gulir saat keluar (bawaan `true`) |
| `mouse` | Pengguliran dengan roda mouse (bawaan `true`) |
| `exitOnCtrlC` | Bawaan `true` |
| `fps` | Batas frame (bawaan `60`) |
| `patchConsole` | Tahan `console.*` hingga keluar (bawaan `true`) |
| `theme` / `transparent` | Seperti pada `createConsoleRoot` |

<!-- s:e34e364b9c -->
Keluaran

<!-- s:2ac174afda -->
Setiap frame dibandingkan baris demi baris untuk mencari perbedaan. Hanya baris yang berubah yang ditulis, diapit penanda keluaran tersinkronisasi agar terminal yang mendukungnya tidak pernah menampilkan frame yang baru tergambar sebagian. Aplikasi yang menganggur tidak menulis apa pun.

<!-- s:99a3c4d459 -->
Masukan

<!-- s:4a9817d820 -->
Stdin dalam mode raw diurai menjadi event yang sama dengan yang dihasilkan browser: tombol panah dan fungsi dengan pengubah, kombinasi `Alt`, bracketed paste, roda mouse SGR dan protokol keyboard kitty. `TerminalInputParser` dan `parseTerminalInput` diekspor jika Anda memerlukannya di tempat lain.

<!-- s:6b688e229b -->
Perbedaan

<!-- s:56ed51fed3 -->
| Fitur | DevTools | Terminal |
| :-- | :-- | :-- |
| Pengaturan laju frame | ~15 fps | Hingga `fps` |
| Ukuran kisi | Konsol tertambat | Jendela terminal |
| `<Image src>` | Dimuat melalui canvas | Gunakan `pixels` |
| `console.log` | Frame Anda | Ditahan hingga keluar |
