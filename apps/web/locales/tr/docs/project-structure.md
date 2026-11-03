<!-- s:5c16c8b17b -->
`app/` içindeki klasörler rotaları, özel dosyalar ise her rotanın kullanıcı arayüzünü tanımlar.

<!-- s:11f7d9178c -->
Klasörler

<!-- s:8bda4d61c2 -->
| Klasör | Amaç |
| :-- | :-- |
| `app` | Rotalar, layout’lar ve rota işleyicileri |
| `lib` | Rotalanmayan ortak modüller |
| `public` | Statik varlıklar |

<!-- s:25756fa68d -->
Rotalama dosyaları

<!-- s:8d1e739d99 -->
| Dosya | Amaç |
| :-- | :-- |
| `layout.tsx` | Bir segmentin ortak kullanıcı arayüzü |
| `page.tsx` | Rotalanabilir bir ekran |
| `loading.tsx` | Suspense yedek arayüzü |
| `error.tsx` | Hata sınırı |
| `not-found.tsx` | Eşleşmeyen URL’ler |
| `route.ts` | API uç noktası |

<!-- s:ed4806a616 -->
Dinamik rotalar

<!-- s:7f3bfd19e0 -->
| Klasör | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Seçenek | Varsayılan | Açıklama |
| :-- | :-- | :-- |
| `title` | `""` | Sayfa ve FocusPad başlığı |
| `viewport` | konsola sığdırma, aksi durumda `120×36` | `responsive` (varsayılan `true`), yedek boyut `width × height`, `theme` |
| `hints` | `[]` | Sayfanın FocusPad bileşeninde gösterilen iki veya üç tuş |
| `action` | `press <first hint>` | Odaklandıktan sonra yapılacak işlem, ör. `"type a prompt"` |
| `devIndicators` | `true` | Konsol içi geliştirme katmanı (`[▼]`) |
| `focusHint` | `true` | Sayfa odakta değilken konsolun son satırının üzerinde gösterilen “Klavyeyi kullanmak için sayfaya tıklayın” metni |
| `rewrites` | `[]` | Yeniden yazmalar ve proxy’ler |
| `ansi` | `{ cols: 80, rows: 24 }` | [curl ve terminal istemcileri](/docs/curl) için kare boyutu veya bu istemcilere HTML sunmak için `false` |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Komut | Açıklama |
| :-- | :-- |
| `text dev` | Fast Refresh destekli geliştirme sunucusu |
| `text build` | Üretim derlemesi |
| `text start` | Derlemeyi ve rota işleyicilerini sunma |
| `text run` | Uygulamayı terminalde render etme ([Terminal](/docs/terminal)) |
| `text mcp` | Uygulamayı kodlama ajanlarına sunma ([MCP](/docs/mcp)) |
