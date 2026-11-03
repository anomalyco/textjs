<!-- s:07e7af1eca -->
App Router memetakan folder di `app/` ke URL dan menyinkronkannya dengan bilah alamat serta riwayat browser.

<!-- s:9c68fe3a82 -->
Halaman

<!-- s:c4bd849316 -->
Ekspor komponen sebagai ekspor default dari `page.tsx`:

<!-- s:66a6e1dc46 -->
Layout

<!-- s:7d310a5d74 -->
Layout membungkus route dan mempertahankan state selama navigasi.

<!-- s:c2b3ba00ff -->
Segmen dinamis

<!-- s:44ffd1d0a7 -->
Navigasi

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` bisa menerima fokus dan mendukung pintasan satu tombol.

<!-- s:328e16abd4 -->
| Prop | Deskripsi |
| :-- | :-- |
| `href` | Path tujuan |
| `shortcut` | Tombol untuk mengikuti tautan |
| `replace` | Mengganti entri riwayat |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Navigasi dari kode:

<!-- s:4d9f7f9c5b -->
`usePathname` dan `useParams`

<!-- s:2545c9aaa2 -->
Baca route saat ini:

<!-- s:a5386906c8 -->
Navigasi mundur, maju, dan deep link semuanya berfungsi. Pada host statis, segmen dinamis memerlukan fallback ke `index.html`. Adapter `static` menulis fallback tersebut sebagai `404.html`.
