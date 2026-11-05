<!-- s:04615ef523 -->
`text build` taşınabilir bir `dist/` üretir. Bir adaptör bunu platformun beklediği çıktıya dönüştürür.

<!-- s:087f8d3137 -->
Adaptörler

<!-- s:04908c6c09 -->
| Adaptör | Çıktı | Çalıştırma ortamı |
| :-- | :-- | :-- |
| *(yok)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Herhangi bir statik barındırma hizmeti |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
Adaptör, `TEXTJS_ADAPTER` ile de belirlenebilir. `text build` Vercel’de (`VERCEL=1`) veya Cloudflare Pages’te (`CF_PAGES=1`) çalıştığında ilgili adaptör otomatik olarak seçilir.

<!-- s:d671e1ae31 -->
Uygulamayı tek bir script etiketiyle başka bir siteye eklemek için `--embed` ile derleyin. Her adaptör bunu destekler (bkz. [Gömme](/docs/embedding)).

<!-- s:9d8df946e5 -->
Sunucu adaptörleri (`bun`, `vercel` ve `cloudflare`), `text start` ile aynı işlem hattını çalıştırır: [middleware](/docs/middleware), `rewrites`, [rota önbelleğini](/docs/caching) kullanan [rota işleyicileri](/docs/route-handlers), statik varlıklar ve ardından sayfa URL’leri için konsol belgesi. curl gibi terminal istemcileri bunun yerine sayfanın ilk karesini ANSI metni olarak alır. `vercel` ve `cloudflare` adaptörlerinde bu yalnızca statik sayfaları kapsar (bkz. [curl ve terminal istemcileri](/docs/curl)). Sunucu adaptörleri, `/assets/` altındaki hash içeren dosyaları `Cache-Control: public, max-age=31536000, immutable` ile sunar.

<!-- s:1a5ee098c6 -->
Statik

<!-- s:9ebd0d2866 -->
GitHub Pages, S3 veya CDN gibi sunucusuz barındırma hizmetleri için kullanın. `dynamic = "force-static"` veya `revalidate` içeren `GET` rota işleyicileri ön render ile dosyalara dönüştürülür: `app/api/feed.json/route.ts`, `dist/api/feed.json` olur. Derin bağlantıların konsol uygulamasını açması için `index.html` dosyasının bir kopyası `404.html` dosyasına yazılır. Statik barındırma hizmetleri curl ile tarayıcıyı ayırt edemediğinden curl HTML sayfasını alır.

<!-- s:1e90536a2a -->
Uygulama şu nedenlerle sunucu gerektiriyorsa derleme tüm nedenleri listeleyerek başarısız olur: `middleware.ts`, [sunucuda render edilen rotalar](/docs/server-rendering), dinamik rota işleyicileri, dinamik segment içeren rota işleyicileri veya `GET` dışındaki yöntemler. Bunun yerine barındırma hizmetinde `rewrites` yapılandırın.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
`bun` adaptörü, çalışma zamanında `node_modules` gerektirmeyen, kendi kendine yeterli tek bir sunucu yazar. `PORT` (varsayılan `3000`) ve `HOSTNAME` (varsayılan `0.0.0.0`) değerlerini okur; `server.js` veya `.text/` içeriğini hiçbir zaman sunmaz. Uzun ömürlü bir süreç olduğundan, `text start` gibi [sunucuda render edilen rotaları](/docs/server-rendering) (`export const runtime = "server"`) ve bunların canlı oturumlarını da barındırır. Bir konteynerde kullanın:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Veya Vercel’e bağlı bir Git deposuna gönderin: derleme `text build` komutunu çalıştırır, Vercel’i algılar ve `.vercel/output` yazar.

<!-- s:3ee6894582 -->
| Çıktı | İçerik |
| :-- | :-- |
| `static/` | İstemci derlemesi (`basePath` altında) |
| `functions/_textjs/server.func` | Akış desteğiyle tüm rota işleyicilerini sunan tek bir Node.js 22 fonksiyonu |
| `functions/_middleware.func` | Edge yönlendirme middleware’i: `middleware.ts` ve her uygulama için kanonik yollar |
| `config.json` | Varlık üstbilgileri, middleware eşleştiricileri, yeniden yazmalar, işleyici rotaları ve konsol belgesi |

<!-- s:3f3ba93b7d -->
Edge middleware, `x-middleware-next` / `x-middleware-rewrite` protokolünü kullandığından üstbilgi geçersiz kılmaları ve yeniden yazmalar, fonksiyona veya CDN’e ulaşılmadan önce Vercel’in yönlendiricisinde gerçekleşir. Tüm eşleştiriciler tek bir rota `src` desenini paylaşır. Hiçbir eşleştiricinin kapsamadığı istekler, yollarının kanonik biçimde olmama ihtimali yoksa middleware’i atlar (yüzde kaçışları, URL ayrıştırıcısının kodladığı karakterler, `//`, `.` veya `..` segmentleri, sonda eğik çizgi). Middleware ardından kanonik yolu eşleştirir, `has` / `missing` koşullarını denetler ve Vercel’in aynı şekilde yönlendirmesi için isteği bu yola yeniden yazar. `middleware.ts` içermeyen uygulamalar da aynı edge fonksiyonunu alır; bu fonksiyon yalnızca yeniden yazma yapar. Her derleme bir Edge fonksiyonu içerdiğinden oturum açılmış bir Vercel hesabından dağıtın: anonim dağıtımlar (`vercel deploy --temporary`) Edge fonksiyonlarını kabul etmez.

<!-- s:b5af065e25 -->
İşleyici fonksiyonu dahilidir. Her işleyici rotası, eşleşen yolu bu fonksiyona `x-textjs-path` istek üstbilgisinde iletir. Bu üstbilgi middleware’den önce ve sonra her istekten kaldırılır ve edge middleware, istemciden veya `middleware.ts` dosyasından gelen böyle bir üstbilgiyi hiçbir zaman iletmez; dolayısıyla bunu yalnızca işleyici rotaları ayarlayabilir. `/_textjs/*` istekleri, middleware ve yeniden yazmalardan önce ve sonra fonksiyonu çalıştırmadan `404` döndürür. Üretilen rotalar, diğer tüm barındırma hizmetlerindeki eşleştiriciler ve yeniden yazmalar gibi büyük/küçük harfe duyarlı eşleşir.

<!-- s:5e18b8a450 -->
Adaptörün testleri bu çıktıyı Vercel yönlendiricisinin yerel bir emülasyonunda çalıştırır. `src` eşleştirme, `dest` yakalamaları, üstbilgi dönüşümleri ve `status` rotalarına ilişkin davranışı gerçek dağıtımlarla karşılaştırılarak denetlenmiştir; anonim olarak dağıtılamadığı için Edge middleware denetlenmemiştir.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
Çıktı, Pages gelişmiş modunu kullanır:

<!-- s:f72ec91f11 -->
| Dosya | Amaç |
| :-- | :-- |
| `_worker.js` | Middleware, yeniden yazmalar, rota işleyicileri ve konsol belgesi. Bir rota işleyicisi Yoga kullandığında bir dizin (`index.js` ve `yoga.wasm`) |
| `_routes.json` | Her isteği worker’a gönderir. Middleware veya `basePath` yoksa `/assets/*`, Pages’in statik CDN’inde kalır |
| `_headers` | `/assets/*` için değişmez önbellekleme (sizinkinin sonuna eklenir) |
| `404.html` | Pages’in eksik dosyalar için uygulama yerine `404` yanıtı vermesini sağlar (zaten varsa korunur) |

<!-- s:9bc2b010d1 -->
Pages dizini olduğu gibi yayımladığından `.text/` (sunucu paketleri ve derleme manifestleri), `dist/` dizininden kaldırılır.

<!-- s:1200dbc88d -->
Pages projesinde (Settings → Runtime) veya `wrangler.toml` dosyasında `nodejs_compat` uyumluluk bayrağını etkinleştirin; veri önbelleği `AsyncLocalStorage` kullanır. Statik dosyalar `ASSETS` bağlaması üzerinden sunulur ve arka planda yeniden doğrulama `ctx.waitUntil()` kullanır.

<!-- s:398bcc3496 -->
Middleware kullanıldığında hash içeren varlıklar dahil her istek worker’ı çalıştırır; böylece middleware, bir dosyaya erişilebilen her yolu görür. Worker’ı çalıştıran her istek bir Functions çağrısıdır ve Workers istek kotanızdan düşülür. Bir sayfa yüklemesinde bu, belge ve getirdiği her dosya demektir (küçük bir test uygulaması için 3: belge, bir JavaScript paketi ve `yoga-[hash].wasm`; daha fazla dosyası olan uygulamalarda daha fazla). Workers Free planında günlük kota dolduğunda Pages, statik dosyaları worker olmadan sunar ve middleware atlanır. Middleware, `dist/` içindeki herhangi bir şeyi koruyorsa Settings → Runtime → Fail open / closed ayarını **Fail closed** olarak belirleyin.

<!-- s:24c3dfe433 -->
WebAssembly

<!-- s:72ec3f110c -->
Text.js uygulamaları, layout motoru Yoga’yı `assets/yoga-[hash].wasm` dosyasından yükler (72 kB, gzip ile 29 kB). `text build`, bunu her sayfada önceden yükler. Sunucu paketleri ve `text run`, `yoga-layout` içindeki satır içi kopyayı kullanır. Cloudflare worker’ı istisnadır: bir rota işleyicisi Yoga kullandığında `dist/_worker.js/` dizini, `index.js` dosyasının yanında `yoga.wasm` dosyasını barındırır.

<!-- s:0ca00aa2eb -->
- `.wasm` dosyalarını JavaScript gibi sıkıştırılmış olarak sunun. Vercel, `application/wasm` içeriğini varsayılan olarak sıkıştırır; nginx için `gzip_types` içinde `application/wasm` bulunmalıdır. Barındırma hizmetiniz JavaScript’i sıkıştırıp `.wasm` dosyalarını sıkıştırmıyorsa sayfalar, satır içi kopyaya kıyasla yaklaşık 32 kB daha fazla indirir.
- Tarayıcının dosyayı indirirken derlemesi için `Content-Type: application/wasm` gönderin. Başka bir tür kullanıldığında derleme indirmeden sonra yapılır.
- Dosyayı `assets/` içindeki diğer hash içeren dosyalar gibi önbelleğe alın (`Cache-Control: public, max-age=31536000, immutable`). İçerikle birlikte ad da değiştiği için bu güvenlidir. Hash içermeyen yollar için `immutable` kullanmayın.
- Bir İçerik Güvenliği Politikası belirliyorsanız `script-src` yönergesine `'wasm-unsafe-eval'`, `connect-src` yönergesine de dosyanın kaynağını (genellikle `'self'`) ekleyin.
- Bilinmeyen yollar `index.html` dosyasına yönlendiriliyorsa `/assets/` yolunu bu yeniden yazmanın dışında tutun. Aksi halde eksik bir dosya HTML döndürür ve `initYoga()`, `TX032` ile reddedilir.

<!-- s:55fb3b1d03 -->
Kendi Vite veya webpack derlemeniz

<!-- s:df66a10103 -->
`@textjs/core` ve `@textjs/react` paketlerini kendiniz paketlediğinizde Yoga satır içinde kalır ve paketleyici ayarı gerektirmez. Wrangler gibi `workerd` koşulunu çözümleyen paketler ise `@textjs/core/yoga.wasm` dosyasını modül olarak içe aktarır. `.wasm` dosyasını bir tarayıcı derlemesinde yüklemek için istemci derlemenize `@textjs/client` çözümleme koşulunu ekleyin. `defaultClientConditions` dışa aktarımını sağlayan Vite 6’da geliştirme ön paketleyicisi de buna ihtiyaç duyar:

<!-- s:8f580efda1 -->
Bu koşul, bidi motorunu da ayrı bir parçaya ayırır; bu parça, bir sayfa ilk kez sağdan sola metin gösterdiğinde indirilir (bkz. [Bidi motorunu yükleme](/docs/internationalization#loading-the-bidi-engine)).

<!-- s:c2349d8226 -->
Satır içi kopyayla sorunsuz çalışan sunucu, ön render ve test derlemelerine (Vitest, jsdom) bu koşulu eklemeyin.

<!-- s:600050383d -->
Yükseltme

<!-- s:e8733a2bfb -->
`@textjs/app` paketindeki güvenlik düzeltmeleri, bir dağıtıma ancak yeniden derleyip dağıttıktan sonra ulaşır:

<!-- s:c74adc728a -->
- Vercel: yeni `.vercel/output` çıktısını dağıtın.
- Cloudflare Pages: yeni `dist/` dizinini `_worker.js` ve `_routes.json` ile birlikte dağıtın.
- Bun: yeni `dist/` dizininin tamamını (`server.js`, varlıklar ve canlı paketler) dağıtın ve sunucuyu yeniden başlatın.
- `text start`: `text build` komutunu çalıştırın ve yeniden başlatın.

<!-- s:8047727085 -->
Eski dağıtımlar kendi URL’lerinde erişilebilir kalır (örneğin Vercel ve Cloudflare Pages önizleme URL’leri). Bunları silin veya platformun erişim koruması arkasına alın.

<!-- s:f5e077273b -->
Sunucuda render edilen rotalar

<!-- s:049ef31493 -->
[Sunucuda render edilen rotalar](/docs/server-rendering), açık sekme başına bir oturum tuttuğundan uzun ömürlü bir sunucu gerektirir: `text start` veya `bun` adaptörü. Bir sayfa `runtime = "server"` dışa aktardığında `static`, `vercel` ve `cloudflare` adaptörleri derlemeyi `TX030` ile başarısız kılar.

<!-- s:eb19728e6b -->
Proxy arkasında çalıştırma

<!-- s:21a17d0b45 -->
`text start`, `127.0.0.1` adresine bağlanır ve geri döngü arayüzüne bağlıyken yalnızca `localhost`, `*.localhost` ve IP adresli ana makinelere yanıt verir (DNS yeniden bağlama koruması). Diğer ana makineler `TX028` ile `403` alır. Genel erişim ayarlarını `text.config.ts` dosyasına koyun:

<!-- s:43bd5471c8 -->
`origin` veya `trustProxy` olmadan `request.url`, doğrulanmış `Host` üstbilgisinden `http` üzerinden oluşturulur.

<!-- s:689cebe287 -->
Dikkat edilecek noktalar

<!-- s:f45e3fb003 -->
- `text.config.ts` dosyasındaki `proxy` yalnızca `text dev` ve `text start` ile çalışır; adaptörler bunu içermez. Her sunucu adaptörünün desteklediği `rewrites` kullanın.
- Her sunucusuz örneğin kendi bellek içi önbelleği vardır. Bkz. [Önbellekleme](/docs/caching#platform-notes).
- Ham düzenli ifade grupları kullanan `rewrites`, mümkün olduğu ölçüde Vercel rotalarına dönüştürülür; adlandırılmış parametreler (`:slug`, `:path*`) tam olarak dönüştürülür.
