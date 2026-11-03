<!-- s:09c9709272 -->
`text build` menghasilkan klien statis dan, jika Anda memiliki route handler, server untuk `text start`.

<!-- s:b09ff23eb8 -->
Build

<!-- s:34d9f1bf54 -->
`text start` menyajikan hasil build dan menjalankan route handler Anda. Perintah ini berjalan di host apa pun dengan Bun 1.2+ atau Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Atur judul tab browser di layout root. Halaman dapat menggantinya.

<!-- s:0467501ecc -->
Hosting statis

<!-- s:f5f06a38ae -->
Tanpa route handler, hasil build berupa situs statis biasa. Setiap route statis mendapat file HTML sendiri. Route dinamis seperti `/deployments/[id]` disajikan oleh `index.html`.

<!-- s:c33282e322 -->
Di Vercel dan Cloudflare Pages, `text build` mendeteksi platform dan menulis fallback tersebut secara otomatis. Host statis lainnya memerlukan rewrite. Di Netlify, tambahkan file `_redirects` ke `public/`:

<!-- s:ec502dd4e6 -->
Netlify menyajikan file yang ada sebelum menerapkan aturan tersebut, sehingga aset dan route yang telah melalui prerender tidak terpengaruh.

<!-- s:0b1dc034aa -->
Sebelum deploy

<!-- s:463de18e39 -->
- Nonaktifkan **Simpan log** di setelan konsol Anda. Pengguna Anda juga perlu menonaktifkannya.
- Uji ukuran sempit seperti 80×24. DevTools yang ditambatkan ke samping menghasilkan kisi sempit.
- Jalankan `bun test`.

<!-- s:c5fa27231d -->
Tekan `Enter` di konsol untuk deploy. Lalu klaim sertifikat Anda.
