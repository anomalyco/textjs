<!-- s:674f346b70 -->
Hook menghubungkan komponen ke input, fokus, dan viewport.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Kolom | Deskripsi |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Teks yang dihasilkan tombol |
| `ctrl` `meta` `shift` `alt` | Pengubah |
| `stopPropagation()` | Hentikan handler dengan prioritas lebih rendah |

<!-- s:0764796164 -->
Pintasan browser seperti `⌘⌥J` dan `⌘R` selalu diteruskan.

<!-- s:550c6a7dd5 -->
`usePaste` dan `useWheel` menerima opsi yang sama. `ambient` tidak berpengaruh pada `useWheel`.

<!-- s:9248f9b147 -->
| Opsi | Deskripsi |
| :-- | :-- |
| `isActive` | `false` menonaktifkan handler tanpa melepas komponen (default `true`) |
| `priority` | Prioritas lebih tinggi berjalan lebih dulu (default `0`). Komponen yang memiliki fokus menggunakan `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Tetap menerima input saat `<Modal>` di luar komponen ini terbuka (default `false`) |
| `ambient` | Jangan hitung handler ini untuk [petunjuk fokus](#usepagefocus) (default `false`) |

<!-- s:e4e842287a -->
Pintasan Dev Overlay (`F2` atau `` Ctrl+` ``) bersifat ambient, sehingga halaman tanpa input keyboard lain tidak menampilkan petunjuk.

<!-- s:617ae1bfe8 -->
`usePaste` dan `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (eksperimental)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` mengekspor `useKeyState` untuk melacak tombol fisik yang ditahan berdasarkan `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Memeriksa `keys.isDown(code)` secara berkala atau membaca `keys.pressed` tidak memicu rendering ulang React. Berikan callback untuk merespons penekanan dan pelepasan tombol saat terjadi.

<!-- s:d9e1465ae0 -->
Tombol yang ditahan dilepas secara otomatis saat halaman kehilangan fokus. Lihat [Perubahan yang memutus kompatibilitas](/docs/support-policy#breaking-changes) untuk mengetahui cara pemberian versi ekspor eksperimental.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` mengembalikan apakah halaman memiliki fokus. Penekanan tombol hanya diterima aplikasi saat halaman memiliki fokus. Nilainya sama dengan `useViewport().focused`, tetapi rendering ulang hanya terjadi saat fokus berubah.

<!-- s:e1075d4220 -->
Saat halaman tidak memiliki fokus dan aplikasi memiliki handler `useInput` atau `usePaste`, hook `useKeyState`, atau target fokus yang dapat dijangkau dengan Tab, baris terakhir frame konsol menjadi bilah kuning ambar bertuliskan “Klik halaman untuk menggunakan keyboard”. Handler bertanda [`ambient`](#useinput) tidak dihitung. Petunjuk ini tidak muncul di terminal, dalam pengujian, atau pada cerminan inline. Setiap kali muncul, petunjuk berkedip selama sekitar 6 detik, kecuali setelan pengurangan gerakan sistem aktif. Untuk menentukan sendiri kapan petunjuk muncul, tetapkan `focusHint: false` di `text.config.ts` atau `createConsoleRoot` dan render `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
REPL `window.text`

<!-- s:420cc7f125 -->
Setiap aplikasi menambahkan fungsi pembantu ke `window.text`. Ketik fungsi tersebut di prompt DevTools.
