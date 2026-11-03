<!-- s:98c33b0a07 -->
Persyaratan

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ atau Node.js 22+
- Chrome, Edge, Firefox atau Safari di desktop

<!-- s:d7f4dad213 -->
Membuat aplikasi

<!-- s:b32738e24d -->
Pilih template (`starter`, `dashboard` atau `opencode`), lalu jalankan server pengembangan:

<!-- s:21fb743289 -->
Membuka konsol

<!-- s:14e4fdc5be -->
Kunjungi `http://localhost:3000` dan buka konsol.

<!-- s:a370660339 -->
| Browser | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome, Edge, Arc, Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | Hanya macOS |

<!-- s:de7134a591 -->
Di Safari, aktifkan terlebih dahulu **Tampilkan fitur untuk pengembang web** di “Setelan” → “Lanjutan”.

<!-- s:8f6c6cf39e -->
Klik halaman untuk memfokuskannya, lalu ketik. Menempatkan DevTools di bagian bawah memberikan kisi terlebar.

<!-- s:9807a8b582 -->
Setelan konsol

<!-- s:803094bd72 -->
Nonaktifkan **Simpan log** di setelan konsol. Text.js menambahkan satu pesan di akhir per frame dan mengosongkan konsol untuk melepaskan frame lama. Saat “Simpan log” aktif, DevTools mengabaikan pengosongan konsol dan frame lama menumpuk.

<!-- s:35e7d1d33e -->
Penyiapan manual

<!-- s:ff78ccae69 -->
Tanpa framework

<!-- s:26f8520062 -->
Pasang pohon React apa pun ke konsol dari situs yang sudah ada:
