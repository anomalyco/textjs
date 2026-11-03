<!-- s:e580113c76 -->
Komponen ini merender Markdown, kode, diff, dan huruf berukuran besar pada kisi sel.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown yang aman untuk streaming. Berikan string yang terus bertambah dan frame tetap stabil.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Penyorotan sintaks untuk `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go`, dan lainnya.

<!-- s:e75addc84e -->
| Prop | Deskripsi |
| :-- | :-- |
| `language` | ID bahasa |
| `showLineNumbers` | Kolom nomor baris |
| `highlightLines` | Baris yang diberi warna |
| `maxHeight` | Potong dengan footer “baris lainnya” |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Diff terpadu, atau dihitung dari `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Varian: `dots`, `pulse`, `matrix`, `line`, dan `braille` (untuk terminal; Menlo tidak memiliki glif braille). Timer berhenti saat dijeda.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Huruf piksel besar untuk judul.

<!-- s:d3f90f7b9b -->
Gunakan `font="compact"` untuk varian 3 baris. Berikan font FIGlet dari [`@textjs/font`](/docs/fonts), seperti `font={slant}`, untuk huruf figlet.
