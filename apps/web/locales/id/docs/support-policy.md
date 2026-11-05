<!-- s:d2d5ef69d7 -->
Halaman ini membahas berapa lama setiap lini rilis Text.js menerima perbaikan, dan apa yang termasuk perubahan yang merusak kompatibilitas.

<!-- s:80371443b7 -->
Lini rilis

<!-- s:19aa9fdfd3 -->
| Status | Menerima | Durasi |
| :-- | :-- | :-- |
| Aktif | Fitur, perbaikan, patch keamanan | Hingga rilis mayor berikutnya |
| LTS pemeliharaan | Perbaikan kritis dan patch keamanan | 12 bulan setelah rilis mayor berikutnya tersedia |
| Akhir masa dukungan | Tidak ada | — |

<!-- s:d5987f6ecf -->
Hanya rilis minor terbaru dari suatu versi mayor yang menerima patch: saat `1.5.0` dirilis, perbaikan masuk ke `1.5.x`, bukan `1.4.x`. Saat `2.0.0` dirilis, rilis minor terakhir dari `1.x` menjadi lini LTS pemeliharaan dan dipublikasikan dengan dist-tag `lts` dan `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Versi | Status | Didukung hingga |
| :-- | :-- | :-- |
| 1.x | Aktif | 12 bulan setelah 2.0.0 |

<!-- s:d71377bf9c -->
Yang kami perbaiki pada LTS

<!-- s:043b92b499 -->
- Kerentanan keamanan dalam paket Text.js
- Crash, kehilangan data, dan kegagalan build tanpa solusi sementara
- Kompatibilitas dengan rilis baru Chrome, Edge, Firefox, dan Safari yang merusak rendering konsol
- Kompatibilitas dengan runtime dan target deploy yang didukung

<!-- s:e01d1121d2 -->
Fitur baru, peningkatan performa, dan refaktor hanya masuk ke lini aktif.

<!-- s:d1c69ba9bc -->
Perubahan yang merusak kompatibilitas

<!-- s:82596fcd52 -->
Hal-hal berikut hanya berubah dalam rilis mayor, setelah peringatan deprekasi dalam setidaknya satu rilis minor:

<!-- s:4ca9fd7807 -->
- Ekspor publik dari `@textjs/app`, `@textjs/react`, dan `@textjs/core`, termasuk `@textjs/app/server` dan `@textjs/app/cache`
- Opsi `text.config.ts`, perintah dan flag CLI `text`
- Konvensi file dalam `app/`, `middleware.ts`, dan konfigurasi segmen route
- Layout keluaran adapter (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:883f3eeb26 -->
Tidak tercakup: API bertanda eksperimental atau `unstable_`, termasuk semua yang berada di bawah `@textjs/core/experimental`, `@textjs/react/experimental`, dan `@textjs/app/experimental` (API ini dapat berubah dalam rilis minor, dengan catatan di changelog), bagian internal seperti `@textjs/core/internal`, header `x-middleware-*` dan metadata build `.text/`, rilis canary, serta string format dan CSS `console.log` yang persis sama (tampilan frame tetap identik; pengodeannya dapat menjadi lebih cepat).

<!-- s:5c7d9aae9b -->
Dukungan runtime

<!-- s:30122ce1bb -->
| Runtime | Didukung |
| :-- | :-- |
| Chrome / Edge DevTools | Rilis stabil saat ini dan dua rilis stabil sebelumnya |
| Konsol Firefox dan Safari | Rilis stabil saat ini |
| Node.js | Rilis LTS aktif dan pemeliharaan (`text start`, fungsi Vercel) |
| Bun | 1.x terbaru |
| Cloudflare Workers | `compatibility_date` 2025-01-01 atau lebih baru, `nodejs_compat` |

<!-- s:509c18536b -->
Menghentikan dukungan untuk versi runtime yang telah mencapai akhir masa dukungannya sendiri bukanlah perubahan yang merusak kompatibilitas.

<!-- s:52543dba9b -->
Keamanan

<!-- s:2aff0514c5 -->
Laporkan kerentanan secara privat ke [security@textjs.org](mailto:security@textjs.org) atau melalui [pemberitahuan keamanan GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Perbaikan dirilis untuk setiap lini yang didukung pada saat yang sama, dan pemberitahuan dipublikasikan setelah versi yang telah ditambal tersedia di npm.

<!-- s:b933131934 -->
Lihat [Saluran rilis](/docs/release-channels) untuk mengetahui cara versi dan dist-tag dihasilkan.
