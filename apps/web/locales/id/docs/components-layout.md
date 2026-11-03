<!-- s:19797c0276 -->
Primitif ini mengatur grid sel dengan Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Kontainer layout.

<!-- s:b2726c7ef5 -->
| Prop | Deskripsi |
| :-- | :-- |
| `className` | Utilitas sel |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Teks yang disisipkan pada garis tepi atas |
| `bg` / `fg` | Warna latar belakang dan teks |
| `overflow` | `hidden` atau `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Teks inline. `<Text>` bersarang menjadi span dengan gaya.

<!-- s:d078a242d3 -->
| Prop | Deskripsi |
| :-- | :-- |
| `color` | Warna teks |
| `bold` `italic` `underline` `dim` | Atribut |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Kolom yang bisa digulir. `stickyScroll` mempertahankan posisi di bagian bawah saat konten bertambah.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Overlay di tengah yang meredupkan konten di bawahnya dan menahan fokus di dalamnya.

<!-- s:7a128a8b11 -->
Spacer, Divider dan Badge

<!-- s:72e5d35050 -->
Helper layout

<!-- s:e76299d593 -->
Bentuk singkat untuk susunan flex yang umum.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Dua panel dan satu pembatas. Dengan `resizable`, pembatas masuk dalam urutan `Tab` dan `←` `→` mengubah ukurannya (`Shift` untuk lima sel).

<!-- s:2143924860 -->
`size` berupa pecahan (`0.3`) atau jumlah sel (`24`). `direction="column"` menumpuk panel secara vertikal.
