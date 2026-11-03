<!-- s:5f3abb073d -->
Terminal HTTP istemcileri, HTML belgesi yerine sayfanın ilk karesini gerçek renkli ANSI metni olarak alır. Herhangi bir yapılandırma yapmanız gerekmez.

<!-- s:f501ff55e0 -->
Kare alan istekler

<!-- s:3384141bb9 -->
Şu koşulların tümü sağlandığında istek bir kare alır:

<!-- s:05a334e510 -->
- yöntem `GET` veya `HEAD` olmalıdır;
- `User-Agent`, `curl/`, `Wget/`, `wget2/`, `HTTPie/` veya `xh/` ile başlamalıdır;
- `Accept` başlığı bulunmamalı veya `text/html` içermemelidir.

<!-- s:4af297e372 -->
Tarayıcılar, tarayıcı botları ve bağlantı önizlemeleri HTML sayfasını alır. curl ile HTML almak için bunu isteyin:

<!-- s:03dba887a9 -->
Kare, sayfanın sunulacağı noktada seçilir: [ara katman](/docs/middleware), `rewrites` ve [rota işleyicilerinden](/docs/route-handlers) sonra; dosyalar veya son segmentinde nokta bulunan yollar için hiçbir zaman seçilmez. Ara katman yönlendirmeleri, `401` yanıtları, başlıklar ve yeniden yazımlar, tarayıcılarda olduğu gibi curl için de geçerlidir. `/api/health` yine kendi işleyicisini çalıştırır ve `/robots.txt` yine dosyayı sunar.

<!-- s:e0c4f5f416 -->
Karenin içeriği

<!-- s:50fa4581ec -->
Kare, [ön render edilmiş bir kabukta](/docs/server-rendering#partial-prerendering) olduğu gibi sayfanın ilk render çıktısıdır: hâlâ bekleyen her `<Suspense>` sınırı yedek içeriğini gösterir. Asenkron sunucu bileşenleri çalışmaz ve `fetch()` hiçbir zaman sonuçlanmaz; bu nedenle efektlerde yüklenen veriler yüklenme durumunda kalır.

<!-- s:08efeec61a -->
- **Boyut:** 80 × 24 hücre. Sabit viewport kullanan bir uygulama (`viewport.responsive: false`) bunun yerine `viewport.width × viewport.height` kullanır.
- **Renkler:** Uygulamanın `viewport.theme` temasında 24 bit SGR kaçış kodları. Her satır bir sıfırlama koduyla, kare ise yeni satırla biter.
- **Durum:** `200` veya eşleşen sayfa olmadığında ya da sayfa `notFound()` çağırdığında uygulamanın bulunamadı sayfasıyla birlikte `404`. Render sırasında `redirect()` çağıran bir sayfa HTML sunar.

<!-- s:1125803eb1 -->
Yanıtlar, `Vary: User-Agent, Accept` ve `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` başlıklarıyla `text/plain; charset=utf-8` biçimindedir; böylece paylaşılan önbellekler hiçbir zaman bir kareyi saklayıp tarayıcıya sunmaz. curl isteğinin kare aldığı yoldaki HTML sayfası da aynı `Vary` başlığını taşır.

<!-- s:0e2aba0a67 -->
Desteklenen ortamlar

<!-- s:d40234848f -->
| Barındırma ortamı | Statik sayfalar | Dinamik sayfalar, bilinmeyen yollar |
| :-- | :-- | :-- |
| `text dev` | İstek üzerine render | İstek üzerine render |
| `text start`, `bun` | `text build` ile ön render | İstek üzerine render |
| `vercel`, `cloudflare` | `text build` ile ön render | HTML sayfası |
| `static` | HTML sayfası | HTML sayfası |

<!-- s:11c905d6a6 -->
Sunucuda render edilen sayfalar için `text start` veya `bun` gerekir (bkz. [Dağıtım](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Statik barındırma ortamları bir istemciye diğerinden farklı yanıt veremez; bu nedenle `static` adaptörü kareleri desteklemez. Vercel ve Cloudflare’da statik sayfaların kareleri derlemeyle birlikte gönderilir. `vercel` ve `cloudflare` adaptörleri bir renderer dağıtmadığından dinamik sayfalar (`[id]`, `force-dynamic`) bu ortamlarda HTML sunar.

<!-- s:022d3d5541 -->
`text start` ve `bun dist/server.js`, kalan sayfaları istek üzerine `.text/server/live.mjs` ile render eder ve son 128 kareyi 10 saniye boyunca tutar. Her sunucu 10 saniyede en fazla 20 önbelleğe alınmamış sayfayı render eder. Bu sınır aşıldığında, bütçe yenilenene kadar curl HTML sayfasını alır. Örneğin bir sayfa modülü en üst düzeyde `window` okuduğu için sunucuda `live.mjs` yüklenemezse bu sayfalar HTML sunar.

<!-- s:2500855fbd -->
`text build`, ön render edilmiş kareleri raporlar:

<!-- s:37f210b46a -->
Yapılandırma

<!-- s:ac46338e16 -->
Uygulamanın tamamı için boyutu değiştirin veya kareleri kapatın:

<!-- s:36fb2e113c -->
Bir sayfa kendi boyutunu değiştirebilir veya terminallere de HTML sunabilir:

<!-- s:11c75396f6 -->
Boyutlar 1–500 hücre aralığıyla sınırlanır. `text.config.ts` dosyasında `ansi: false` ayarlandığında sayfa dışa aktarımları yok sayılır.

<!-- s:17ae9b44af -->
Düz HTTP

<!-- s:e9b0dd23eb -->
`-L` belirtmediğiniz sürece curl yönlendirmeleri izlemez. Vercel, `http://` isteklerini `https://` adreslerine yönlendirir; Cloudflare da **Her zaman HTTPS kullan** açıkken aynısını yapar, bu nedenle `curl http://…` kare yerine yönlendirmeyi yazdırır. `https://` URL’lerini paylaşın.

<!-- s:740b32f53f -->
Özel sunucular

<!-- s:144c78c64b -->
`@textjs/app/ansi`, `text start` veya bir adaptör çalıştırmayan sunucular ve fonksiyonlar için algılama ve yanıt yardımcılarını dışa aktarır:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)`, Web `Headers` veya Node’un `IncomingHttpHeaders` türüyle `(method, headers)` biçimini de kabul eder. `frameToAnsi(buffer, { theme })`, render edilmiş bir `CellBuffer` nesnesini çerçevenin yaptığı gibi kodlar.
