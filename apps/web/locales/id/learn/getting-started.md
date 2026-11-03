<!-- s:b7512b6ff1 -->
Dalam sepuluh bab, Anda akan membangun **Acme Deploys**, dasbor deploy yang dirender di konsol DevTools. Setiap bab diakhiri dengan aplikasi yang persis sesuai hasil kode Anda, berjalan langsung di konsol pada halaman ini.

<!-- s:630c586fd9 -->
Membuat aplikasi

<!-- s:fd9f176938 -->
`create-text-app` menyiapkan kerangka proyek dengan App Router, TypeScript, dan CLI `text`.

<!-- s:9eee556b8f -->
Buka `http://localhost:3000`, lalu [buka konsol browser](/docs/installation#open-the-console). Halaman menampilkan focus pad. Aplikasi Anda dirender di konsol.

<!-- s:7d69bcfbda -->
Halaman pertama Anda

<!-- s:77df233a57 -->
Setiap route berupa `page.tsx` di `app/`. Ganti halaman awal dengan kartu judul dasbor:

<!-- s:efd190e3b6 -->
Simpan berkas. Fast Refresh menggambar ulang frame dan mempertahankan state komponen Anda.

<!-- s:f5e9f4301c -->
Merespons tombol

<!-- s:a9111ae891 -->
`useInput` menerima setiap penekanan tombol selama halaman memiliki fokus. Hitung jumlah sapaan:

<!-- s:c766a57c22 -->
Itulah aplikasi Text.js yang lengkap. Aplikasi ini memiliki state React, kotak layout, dan satu `console.log` untuk setiap frame yang berubah, serta tidak mencatat apa pun saat idle.
