<!-- s:e4dabd0578 -->
Yoga, mesin flexbox yang digunakan React Native dan dikompilasi ke WebAssembly, mengatur layout setiap frame Text.js. Kotak dan teks berbagi satu pohon Yoga. Konsol berupa kisi sel karakter, sehingga setiap posisi dan ukuran yang dihasilkannya harus berupa jumlah sel yang bulat.

<!-- s:9c86e1b16d -->
Satu poin adalah satu sel

<!-- s:9026ebff4f -->
Yoga membulatkan hasilnya ke kisi piksel yang ditentukan oleh faktor skala poin. Pada faktor 2, seperti pada layar Retina, tepi dapat berada di setengah poin. Text.js memuat Yoga sekali dan menetapkan faktornya ke 1:

<!-- s:f5193c7abd -->
Dengan faktor 1, Yoga membulatkan setiap tepi ke satuan bulat, dan Text.js memperlakukan satu satuan sebagai satu sel. Yoga membulatkan posisi absolut setiap tepi dan menghitung ukuran dari tepi yang telah dibulatkan, sehingga kotak yang bersebelahan berbagi satu tepi. Bagi baris selebar 81 kolom menjadi dua kotak `width="50%"` dan satu kotak mendapat 40 kolom, yang lain 41, tanpa celah dan tanpa tumpang tindih.

<!-- s:4f9619621a -->
Text.js menerapkan nilai default CSS sendiri: `flexDirection` adalah `row` dan `flexShrink` adalah `1`, seperti pada browser.

<!-- s:5240062c19 -->
Mengukur teks

<!-- s:25f0052f43 -->
Node teks adalah daun pada pohon Yoga yang memiliki fungsi pengukuran. Yoga memanggilnya dengan lebar yang tersedia, dan Text.js mengembalikan ukuran teks dalam sel:

<!-- s:a543588dc9 -->
Teks yang muat dikembalikan dengan ukuran alaminya. Teks yang tidak muat dibungkus sesuai lebar yang tersedia, dan tingginya adalah jumlah baris. Node menyimpan hasil pembungkusan terakhir, sehingga pengukuran ulang dengan lebar yang sama tidak membungkus ulang teks.

<!-- s:3c253fdc4c -->
Mengukur klaster grafem

<!-- s:7d52c4b9c9 -->
`length` pada string menghitung unit kode UTF-16, yang tidak banyak menunjukkan jumlah sel yang diisinya. Teks terlebih dahulu dipecah menjadi klaster grafem dengan `Intl.Segmenter`, sehingga `e` yang diikuti aksen penggabung menjadi satu klaster, begitu pula rangkaian emoji yang disambungkan dengan zero-width joiner. Setiap klaster kemudian diberi lebar:

<!-- s:f36acd4206 -->
| Teks | Sel | Alasan |
| :-- | --: | :-- |
| `abc` | 3 | Satu sel per karakter |
| `你好` | 4 | Karakter lebar Asia Timur memakai dua sel |
| `🚀` | 2 | Tampilan emoji memakai dua sel |
| `é` (`e` + U+0301) | 1 | Tanda penggabung tidak memakai sel |
| `─│┌▼←⠋` | 6 | Karakter pembentuk kotak, bentuk geometris, panah, dan braille ditetapkan memakai satu sel |

<!-- s:75d5c21868 -->
Batas, tanda `▼`, panah, dan frame spinner selalu diukur sebagai satu sel, sehingga batas kotak tidak pernah menggeser isinya keluar dari barisan.

<!-- s:cee20acd8c -->
ASCII yang dapat dicetak melewati segmentasi, dan lebar lainnya disimpan dalam cache per titik kode dan per klaster.

<!-- s:5f37d5a215 -->
Pembungkusan teks

<!-- s:b59adefd34 -->
`<Text>` menerima mode `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (default) memutus baris pada spasi, dan di dalam kata jika kata tersebut lebih lebar daripada baris.
- `nowrap` mempertahankan satu baris dan membiarkan kotak memotongnya.
- `truncate-end`, `truncate-middle`, dan `truncate-start` mempertahankan satu baris dan mengganti bagian yang tidak muat dengan `…`.

<!-- s:73ec8f197a -->
Pemotongan juga menghitung sel, sehingga satu baris teks bahasa Mandarin dipotong pada batas karakter, dan elipsis memakai tepat satu sel.

<!-- s:1d11d6a370 -->
Dalam praktik

<!-- s:50e47bf264 -->
Di sini, bilah samping selebar 30 kolom berada di sebelah panel yang memakai lebar sisanya:

<!-- s:f9394d30d6 -->
Pada konsol selebar 100 kolom, bilah samping memakai 30 kolom termasuk batasnya, dan panel percakapan memakai 70 kolom sisanya. Batas memakai satu sel di setiap sisi, sehingga judul sesi dipotong pada 28 sel.
