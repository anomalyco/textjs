<!-- s:b2d192945b -->
Konsol adalah kisi sel. Text.js menatanya dengan Yoga, mesin flexbox yang juga digunakan React Native, sehingga `<Box>` mengikuti aturan CSS flexbox. Satuannya adalah sel: `p-1` memberi padding satu kolom dan satu baris.

<!-- s:029cc40e38 -->
Bilah atas

<!-- s:4708298213 -->
Sebagian besar layar berupa kolom: bilah setinggi satu baris, lalu semua konten lainnya. Tetapkan tinggi bilah dengan `h-1` dan biarkan konten mengisi sisanya dengan `grow`.

<!-- s:5f781355bb -->
`<Spacer>` adalah kotak yang membesar: apa pun setelahnya terdorong ke tepi kanan.

<!-- s:0c01f22e11 -->
Bilah samping dan kartu

<!-- s:7bf034d9ab -->
Tambahkan bilah samping berlebar tetap dengan garis tepi kanan dan tiga kartu yang berbagi lebar tersisa. `basis-0` bersama `grow` memberi setiap kartu bagian yang sama terlepas dari isinya.

<!-- s:493f8816f0 -->
Tekan `s` dan `d` di konsol. Yoga menghitung ulang layout dan hanya baris yang berubah yang digambar ulang, sehingga menampilkan atau menyembunyikan bilah samping hanya memerlukan satu `console.log`.

<!-- s:66bd0231a6 -->
Responsif secara default

<!-- s:7d3f8e46eb -->
Kisi mengikuti panel DevTools yang ditambatkan. Seret konsol agar lebih lebar atau lebih tinggi dan kartu akan menata ulang posisinya. Saat Anda memerlukan breakpoint, `useBreakpoint()` mengembalikan breakpoint saat ini, dalam sel.
