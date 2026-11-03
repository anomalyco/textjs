<!-- s:0e310a2cb9 -->
Penekanan tombol mencapai aplikasi Anda melalui input tersembunyi di halaman, jadi halaman memerlukan fokus. Itulah sebabnya setiap aplikasi Text.js meminta Anda mengeklik halaman terlebih dahulu. Setelah halaman mendapat fokus, setiap tombol yang Anda tekan diteruskan ke React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` adalah hook tingkat rendah yang telah Anda gunakan sejauh ini. Hook ini menerima `KeyEvent` dengan `key` yang dinormalisasi (`"up"`, `"return"`, `"escape"`), karakter yang diketik dalam `input`, serta `ctrl`, `alt`, `shift` dan `meta`.

<!-- s:bc64f58619 -->
Panggil `e.stopPropagation()` agar tombol tidak mencapai handler lebih jauh di bawah dalam pohon komponen.

<!-- s:d899f69427 -->
Keymap

<!-- s:9b0867a5d5 -->
Setelah sebuah layar menggunakan lebih dari beberapa tombol, deskripsikan tombol tersebut dengan `useKeymap`. Binding berupa string: `"up, k"` berarti salah satu tombol, `"g g"` berarti urutan, `"ctrl+k"` berarti kombinasi tombol. Binding berlabel juga muncul di `<KeyHelp>`, `<KeyHints>` dan palet perintah.

<!-- s:8a9f2678dd -->
Untuk saat ini, `DEPLOYMENTS` berupa array biasa di `lib/deployments.ts`. Bab 6 memindahkannya ke balik route handler.

<!-- s:c2982612c3 -->
Overlay bantuan

<!-- s:5001b36935 -->
`<KeyHelp />` mendengarkan `?` dan membuka modal yang menampilkan semua binding berlabel yang sedang aktif, dalam kelompok. Tekan `?` di konsol, lalu `?` atau `q` untuk menutupnya. Binding di dalam modal mengunci fokus, sehingga daftar di bawahnya berhenti merespons hingga modal ditutup.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:27a5e2c6bc -->
Komponen seperti `<Input>`, `<Select>` dan `<Table>` hanya menerima tombol saat memiliki fokus. `Tab` memindahkan fokus di antaranya; `useFocus()` dan `useFocusManager()` memungkinkan Anda memindahkannya sendiri.
