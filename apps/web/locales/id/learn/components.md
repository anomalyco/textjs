<!-- s:68d1688157 -->
Ganti baris buatan sendiri dengan komponen: `<Table>` dengan navigasi keyboard dan pengurutan, `<List>` dengan pengguliran tervirtualisasi, serta grafik yang digambar dengan blok seperdelapan dan titik kuadran.

<!-- s:05c3784661 -->
Tabel yang bisa diurutkan

<!-- s:7c978a7876 -->
Kolom berupa array objek. Kolom tanpa `width` berbagi ruang tersisa berdasarkan `grow`, `value` menjadi nilai yang dibandingkan saat pengurutan, dan `render` menggambar sel.

<!-- s:d77f425e4a -->
Saat tabel mendapat fokus, `↑` `↓` memindahkan sorotan, `s` menggilir kolom pengurutan, `S` membalik arah pengurutan dan `Enter` memanggil `onSelect`. Tabel panjang hanya menggambar baris yang terlihat.

<!-- s:0d24a40c2e -->
Grafik di atasnya

<!-- s:146f64e4f0 -->
`<Sparkline>` mengisi kotaknya dengan titik terbaru. `<BarChart>` menyelaraskan label dan nilai untuk Anda.

<!-- s:62ad31a083 -->
Kotak grafik memiliki tinggi tetap, sehingga pergantian grafik tidak pernah menggeser tabel, dan barisnya tidak dikodekan ulang.

<!-- s:335111e821 -->
Komponen lainnya

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` dan lainnya didokumentasikan di [Komponen](/docs/components-data).
