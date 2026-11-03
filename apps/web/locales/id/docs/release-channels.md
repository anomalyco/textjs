<!-- s:b808ed6cd6 -->
Text.js dirilis melalui tiga dist-tag npm. Setiap paket (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` dan `eslint-plugin-textjs`) menggunakan versi yang diselaraskan, sehingga satu nomor versi mewakili seluruh framework.

<!-- s:a2c3664770 -->
Kanal

<!-- s:6b5c5ba172 -->
| Kanal | dist-tag | Versi | Instalasi |
| :-- | :-- | :-- | :-- |
| Stabil | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Diterbitkan setelah `2.0.0` dirilis | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Gunakan versi stabil di produksi. Gunakan canary untuk mencoba perbaikan dan fitur pada hari keduanya masuk ke `dev`. Setelah lini LTS tersedia, gunakan lini tersebut jika Anda memperbarui versi setahun sekali.

<!-- s:abc686bd76 -->
Stabil

<!-- s:df32c144c0 -->
Rilis stabil mengikuti [pemberian versi semantik](https://semver.org): versi patch memperbaiki bug, versi minor menambahkan fitur yang kompatibel dengan versi sebelumnya, versi mayor dapat mengubah API secara tidak kompatibel setelah masa penghentian bertahap. Rilis stabil berasal dari canary yang telah lulus seluruh rangkaian pengujian, dan diterbitkan dengan provenance npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Setiap push ke `dev` di repositori resmi melewati pemeriksaan tipe, pengujian, dan diterbitkan sebagai patch berikutnya dengan akhiran `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Push ke `dev` | Diterbitkan |
| :-- | :-- | :-- |
| `1.0.0` | pertama | `1.0.1-canary.0` |
| `1.0.0` | kedua | `1.0.1-canary.1` |
| `1.0.1` | berikutnya | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` berlanjut dari nomor canary tertinggi yang sudah ada di npm, sehingga nomor tidak pernah berulang. Versi canary tidak dimasukkan ke repositori melalui commit. Tambahkan `[skip canary]` ke pesan commit untuk melewati rilis.

<!-- s:762894d754 -->
Canary adalah build dari `dev`, branch tujuan penggabungan setiap pull request. Canary dapat mengubah atau menghapus API yang belum dirilis tanpa pemberitahuan. Kunci versi canary tertentu jika Anda bergantung padanya.

<!-- s:6999c4e986 -->
Provenance

<!-- s:18722b1d6c -->
Rilis diterbitkan dari GitHub Actions dengan `npm publish --provenance`, yang menghubungkan setiap tarball ke commit dan alur kerja persis yang membuatnya. Verifikasi paket dengan:

<!-- s:57d2e7b18d -->
Menyiapkan rilis

<!-- s:a3217d58a6 -->
Pengelola menaikkan versi setiap paket workspace secara serentak dengan skrip rilis:

<!-- s:614a1ea872 -->
`release:version` menulis ulang setiap `package.json` dan konstanta versi yang mencerminkannya (`VERSION`, `rendererVersion` milik reconciler), menolak berjalan jika versi paket tidak lagi selaras, dan `--dry-run` mencetak rencananya. `release:publish` membuat build, mengemasnya (menyelesaikan `workspace:*`), menerapkan `publishConfig`, menolak menempatkan prarilis di `latest` atau versi stabil di `canary`, dan melewati versi yang sudah ada di npm.

<!-- s:ec6955472a -->
Lihat [Kebijakan dukungan](/docs/support-policy) untuk mengetahui berapa lama setiap lini rilis dipelihara.
