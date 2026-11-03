<!-- s:5c16c8b17b -->
Folder di `app/` menentukan route, dan file khusus menentukan UI untuk setiap route.

<!-- s:11f7d9178c -->
Folder

<!-- s:8bda4d61c2 -->
| Folder | Fungsi |
| :-- | :-- |
| `app` | Route, layout, dan route handler |
| `lib` | Modul bersama, tidak dijadikan route |
| `public` | Aset statis |

<!-- s:25756fa68d -->
File routing

<!-- s:8d1e739d99 -->
| File | Fungsi |
| :-- | :-- |
| `layout.tsx` | UI bersama untuk suatu segmen |
| `page.tsx` | Layar yang dapat diakses melalui route |
| `loading.tsx` | Fallback Suspense |
| `error.tsx` | Error boundary |
| `not-found.tsx` | URL yang tidak cocok |
| `route.ts` | Endpoint API |

<!-- s:ed4806a616 -->
Route dinamis

<!-- s:7f3bfd19e0 -->
| Folder | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Opsi | Nilai default | Deskripsi |
| :-- | :-- | :-- |
| `title` | `""` | Judul halaman dan FocusPad |
| `viewport` | sesuaikan dengan konsol, jika tidak `120×36` | `responsive` (default `true`), fallback `width × height`, `theme` |
| `hints` | `[]` | Dua atau tiga tombol yang ditampilkan pada FocusPad halaman |
| `action` | `press <first hint>` | Tindakan setelah mendapat fokus, misalnya `"type a prompt"` |
| `devIndicators` | `true` | Dev Overlay di dalam konsol (`[▼]`) |
| `focusHint` | `true` | “Klik halaman untuk menggunakan keyboard” di atas baris terakhir konsol saat halaman tidak memiliki fokus |
| `rewrites` | `[]` | Rewrite dan proksi |
| `ansi` | `{ cols: 80, rows: 24 }` | Ukuran frame untuk [curl dan klien terminal](/docs/curl), atau `false` untuk menyajikan HTML kepada klien tersebut |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Perintah | Deskripsi |
| :-- | :-- |
| `text dev` | Server pengembangan dengan Fast Refresh |
| `text build` | Build produksi |
| `text start` | Sajikan build dan route handler |
| `text run` | Render aplikasi di terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Sajikan aplikasi kepada agen pemrograman ([MCP](/docs/mcp)) |
