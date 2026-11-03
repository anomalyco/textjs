<!-- s:3bfcfe41ce -->
Deklarasikan pintasan sekali dengan `useKeymap`. Text.js mengarahkannya, mencantumkannya dalam overlay `?`, menampilkannya di footer, dan membuatnya bisa dicari dalam palet perintah.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Sintaks | Arti |
| :-- | :-- |
| `ctrl+k` | Pengubah: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` atau `Ctrl`, mana pun yang ditekan |
| `j, down` | Alternatif |
| `g g` | Urutan (1 detik antarpenekanan tombol) |
| `G` | Huruf kapital menyiratkan `Shift` |
| `?` | Tombol karakter dicocokkan berdasarkan karakternya |

<!-- s:ef55b4b9de -->
Nilainya berupa handler, atau binding dengan `label`, `group`, `hint`, `disabled`, dan `noRepeat`. Binding tanpa label tetap berfungsi, tetapi tidak muncul dalam overlay bantuan.

<!-- s:01f344cdbe -->
`useKeymapBindings()` mengembalikan binding berlabel yang sedang aktif, untuk footer dan menu buatan Anda.

<!-- s:dd8af5eb69 -->
Keymap berjalan melalui `useInput`, jadi aturan biasa berlaku: input yang mendapat fokus diutamakan, tombol yang cocok menghentikan propagasi, dan `<Modal>` yang terbuka menonaktifkan binding di luarnya. Teruskan `{ priority, global, isActive }` untuk mengubahnya.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Tekan `?` untuk melihat semua binding berlabel, dalam kelompok. Daftar ini menampilkan binding yang aktif di tempat overlay dibuka.

<!-- s:3cebb95bfc -->
`<KeyHints>` dan `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` menampilkan binding bertanda `hint: true`, atau `items` yang ditentukan secara eksplisit. `<StatusBar>` adalah footer satu baris dengan slot `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` me-render satu tombol. `formatKeys("ctrl+shift+p")` menghasilkan `⌃⇧P` di macOS dan `ctrl+shift+P` di platform lain.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (atau `Ctrl+P`) membuka peluncur dengan pencarian fuzzy untuk perintah Anda dan semua binding berlabel, dengan huruf yang cocok disorot.

<!-- s:e88bab4eab -->
| Prop | Deskripsi |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Pintasan untuk membuka (bawaan `ctrl+k, ctrl+p`; `null` untuk menonaktifkan) |
| `includeKeymap` | Tampilkan binding keymap (bawaan `true`) |
| `open` / `onOpenChange` | Terkontrol |

<!-- s:ddd093fe85 -->
Palet menutup sebelum menjalankan perintah, sehingga perintah bisa membuka modalnya sendiri. `fuzzyMatch` dan `fuzzyFilter` diekspor untuk daftar buatan Anda.
