<!-- s:88013af27d -->
Middleware, bir istek tamamlanmadan önce kod çalıştırır. Yönlendirme yapabilir, yolu yeniden yazabilir, başlıkları ve çerezleri ayarlayabilir veya kendisi bir yanıt döndürebilir.

<!-- s:895d99d1b5 -->
Dosya düzeni

<!-- s:9e6d75b727 -->
Proje kökünde (veya `src/` içinde), `app/` dizininin yanında `middleware.ts` oluşturun. Bir `middleware` fonksiyonunu (veya varsayılan bir dışa aktarımı) ve isteğe bağlı bir `config` dışa aktarın.

<!-- s:a4d39cdaaf -->
Middleware, `text dev`, `text start` ve her sunucu [dağıtım adaptöründe](/docs/deploying) [rota işleyicilerinden](/docs/route-handlers), statik dosyalardan ve konsol sayfalarından önce çalışır. Web `Request` ve `Response` API’lerini kullanır; böylece aynı dosya Node, Bun, Vercel Edge ve Cloudflare Workers üzerinde çalışır.

<!-- s:dda0880da2 -->
Yolları eşleştirme

<!-- s:1e1ec8c339 -->
`config.matcher` olmadığında middleware her istek için çalışır. Eşleştiriciler Next.js ile aynı sözdizimini kullanır:

<!-- s:473d472bc8 -->
| Eşleştirici | Eşleşen yollar |
| :-- | :-- |
| `/about` | `/about` ve `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, ancak `/a` eşleşmez |
| `/user/:id(\\d+)` | `/user/42`, ancak `/user/ada` eşleşmez |
| `/((?!api/).*)` | `/api/*` dışındaki her şey |

<!-- s:256aeeefbc -->
`has` ve `missing` ile koşullar ekleyin (başlık, çerez, sorgu veya ana makine):

<!-- s:d756420343 -->
Eşleştiriciler, `basePath` olmadan yol adına uygulanır. `text dev` çalışırken Vite’ın kendi modül istekleri (`/@vite/*`, kaynak dosyalar) hiçbir zaman middleware çalıştırmaz.

<!-- s:75cd7297e6 -->
Her barındırma ortamı, middleware çalışmadan önce tek bir standart yol adı belirler ve bunu eşleştirme, `request.nextUrl` ve rota, işleyici ve dosya araması için kullanır. Yüzde kodlamaları çözülür ve yol, `new URL()` nasıl yazıyorsa o şekilde yeniden kodlanır; `.` ve `..` bölümleri çözümlenir, yinelenen ve sondaki eğik çizgiler kaldırılır. `/ad%6din//users/`, middleware’e `/admin/users` olarak ulaşırken `/café`, `/caf%C3%A9` olarak kalır. `/admin/` gibi sonunda eğik çizgi olan bir eşleştirici, `/admin` ile eşleşir. Yolunda kodlanmış eğik çizgi veya ters eğik çizgi (`%2F`, `%5C`), kontrol karakteri veya geçersiz yüzde kodlaması bulunan istekler `400` alır. Rotalar büyük/küçük harfe duyarlıdır: `/Admin`, `/admin` ile eşleşmez ve statik dosyalar yalnızca tam adlarıyla sunulur.

<!-- s:3f5746eb4e -->
Dosyanın adının yanı sıra sunulduğu URL’leri de eşleştirin. Cloudflare Pages, `report.html` dosyasını `/report` adresinde de sunar; bu nedenle `/report.html` için bir eşleştirici `/report` adresini korumaz. İkisini de `matcher: ["/report", "/report.html"]` şeklinde listeleyin veya korunan dosyaları bir dizinde tutup bu dizini eşleştirin; örneğin `public/reports/` içindeki dosyalar için `/reports/:path*` kullanın.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Etki |
| :-- | :-- |
| `NextResponse.next()` | Rotaya devam etme |
| `NextResponse.redirect(url, status?)` | Varsayılan olarak `307`; `url` mutlak olmalıdır |
| `NextResponse.rewrite(url)` | Başka bir yolu sunma; harici kaynaklara proxy üzerinden erişilir |
| `NextResponse.json(body, init?)` | JSON ile yanıt verme |
| `new Response(...)` | Herhangi bir içerikle yanıt verme |

<!-- s:a8292924c3 -->
Değişiklik yapmadan devam etmek için hiçbir şey döndürmeyin. `next()` ve `rewrite()`, nihai yanıtın durumunu değiştirmek için `{ status }` kabul eder. Yalnızca `NextResponse.next()` / `NextResponse.rewrite()` ile oluşturulan yanıtlar rota seçimini yönlendirir: `fetch()` çağrısından dönenler dahil diğer tüm `Response` nesneleri, `x-middleware-*` başlıkları kaldırılarak istemciye olduğu gibi gönderilir.

<!-- s:583e778785 -->
`request.nextUrl`, `pathname` içinden `basePath` değerini çıkarır; ancak `href` ve `toString()` bu değeri içerir. Uygulama içinde kalmak için bunu klonlayın: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Başlıklar

<!-- s:37748fa2c3 -->
Sonraki işleyicilerin aldıklarını değiştirmek için `request.headers`, yanıt başlıkları eklemek için `headers` geçirin:

<!-- s:60bf4677c2 -->
Rota işleyicisi aynı başlığı ayarlamadığı sürece middleware’den gelen yanıt başlıkları nihai yanıta eklenir.

<!-- s:ef657b8fe3 -->
Çerezler

<!-- s:5d3635224b -->
`request.cookies`, `Cookie` başlığını okur; `response.cookies`, `Set-Cookie` başlığını yazar.

<!-- s:4a7b6bbf62 -->
`next()` veya `rewrite()` yanıtında ayarlanan çerezler, aynı istekte rota işleyicisi tarafından da görülebilir.

<!-- s:a65a1ce099 -->
Arka plan işlemleri

<!-- s:de593dc070 -->
İkinci argüman, yanıt gönderildikten sonra sunucusuz çalışma ortamlarını açık tutan `waitUntil()` metodunu içerir:

<!-- s:63e13e87b3 -->
Notlar

<!-- s:971c06c875 -->
- İstemcide render edilen sayfalar tarayıcıda render edilir; bu nedenle başka bir sayfaya yeniden yazma, konsol uygulamasının render ettiği rotayı değil, sunulan dosyayı değiştirir. Rota işleyicilerine, statik dosyalara ve harici kaynaklara yeniden yazmalar beklendiği gibi davranır.
- Middleware istek gövdesini okuyabilir; rota işleyicileri gövdeyi almaya devam eder. Bir eşleştiricinin hariç tuttuğu isteklerin gövdesine hiçbir zaman dokunulmaz.
- `request.url` her zaman sunucunun kaynağını içerir: `//other.host/x` gibi istek hedefleri, başında tek bir eğik çizgi olacak şekilde normalleştirilir.
- [Statik adaptör](/docs/deploying#static) middleware çalıştıramaz.
