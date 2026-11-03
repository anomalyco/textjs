<!-- s:d7ae3c23f0 -->
Setiap sel memiliki karakter, warna depan, latar belakang, dan sekumpulan atribut. Text.js mengompilasinya menjadi span CSS `%c`, sehingga konsol menampilkan warna asli, teks tebal, dan teks miring.

<!-- s:45433c474e -->
Atribut teks

<!-- s:32c37753d8 -->
`<Text>` menerima `bold`, `dim`, `italic`, `underline`, dan `strikethrough`. Elemen `<Text>` bersarang menjadi span bergaya dalam satu baris.

<!-- s:661b7c60b6 -->
Token tema

<!-- s:f312d78237 -->
Prop `color` menerima nilai heksadesimal, nama warna biasa (`emerald`), dan token tema; variasi warna palet Tailwind menggunakan kelas (`text-emerald-400`). Token mengikuti tema aktif, jadi utamakan token untuk segala hal yang bersifat semantik. Tambahkan komponen status:

<!-- s:4d4d36a0bd -->
Kartu deployment

<!-- s:108bb076c9 -->
`bg-surface` membuat kartu tampak terangkat dari latar belakang. ID deployment menggunakan warna status, menjadi miring saat proses build berlangsung, dan dicoret saat terjadi error.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` mengakhiri pesan commit yang panjang dengan `…` alih-alih melanjutkannya ke baris kedua.

<!-- s:087abce968 -->
Tema

<!-- s:8f993e0ab8 -->
Text.js menyertakan lima tema: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT, dan Geist Light. Tekan `t` di konsol untuk menggilirnya. Seluruh frame digambar ulang dengan palet baru, karena setiap warna di atas merupakan token.
