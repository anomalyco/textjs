<!-- s:510651334f -->
Status pemuatan dan batas penanganan error dirender di konsol. Tentukan keduanya per segmen route dengan `loading.tsx` dan `error.tsx`.

<!-- s:28d65d04f2 -->
UI pemuatan

<!-- s:d64d19effc -->
Tambahkan `loading.tsx` untuk menampilkan fallback saat halaman ditangguhkan.

<!-- s:4445f6cf6c -->
Error

<!-- s:3834711277 -->
Tambahkan `error.tsx` untuk menangkap error rendering. Komponen ini menerima error dan fungsi `reset`.

<!-- s:5b439d0e88 -->
Tidak ditemukan

<!-- s:c01c20f824 -->
Panggil `notFound()` untuk merender `not-found.tsx` terdekat.

<!-- s:dc40d65e00 -->
Redbox di dalam konsol

<!-- s:2ec3bf8f2e -->
Saat pengembangan, error yang tidak tertangkap membuka overlay di dalam konsol yang menampilkan pesan dan lokasi sumber. Memperbaiki file akan menutupnya.

<!-- s:35c9c3ef6b -->
Dev Overlay

<!-- s:e2a34a83d6 -->
Saat pengembangan, tombol berbentuk pil `[▼]` di sudut kiri bawah konsol adalah Dev Overlay. Tekan `F2` atau `` Ctrl+` `` untuk membukanya dan memeriksa route, waktu frame, dan layout. Nonaktifkan dengan `devIndicators: false`.
