<!-- s:7929eb6998 -->
Text.js menyertakan kontrol formulir, dialog, dan toast. Setiap kontrol masuk dalam urutan `Tab` dan merespons `Space` atau `Enter`.

<!-- s:0c4878f82e -->
Kontrol

<!-- s:920d5e74e5 -->
| Komponen | Tombol | Nilai |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (atau `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Semuanya menerima `autoFocus`, `focused`, `id`, dan `disabled`. Mode terkontrol maupun tidak terkontrol (`defaultChecked`, `defaultValue`) sama-sama berfungsi.

<!-- s:0a2857b66b -->
Tombol

<!-- s:1981291f42 -->
`variant` bernilai `primary`, `secondary`, `ghost`, atau `danger`. Fokus mengisi tombol dengan warna aksen tanpa mengubah ukurannya.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
`<Modal>` dengan deskripsi dan baris tindakan.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Ya atau tidak. `y` dan `n` menjawab langsung; `←` `→` berpindah antartombol. `destructive` mengatur gaya tombol konfirmasi dan memfokuskan Batal terlebih dahulu.

<!-- s:fecae30a60 -->
Toast

<!-- s:76abda6137 -->
Render satu `<Toaster />`, lalu panggil `useToast()` di mana saja dalam root yang sama.

<!-- s:d5c6b1208e -->
| Opsi | Deskripsi |
| :-- | :-- |
| `duration` | Milidetik (default `4000`; toast pemuatan tetap tampil) |
| `id` | Gunakan kembali untuk memperbarui toast di tempat |
| `position` | Pada `<Toaster>`: `bottom-right` (default), `top-center`, … |
| `max` | Pada `<Toaster>`: jumlah yang terlihat sekaligus (default `3`) |

<!-- s:476f42f2b3 -->
Toast dirender di atas modal dan tidak pernah mengambil fokus.
