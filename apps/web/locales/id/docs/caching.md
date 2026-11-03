<!-- s:5b67b32177 -->
Simpan respons route handler dan data dalam cache, lalu validasi ulang secara berkala atau sesuai permintaan. Entri kedaluwarsa langsung disajikan sementara satu pembaruan berjalan di latar belakang.

<!-- s:be697310c8 -->
Route handler

<!-- s:e85fc29fe2 -->
Route handler `GET` bersifat dinamis secara default. Aktifkan cache melalui konfigurasi segmen route:

<!-- s:e4ccf65c67 -->
| Ekspor | Perilaku |
| :-- | :-- |
| *(tidak ada)* | Berjalan pada setiap permintaan |
| `dynamic = "force-static"` | Disimpan dalam cache hingga divalidasi ulang |
| `revalidate = N` | Disimpan dalam cache; kedaluwarsa setelah `N` detik |
| `revalidate = 0` atau `dynamic = "force-dynamic"` | Berjalan pada setiap permintaan |

<!-- s:274c053db6 -->
Nilai `dynamic` lainnya gagal dengan `TX031`. Ini termasuk `"error"` milik Next.js, karena Text.js tidak bisa mendeteksi kapan handler membaca permintaan.

<!-- s:0fae4045f6 -->
Handler yang menggunakan cache mendapat satu entri per pathname, dan `request`-nya menyerupai kondisi saat build: tanpa string kueri, header, cookie, atau body. Baca semua itu dalam handler dinamis. Hanya `GET` dan `HEAD` yang disimpan dalam cache. Respons dengan status `5xx`, header `Set-Cookie`, atau `Cache-Control: private` / `no-store` dikembalikan tetapi tidak pernah disimpan.

<!-- s:b618d4732f -->
Header

<!-- s:c0a6cf7351 -->
Respons dari cache menyertakan:

<!-- s:b5f8cfecb4 -->
| Header | Nilai |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT`, atau `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, atau `s-maxage=31536000` untuk `force-static` |

<!-- s:c1fb73c64a -->
Ketika [middleware](/docs/middleware) menetapkan cookie, menulis ulang permintaan, atau menimpa header permintaan, header yang dihasilkan menjadi `private, no-cache, no-store, max-age=0, must-revalidate`, sehingga cache bersama tidak pernah menggunakan kembali keputusan khusus pengunjung. Header `Cache-Control` yang ditetapkan handler tetap dipertahankan.

<!-- s:ae27ba22c7 -->
Dalam `text dev`, konfigurasi segmen berlaku tetapi tidak ada yang disimpan, sehingga setiap permintaan menjalankan handler.

<!-- s:64841df645 -->
Cache data

<!-- s:2187e2262b -->
Simpan fungsi asinkron apa pun dalam cache dengan `unstable_cache` dari `@textjs/app/cache`:

<!-- s:4c26e099ff -->
Kunci terdiri dari bagian kunci ditambah argumen, yang dikodekan berdasarkan nilai (argumen `undefined` dan `null`, `Map`, `Set`, `Date`, dan `URL` tetap dibedakan). Tanpa bagian kunci, kode sumber fungsi dan tempat pembuatannya menjadi identitasnya; berikan bagian kunci setiap kali fungsi menangkap nilai dari lingkup luarnya, misalnya saat dibuat per permintaan atau dalam perulangan. Hasil diserialisasi ke JSON, sehingga setiap pemanggilan mengembalikan salinan baru (dan objek `Date` dikembalikan sebagai string); hasil yang tidak bisa diserialisasi memicu error. `cache(fn, { key, tags, revalidate })` menerima pengaturan yang sama sebagai objek opsi.

<!-- s:608eee0e9b -->
Di dalam route handler yang menggunakan cache, entri data meneruskan tag dan `revalidate` terpendeknya ke route: memvalidasi ulang `"posts"` juga memperbarui `/api/posts`. Pemanggilan data dengan `revalidate: 0` membuat route menjadi dinamis.

<!-- s:5537f337ee -->
Stale-while-revalidate

<!-- s:7d23e84252 -->
Setelah usia entri melebihi `revalidate`:

<!-- s:d4dd1966dd -->
1. Permintaan berikutnya langsung menerima nilai kedaluwarsa (`STALE`).
2. Satu pembaruan berjalan di latar belakang; permintaan bersamaan berbagi pembaruan tersebut.
3. Jika pembaruan memicu error, nilai kedaluwarsa tetap disajikan dan error dicatat dalam log.

<!-- s:e6db7819cc -->
Di Vercel dan Cloudflare, pembaruan latar belakang didaftarkan dengan `waitUntil()`. Entri yang berusia lebih dari satu tahun selalu dihitung ulang di latar depan.

<!-- s:5854b096d2 -->
Validasi ulang sesuai permintaan

<!-- s:686aa7f2f3 -->
| Pemanggilan | Yang dibatalkan validitasnya |
| :-- | :-- |
| `revalidateTag("posts")` | Semua yang diberi tag `posts`; permintaan berikutnya menghitung ulang |
| `revalidateTag("posts", "max")` | Menandainya kedaluwarsa; permintaan berikutnya menerima nilai kedaluwarsa selama pembaruan berjalan |
| `revalidatePath("/api/feed")` | Path tersebut |
| `revalidatePath("/api/posts/[id]")` | Setiap path dari route dinamis |
| `revalidatePath("/api", "layout")` | Semua yang berada di bawah `/api` |

<!-- s:b132bd50eb -->
Keduanya mengembalikan promise. Dengan penyimpanan dalam memori, pembatalan validitas berlangsung seketika; gunakan `await` jika [penyimpanan kustom](#custom-cache-stores) bersifat asinkron.

<!-- s:2aab4b4d00 -->
Penyimpanan cache kustom

<!-- s:7bee24a364 -->
Penyimpanan default adalah LRU dalam memori (1.000 entri, sekitar 50 MB) per instans server. Untuk berbagi cache antarinstans, arahkan `cacheHandler` ke modul yang mengekspor `CacheStore` sebagai ekspor default:

<!-- s:593c57fca5 -->
Entri berupa JSON biasa. Sebagai alternatif, `setCacheStore(store)` memasang penyimpanan saat runtime.

<!-- s:fe2404de51 -->
Catatan platform

<!-- s:5418a08901 -->
- Setiap instans serverless (fungsi Vercel, isolate Cloudflare) memiliki cache dalam memorinya sendiri. `Cache-Control: s-maxage` memungkinkan CDN platform menyimpan respons dalam cache juga; validasi ulang sesuai permintaan tidak menghapus cache CDN. Gunakan `cacheHandler` bersama ketika `revalidateTag` harus menjangkau setiap instans.
- Cloudflare memerlukan flag `nodejs_compat` (cache menggunakan `AsyncLocalStorage`). Lihat [Deploy](/docs/deploying).
