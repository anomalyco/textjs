<!-- s:d2d5ef69d7 -->
Bu sayfa, her Text.js sürüm serisinin ne kadar süreyle düzeltme aldığını ve nelerin uyumluluğu bozan değişiklik sayıldığını açıklar.

<!-- s:80371443b7 -->
Sürüm serileri

<!-- s:19aa9fdfd3 -->
| Durum | Aldığı güncellemeler | Süre |
| :-- | :-- | :-- |
| Aktif | Özellikler, düzeltmeler, güvenlik yamaları | Bir sonraki ana sürüme kadar |
| Bakım LTS | Kritik düzeltmeler ve güvenlik yamaları | Bir sonraki ana sürüm yayımlandıktan sonra 12 ay |
| Destek ömrü sona ermiş | Yok | — |

<!-- s:d5987f6ecf -->
Bir ana sürümün yalnızca en son alt sürümüne yama uygulanır: `1.5.0` yayımlandığında düzeltmeler `1.4.x` yerine `1.5.x` serisine eklenir. `2.0.0` yayımlandığında son `1.x` alt sürümü Bakım LTS serisi olur ve `lts` ile `v1-lts` dist-tag etiketleri altında yayımlanır.

<!-- s:6a7ba75ff1 -->
| Sürüm | Durum | Destek süresi |
| :-- | :-- | :-- |
| 1.x | Aktif | 2.0.0 yayımlandıktan sonra 12 ay |

<!-- s:d71377bf9c -->
LTS kapsamında düzeltilenler

<!-- s:043b92b499 -->
- Text.js paketlerindeki güvenlik açıkları
- Geçici çözümü olmayan çökmeler, veri kayıpları ve derleme hataları
- Konsolda render etmeyi bozan yeni Chrome, Edge, Firefox ve Safari sürümleriyle uyumluluk
- Desteklenen çalışma zamanları ve dağıtım hedefleriyle uyumluluk

<!-- s:e01d1121d2 -->
Yeni özellikler, performans çalışmaları ve kod yeniden yapılandırmaları yalnızca aktif seriye eklenir.

<!-- s:d1c69ba9bc -->
Uyumluluğu bozan değişiklikler

<!-- s:82596fcd52 -->
Aşağıdakiler, en az bir alt sürümde kullanımdan kaldırma uyarısı verildikten sonra, yalnızca bir ana sürümde değişir:

<!-- s:4ca9fd7807 -->
- `@textjs/app/server` ve `@textjs/app/cache` dahil, `@textjs/app`, `@textjs/react` ve `@textjs/core` paketlerinin dışa açık dışa aktarımları
- `text.config.ts` seçenekleri, `text` CLI komutları ve bayrakları
- `app/` içindeki dosya kuralları, `middleware.ts` ve rota segmenti yapılandırması
- Adaptör çıktı layout’ları (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
Kapsam dışında olanlar: `@textjs/core/experimental` ve `@textjs/react/experimental` altındaki her şey dahil, deneysel veya `unstable_` olarak işaretlenmiş API’ler (değişiklik günlüğünde belirtilerek bir alt sürümde değişebilirler), `@textjs/core/internal` gibi iç yapılar, `x-middleware-*` başlıkları ve `.text/` derleme meta verileri, canary sürümleri ve `console.log` biçim dizelerinin ve CSS’in tam içeriği (kareler görsel olarak aynı kalır; kodlanmaları hızlanabilir).

<!-- s:5c7d9aae9b -->
Çalışma zamanı desteği

<!-- s:30122ce1bb -->
| Çalışma zamanı | Desteklenen sürümler |
| :-- | :-- |
| Chrome / Edge DevTools | Mevcut kararlı sürüm ve önceki iki kararlı sürüm |
| Firefox ve Safari konsolları | Mevcut kararlı sürüm |
| Node.js | Aktif ve bakım LTS sürümleri (`text start`, Vercel fonksiyonları) |
| Bun | En son 1.x |
| Cloudflare Workers | `compatibility_date` 2025-01-01 veya sonrası, `nodejs_compat` |

<!-- s:509c18536b -->
Kendi destek ömrü sona ermiş bir çalışma zamanı sürümünün desteğini kaldırmak, uyumluluğu bozan bir değişiklik değildir.

<!-- s:52543dba9b -->
Güvenlik

<!-- s:2aff0514c5 -->
Güvenlik açıklarını [security@textjs.org](mailto:security@textjs.org) adresine veya [GitHub güvenlik bildirimleri](https://github.com/anomalyco/textjs/security/advisories/new) üzerinden gizli olarak bildirin. Düzeltmeler, desteklenen tüm seriler için aynı anda yayımlanır ve yamalı sürümler npm üzerinde yer aldıktan sonra güvenlik bildirimi yayımlanır.

<!-- s:b933131934 -->
Sürümlerin ve dist-tag etiketlerinin nasıl üretildiğini öğrenmek için [Sürüm kanalları](/docs/release-channels) sayfasına bakın.
