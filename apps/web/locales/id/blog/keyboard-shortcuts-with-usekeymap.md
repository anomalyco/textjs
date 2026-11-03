<!-- s:cf6b8fc694 -->
Hingga kini, aplikasi Text.js menangani tombol di `useInput` dan mencantumkannya lagi secara manual di footer `<KeyHint>`. `useKeymap` menggantikan keduanya dengan satu deklarasi.

<!-- s:8ec88859eb -->
Menekan `j` menjalankan `next`. Di macOS, `<KeyHints>` menampilkan `j/↓ Next` dan `⌃S Save` di footer, karena binding tersebut menetapkan `hint`. `?` membuka layar bantuan berisi keempat binding, dikelompokkan dalam Navigation, dan `Ctrl+K` membuka palet yang dapat menelusurinya.

<!-- s:c7c1123a0d -->
Sintaks tombol

<!-- s:e9843726ad -->
| Sintaks | Arti |
| :-- | :-- |
| `ctrl+k` | Modifier: `ctrl`, `alt`, `shift`, `meta` dan `mod` |
| `mod+k` | `⌘` atau `Ctrl`, sesuai tombol yang ditahan |
| `j, down` | Alternatif |
| `g g` | Urutan, dengan jeda hingga 1 detik antartombol |
| `G` | Huruf kapital menyiratkan `Shift` |
| `?` | Tombol yang menghasilkan karakter dicocokkan dengan karakternya |

<!-- s:5d4b81956d -->
Binding berupa handler, atau objek dengan `label`, `group`, `hint`, `command`, `disabled` dan `noRepeat`. `command: false` mengecualikan binding berlabel dari palet. Binding tanpa label tetap berfungsi, tetapi tidak muncul di layar bantuan dan palet.

<!-- s:7beff5bd29 -->
Perutean

<!-- s:5f000bf949 -->
Setiap keymap mendaftarkan satu handler `useInput`, sehingga aturan input yang ada tetap berlaku. `<Input>` yang mendapat fokus menangani tombol terlebih dahulu, karena editor mendengarkan pada prioritas 10 dan keymap pada 0. Tombol yang cocok menghentikan propagasi. `<Modal>` yang terbuka menonaktifkan binding di luarnya, kecuali keymap meneruskan `global: true`.

<!-- s:a6076c8127 -->
Urutan dicocokkan di dalam handler tersebut. Tombol yang memulai urutan ditahan sebagai tertunda dan menghentikan propagasi, dan urutan direset jika tombol berikutnya tiba setelah lebih dari `sequenceTimeout` (nilai default 1.000 ms):

<!-- s:aa0a9c8615 -->
Satu registri per root

<!-- s:8a689d7ce6 -->
Binding berlabel dipublikasikan ke registri milik root konsol. `<KeyHelp>`, `<KeyHints>` dan `<CommandPalette>` membacanya, dan komponen Anda sendiri juga bisa melalui `useKeymapBindings()`. Selama modal terbuka, registri hanya mengembalikan binding di dalamnya, sehingga layar bantuan mencantumkan tombol yang berfungsi saat itu.

<!-- s:ab5f364d60 -->
Keymap biasanya ditulis inline, yang membuat objek baru pada setiap render. Agar biayanya tetap rendah, keymap hanya memublikasikan ulang labelnya ketika bentuk yang terlihat berubah:

<!-- s:fa6b5ba7b8 -->
Handler dibaca dari ref saat tombol tiba, sehingga closure baru pada setiap render tidak pernah kedaluwarsa.

<!-- s:1b173acf33 -->
Layar bantuan dan palet

<!-- s:15201cd425 -->
`<KeyHelp>` terbuka saat `?` ditekan dan mencantumkan setiap binding berlabel yang aktif berdasarkan kelompok. `keys` dan `title` mengubah pemicu dan judul.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` terbuka saat `Ctrl+K` atau `Ctrl+P` ditekan. Komponen ini melakukan pencocokan samar pada `commands` Anda dan setiap binding berlabel, serta menyoroti huruf yang cocok. Palet menutup sebelum menjalankan perintah, sehingga perintah dapat membuka modalnya sendiri.

<!-- s:bea7ebdffb -->
`formatKeys` me-render binding untuk ditampilkan. `formatKeys("ctrl+shift+p")` mengembalikan `⌃⇧P` di macOS dan `ctrl+shift+P` di platform lain, dan `<Kbd>` me-render satu tombol dengan format yang sama.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` dan `<CommandPalette>` disertakan dalam Text.js 1.0. Referensinya ada di [Keyboard](/docs/keyboard).
