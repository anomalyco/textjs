<!-- s:5b67b32177 -->
Rota işleyicisi yanıtlarını ve verileri önbelleğe alın, ardından zamanlayıcıyla veya talep üzerine yeniden doğrulayın. Arka planda tek bir yenileme çalışırken güncelliğini yitirmiş girdiler hemen sunulur.

<!-- s:be697310c8 -->
Rota işleyicileri

<!-- s:e85fc29fe2 -->
`GET` rota işleyicileri varsayılan olarak dinamiktir. Önbelleğe almayı rota segmenti yapılandırmasıyla etkinleştirin:

<!-- s:e4ccf65c67 -->
| Dışa aktarım | Davranış |
| :-- | :-- |
| *(yok)* | Her istekte çalışır |
| `dynamic = "force-static"` | Yeniden doğrulanana kadar önbelleğe alınır |
| `revalidate = N` | Önbelleğe alınır; `N` saniye sonra güncelliğini yitirir |
| `revalidate = 0` veya `dynamic = "force-dynamic"` | Her istekte çalışır |

<!-- s:274c053db6 -->
Diğer `dynamic` değerleri `TX031` hatasıyla başarısız olur. Text.js bir işleyicinin isteği ne zaman okuduğunu algılayamadığı için Next.js’in `"error"` değeri de buna dahildir.

<!-- s:0fae4045f6 -->
Önbelleğe alınan işleyicilerde her yol adı için bir girdi bulunur ve `request` derleme zamanındaki gibi görünür: sorgu dizesi, üstbilgiler, çerezler veya gövde içermez. Bunları dinamik bir işleyicide okuyun. Yalnızca `GET` ve `HEAD` önbelleğe alınır. `5xx` durumu, `Set-Cookie` üstbilgisi veya `Cache-Control: private` / `no-store` içeren yanıtlar döndürülür ancak hiçbir zaman saklanmaz.

<!-- s:b618d4732f -->
Üstbilgiler

<!-- s:c0a6cf7351 -->
Önbelleğe alınan yanıtlar şunları taşır:

<!-- s:b5f8cfecb4 -->
| Üstbilgi | Değer |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` veya `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>` veya `force-static` için `s-maxage=31536000` |

<!-- s:c1fb73c64a -->
[Ara katman](/docs/middleware) istek için çerez ayarladığında, yeniden yazma yaptığında veya istek üstbilgilerini geçersiz kıldığında, üretilen üstbilgi `private, no-cache, no-store, max-age=0, must-revalidate` olur; böylece paylaşılan önbellekler ziyaretçiye özgü bir kararı hiçbir zaman tekrar sunmaz. İşleyicinin ayarladığı `Cache-Control` üstbilgisi korunur.

<!-- s:ae27ba22c7 -->
`text dev` komutunda segment yapılandırması uygulanır ancak hiçbir şey saklanmaz; bu nedenle her istek işleyiciyi çalıştırır.

<!-- s:64841df645 -->
Veri önbelleği

<!-- s:2187e2262b -->
Herhangi bir asenkron fonksiyonu `@textjs/app/cache` paketindeki `unstable_cache` ile önbelleğe alın:

<!-- s:4c26e099ff -->
Anahtar, değere göre kodlanmış anahtar parçaları ve argümanlardan oluşur (`undefined` ve `null`, `Map`, `Set`, `Date` ve `URL` argümanları birbirinden ayrı kalır). Anahtar parçaları yoksa fonksiyonu kaynak kodu ve oluşturulduğu yer tanımlar; fonksiyon dış kapsamındaki değerleri kullandığında, örneğin her istek için veya bir döngü içinde oluşturulduğunda, anahtar parçalarını iletin. Sonuçlar JSON olarak serileştirilir; bu nedenle her çağrı yeni bir kopya döndürür (ve `Date` nesneleri dize olarak geri döner); serileştirilemeyen bir sonuç hata fırlatır. `cache(fn, { key, tags, revalidate })` aynı ayarları bir seçenekler nesnesi olarak alır.

<!-- s:608eee0e9b -->
Önbelleğe alınmış bir rota işleyicisinde veri girdileri, etiketlerini ve en kısa `revalidate` değerlerini rotaya aktarır: `"posts"` etiketini yeniden doğrulamak `/api/posts` yolunu da yeniler. `revalidate: 0` içeren bir veri çağrısı rotayı dinamik hale getirir.

<!-- s:5537f337ee -->
Yeniden doğrulama sırasında eski veriyi sunma

<!-- s:7d23e84252 -->
Bir girdinin yaşı `revalidate` değerini aştığında:

<!-- s:d4dd1966dd -->
1. Sonraki istek güncelliğini yitirmiş değeri hemen alır (`STALE`).
2. Arka planda tek bir yenileme çalışır; eşzamanlı istekler bunu paylaşır.
3. Yenileme hata fırlatırsa güncelliğini yitirmiş değer sunulmaya devam eder ve hata günlüğe kaydedilir.

<!-- s:e6db7819cc -->
Vercel ve Cloudflare’da arka plan yenilemeleri `waitUntil()` ile kaydedilir. Bir yıldan eski girdiler her zaman ön planda yeniden hesaplanır.

<!-- s:5854b096d2 -->
Talep üzerine yeniden doğrulama

<!-- s:686aa7f2f3 -->
| Çağrı | Geçersiz kıldıkları |
| :-- | :-- |
| `revalidateTag("posts")` | `posts` etiketli her şey; sonraki istekte yeniden hesaplanır |
| `revalidateTag("posts", "max")` | Güncelliğini yitirmiş olarak işaretler; yenilenirken sonraki isteğe eski değer sunulur |
| `revalidatePath("/api/feed")` | Belirtilen yol |
| `revalidatePath("/api/posts/[id]")` | Dinamik bir rotanın tüm yolları |
| `revalidatePath("/api", "layout")` | `/api` altındaki her şey |

<!-- s:b132bd50eb -->
İkisi de bir promise döndürür. Bellek içi depoda geçersiz kılma hemen gerçekleşir; [özel depo](#custom-cache-stores) asenkron olduğunda `await` ile bekleyin.

<!-- s:2aab4b4d00 -->
Özel önbellek depoları

<!-- s:7bee24a364 -->
Varsayılan depo, her sunucu örneği için bellek içi bir LRU’dur (1.000 girdi, yaklaşık 50 MB). Örnekler arasında önbellek paylaşmak için `cacheHandler` değerini, varsayılan dışa aktarımı bir `CacheStore` olan modüle yönlendirin:

<!-- s:593c57fca5 -->
Girdiler düz JSON’dur. Alternatif olarak `setCacheStore(store)` çalışma zamanında bir depo kurar.

<!-- s:fe2404de51 -->
Platform notları

<!-- s:5418a08901 -->
- Her sunucusuz örneğin (Vercel fonksiyonları, Cloudflare isolate’leri) kendi bellek içi önbelleği vardır. `Cache-Control: s-maxage`, platform CDN’inin de yanıtları önbelleğe almasını sağlar; talep üzerine yeniden doğrulama CDN önbelleğini temizlemez. `revalidateTag` her örneğe ulaşmalıysa paylaşılan bir `cacheHandler` kullanın.
- Cloudflare, `nodejs_compat` bayrağını gerektirir (önbellek `AsyncLocalStorage` kullanır). [Dağıtım](/docs/deploying) bölümüne bakın.
