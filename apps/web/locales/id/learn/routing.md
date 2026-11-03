<!-- s:ce06f5c491 -->
App Router memetakan file di `app/` ke URL, mengikuti konvensi App Router Next.js. Bilah alamat dan riwayat browser tetap sinkron, sehingga navigasi kembali, maju, dan tautan langsung berfungsi saat UI dirender di konsol.

<!-- s:00fe1aba85 -->
File sebagai route

<!-- s:8bae70ad43 -->
Pindahkan daftar ke route tersendiri dan tambahkan halaman pengaturan:

<!-- s:141a7c73d4 -->
Layout bersama

<!-- s:cffa0eef2d -->
`layout.tsx` membungkus setiap halaman dan mempertahankan state-nya saat berpindah halaman. Tempatkan bilah atas dan navigasi di dalamnya.

<!-- s:9d98f5e58a -->
`shortcut` mengikat satu tombol ke tautan. Tekan `1`, `2`, dan `3` di konsol; URL aplikasi nyata akan berubah setiap kali salah satu tombol ditekan.

<!-- s:53af99b059 -->
Kembali

<!-- s:d77cce0a86 -->
`useRouter()` menjalankan navigasi dari kode. Hubungkan `Backspace` ke `router.back()` di layout:

<!-- s:c2b3ba00ff -->
Segmen dinamis

<!-- s:6a1dcfdf25 -->
Folder `[id]` menerima nilainya dalam `params`:

<!-- s:8294e77b63 -->
Pada host statis, segmen dinamis seperti ini memerlukan rewrite ke `index.html`. Bab 10 membahasnya.
