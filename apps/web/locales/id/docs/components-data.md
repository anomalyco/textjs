<!-- s:d3c8cb679e -->
`<List>`, `<Table>`, dan `<Tree>` menampilkan kumpulan data besar. Hanya baris yang terlihat yang di-render.

<!-- s:44ffd1d0a7 -->
Navigasi

<!-- s:e3dca4574c -->
`<List>`, `<Table>`, dan `<Tree>` menggunakan model keyboard yang sama.

<!-- s:cdac0643be -->
| Tombol | Tindakan |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Berpindah |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Satu halaman, setengah halaman |
| `Home` `End` / `g` `G` | Pertama, terakhir |
| `↵` | `onSelect` |
| Roda gulir | Memindahkan kursor |

<!-- s:1c65c42a4d -->
Secara default, komponen ini memenuhi induknya. Berikan `height` untuk menetapkan jumlah baris.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Daftar tervirtualisasi. Setiap baris memiliki tinggi satu sel.

<!-- s:3408e68b29 -->
| Prop | Deskripsi |
| :-- | :-- |
| `items` | Array apa pun |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Dilewati kursor |
| `height` | Baris yang terlihat (default: memenuhi induk) |
| `highlightedIndex` / `onHighlight` | Kursor terkontrol |
| `vimKeys` | `j` `k` `g` `G` (default `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Kolom berbagi lebar yang tersisa kecuali jika kolom menetapkan `width`. Header dan sel menggunakan aturan flex yang sama, sehingga selalu sejajar.

<!-- s:e9719839f0 -->
| Field kolom | Deskripsi |
| :-- | :-- |
| `key` | ID dan pengakses default |
| `width` / `grow` | Jumlah sel tetap atau bagian dari sisa lebar |
| `align` | `left` `right` `center` |
| `value` | Nilai tampilan dan pengurutan |
| `render` | Konten sel kustom |
| `compare` | Pengurutan kustom |

<!-- s:045ee40857 -->
Pengurutan

<!-- s:d04de39344 -->
Dengan `sortable`, tekan nomor kolom untuk mengurutkan berdasarkan kolom tersebut (tekan lagi untuk membalik arah), `s` untuk berpindah antar kolom, dan `S` untuk membalik arah. Pengurutan bersifat stabil. Kontrol dengan `sort` dan `onSortChange`.

<!-- s:6d625a19ed -->
Pemilihan

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` menambahkan kolom centang; `Space` mengubah status pilihan baris yang disorot. Gunakan `selectedKeys` dan `onSelectionChange` untuk mengontrolnya, serta `getRowKey` untuk key yang stabil.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Pohon yang dapat diperluas dengan garis panduan.

<!-- s:eeb148154f -->
`→` memperluas atau masuk ke cabang. `←` menciutkan atau melompat ke induk. `Space` bergantian memperluas atau menciutkan. `flattenTree(data, expanded)` menyediakan baris yang terlihat jika Anda memerlukan renderer sendiri.
