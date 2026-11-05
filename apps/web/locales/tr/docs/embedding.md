<!-- s:7e7d3cb07e -->
`text build --embed`, uygulamanızı bir pazarlama sayfası, belge sitesi, WordPress veya Webflow sayfası ya da React 18 uygulaması gibi başka bir sitenin tek bir script etiketiyle ekleyebileceği şekilde derler. DevTools’u açan ziyaretçiler uygulamanızı konsolda görür. Diğer ziyaretçiler, sayfada bir `<text-console>` yoksa `embed.js` (gzip ile yaklaşık 3 kB) dışında hiçbir şey indirmez.

<!-- s:2aa1d07d89 -->
Gömülü uygulamalar deneyseldir. `text build --embed`, `embed` seçeneği, `<text-console>` ve `@textjs/app/experimental` dışa aktarımları bir ara sürümde değişebilir. [Uyumluluğu bozan değişiklikler](/docs/support-policy#breaking-changes) bölümüne bakın.

<!-- s:6d2aa784de -->
Bir siteye uygulama ekleme

<!-- s:f296ccaeef -->
Uygulamayı derleyin:

<!-- s:2198c52791 -->
`dist/` dizinini herhangi bir statik barındırma hizmetine veya CDN’ye yükleyin ya da sitenin `public/` klasörüne kopyalayın, ardından sitenin sayfalarına bir etiket ekleyin:

<!-- s:aa94ef1985 -->
`embed.js`, diğer dosyalarını kendi URL’sine göre yükler; bu nedenle `dist/` herhangi bir yoldan veya kaynaktan çalışır. İçinde, sitenin kendi dosyalarının yerini alabilecek `index.html` veya `404.html` olmadan, yalnızca `embed.js` ve `assets/` bulunur. [Sunucuda render edilen rotalar](#server-rendered-routes), rota işleyicileri veya middleware içeren bir uygulama, statik dosya yüklemesi yerine bir sunucu gerektirir. `vercel` ve `cloudflare` adaptörleri rota işleyicilerini ve middleware’i çalıştırır; sunucuda render edilen rotalar ise `text start` veya `bun` adaptörünü gerektirir.

<!-- s:5c139759a2 -->
Ziyaretçilere uygulamanın nerede olduğunu göstermek için sayfanın herhangi bir yerine [`<text-console>`](#text-console) ekleyin. `data-textjs-engage` içeren herhangi bir öğe de basıldığında uygulamayı başlatır:

<!-- s:6a70ec16e1 -->
Yerel olarak denemek için `text dev --embed` komutunu çalıştırın. Her istekte yeni bir ilk kareyle `/embed.js` dosyasını ve `/` yolunda (`standalone` ile `/__textjs/embed`) dosyayı başka bir sitenin yükleyeceği şekilde yükleyen bir önizleme sayfasını sunar. Başka bir yerel porttaki site de `http://localhost:3000/embed.js` dosyasını yükleyebilir.

<!-- s:37f210b46a -->
Yapılandırma

<!-- s:aa9630bf92 -->
`text build --embed`, `text.config.ts` dosyasındaki `embed: true` ile aynıdır. Varsayılanları değiştirmek için bir nesne geçirin:

<!-- s:fbe8efc9f4 -->
| Seçenek | Varsayılan | Açıklama |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | Konsolun açıldığı rota. `/` ile başlamalıdır |
| `globalName` | `"text"` | Uygulamanın başladıktan sonra konsol API’sini yerleştirdiği global ad. `false` hiçbirini yerleştirmez |
| `initialClear` | `false` | İlk kareden önce sayfanın konsolunu temizleme. Varsayılan olarak sayfanın daha önce günlüğe yazdıkları uygulamanın üzerinde kalır |
| `standalone` | `false` | `embed` olmadan `text build` komutunun yaptığı gibi uygulamanın kendi sayfalarını (`index.html`) da derleme |
| `allowOrigins` | `[]` | Sayfaları bu sunucudan sunucuda render edilen rotaları çalıştırabilen siteler. [Sunucuda render edilen rotalar](#server-rendered-routes) bölümüne bakın |
| `credentials` | `false` | Çerezleri ve `Authorization` başlığını kaldırmak yerine, `allowOrigins` kaynaklarından gelen canlı oturum istekleriyle bu sunucuya ait tarayıcı kimlik bilgilerini gönderme. Tam kaynak adresleri gerektirir |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (varsayılan 120 × 36), ilk karenin boyutudur. `title`, `hints` ve `action`, `<text-console>` öğesinin varsayılanlarıdır. Herkes `embed.js` dosyasını indirebildiği için `ppr: false` olduğunda veya `middleware.ts`, `initialPath` ile eşleşebildiğinde `embed.js` içinde ön render edilmiş ilk kare bulunmaz. Ayna, uygulama çizim yapana kadar boş kalır.

<!-- s:7ca27066c7 -->
Çalışma biçimi

<!-- s:1fe89ec57c -->
- **[Konsol kullanma niyeti](/docs/hooks-and-repl#loading-on-console-intent-experimental) oluşana kadar başka hiçbir şey yüklenmez.** `embed.js`, ön render edilmiş ilk kareyi günlüğe yazar, ardından bekler. Uygulama, DevTools kenetlendiğinde (yükleme sırasında veya sonrasında), ziyaretçi sayfada bir DevTools kısayoluna bastığında (F12, Ctrl+Shift+J, I, C veya K ya da Mac’te ⌘⌥J, I, C veya K) ya da bir `<text-console>` veya `[data-textjs-engage]` öğesine bastığında yüklenir. Bundan sonra aynı sekmedeki yeniden yüklemeler uygulamayı hemen başlatır. Ayrı bir penceredeki DevTools sayfanın boyutunu değiştirmez; bu nedenle onu menüden açan ziyaretçiler, bu öğelerden birine basana kadar ilk kareyi görür.
- **Dokunmatik ekranlarda uygulama başlamaz.** `(hover: none) and (pointer: coarse)` ile eşleşen bir cihazda `embed.js` günlüğe hiçbir şey yazmaz ve dinleyici eklemez. Yüklediği tek dosya, ayna için `<text-console>` dosyasıdır.
- **Tuşlar, ziyaretçi uygulamayla etkileşimi başlattıktan sonra uygulamaya ulaşır.** Etkileşimi başlatmak için bir `<text-console>` veya `[data-textjs-engage]` öğesine basar ya da odağı DevTools’tan geri almak için sayfaya (bağlantı, düğme veya alan dışında bir yere) tıklar. Sayfanın kendi alanlarına veya bir `[data-textjs-bypass]` öğesine yazılanlar uygulamaya asla ulaşmaz ve tekerlek her zaman sayfayı kaydırır.
- **Sayfanın URL’si, geçmişi ve başlığı asla değişmez.** Rotalar, `<Link>` ve `useRouter()` konsol içinde gezinir. İstemcide render edilen uygulamalarda mutlak URL’ler yeni bir sekmede açılır.
- **Sayfadaki bir Text.js uygulaması önceliklidir.** Başladığında, çalışan gömülü uygulama kaldırılır, tuşları okumayı bırakır ve global adını kaldırır. Başka bir uygulama konsolu kullanırken yüklenen gömülü uygulama günlüğe bir uyarı yazar ve başlamaz.
- **Gömülü uygulama kendi React 19 kopyasını paketler.** `react-dom` veya yalın içe aktarımlar içermediğinden sayfanın React sürümü, `react` için bir içe aktarma haritası ve React DevTools onu etkilemez.

<!-- s:5bd6dcbe49 -->
Dosyaların yüklenme zamanı

<!-- s:631a37c837 -->
| Dosya | Yüklenme zamanı | gzip |
| :-- | :-- | --: |
| `embed.js` | Sayfayla birlikte | 2,9 kB |
| `assets/text-console-[hash].js` | Sayfada bir `<text-console>` olduğunda | 4,0 kB |
| `assets/embed-client-[hash].js` ve `assets/yoga-[hash].wasm` | Konsol kullanma niyeti oluştuğunda | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | [Sunucuda render edilen bir rota](#server-rendered-routes) için, konsol kullanma niyeti oluştuğunda istemci yerine | 22,7 kB |
| `assets/bidi-[hash].js` | Uygulama ilk kez sağdan sola metin gösterdiğinde ([Bidi motorunu yükleme](/docs/internationalization#loading-the-bidi-engine) bölümüne bakın) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Boyutlar, 120 × 36 boyutunda kenarlıklı bir durum kutusu içindir. `text build --embed`, uygulamanızın boyutlarını yazdırır. `assets/embed-[hash].js`, `embed.js` dosyasının hiç değişmeyen bir ad altındaki kopyasıdır ([Dağıtımlar](#deploys) bölümüne bakın).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js`, `<text-console>` öğesini tanımlar ve dosyasını yalnızca sayfada bu öğe olduğunda yükler. Shadow DOM kullandığından sayfanın CSS’i içeriye ulaşmaz ve `style-src 'self'` ilkesinde değişiklik gerekmez.

<!-- s:9ceead3eca -->
Öznitelik olmadığında tek satırlık bir çubuktur. Önce tarayıcının konsolu açma kısayolunu gösterir, ardından tıklama ister, sonra uygulamaya ulaştıkça aydınlanan uygulama tuşlarını listeler. Safari’de ilk adım, Safari ayarlarında “Web geliştiricileri için özellikleri göster” seçeneğini açmanızı söyler.

<!-- s:899e0c7fe3 -->
`mirror` ile uygulamanın karesini sayfada gösterir: başka bir şey yüklenmeden önce ön render edilmiş ilk kareyi, ardından çalışan uygulamayı. Üzerine basmak uygulamayı başlatır ve ziyaretçinin tuşlarını uygulamaya gönderir; böylece uygulama DevTools kapalıyken çalışır. `chrome`, aynanın etrafına bir DevTools penceresi çizer ve `mirror` özelliğini de etkinleştirir.

<!-- s:fefcb3e495 -->
| Öznitelik | Açıklama |
| :-- | :-- |
| `mirror` | Uygulamanın karelerini gösterme |
| `chrome` | Kareleri bir DevTools penceresinde gösterme |
| `title` | Çubuğun başlığı (varsayılan: `text.config.ts` dosyasındaki `title`) |
| `hints` | `"← →:switch region, Enter:open"` biçiminde listelenecek tuşlar (varsayılan: `text.config.ts` dosyasındaki `hints`) |
| `action` | “Buraya tıklayın ve …” şeklinde gösterilen ilk yapılacak işlem (varsayılan: `text.config.ts` dosyasındaki `action` veya ilk ipucundaki tuşa basma) |

<!-- s:392012169b -->
Dokunmatik ekranlarda ayna, uygulamayı başlatmadan ilk kareyi gösterir ve çubuk gizlenir. Öğenin metni İngilizcedir.

<!-- s:13ff4ec1f4 -->
Yer ayırma

<!-- s:0f4e2c234d -->
`text build --embed`, uygulamanızın ızgarası için tek satırlık CSS yazdırır. Bunu sayfanın stil sayfasına yapıştırın. Öğenin dosyası yüklenmeden önce `<text-console>` öğesini boyutlandırır; böylece dosya geldiğinde sayfada hiçbir şey hareket etmez. Varsayılan 120 × 36 ızgara için satır şöyledir:

<!-- s:a2d2741417 -->
Çubuk 58 px yüksekliğindedir. Ayna, doğal genişliğine kadar (120 sütunda 885 px) ızgaranın en boy oranını korur ve `chrome` 43 px ekler. Boyut, yazı tiplerine bağlı değildir. `@textjs/app/experimental` paketindeki `reserveCss(cols, rows)` aynı satırı döndürür.

<!-- s:a1260c10c3 -->
Sayfanın ilk görünen bölümündeki bir ayna genellikle sayfanın en büyük öğesidir; bu nedenle sayfanın En Büyük İçerikli Boyama (LCP) değerini belirler. İlk karesi, önce `embed.js`, sonra öğenin dosyası yüklendikten sonra çizilir. Sayfanın geri kalanı, gömülü uygulama yokmuş gibi çizilir. Sayfanın daha aşağısındaki bir ayna LCP’yi etkilemez. React uygulaması gibi kendi ertelenmiş script’leri olan bir sayfada `<script type="module" async src="…">`, onları beklemeden `embed.js` dosyasını çalıştırır; böylece ilk görünen bölümdeki ayna daha erken çizilir.

<!-- s:4206a424a5 -->
Stil verme

<!-- s:834fbf40e6 -->
Bir aynayı ortalamak için satır içi kenar boşluklarını otomatik olarak ayarlayın:

<!-- s:6dde2b2766 -->
Varsayılan olarak koyudur. Açık renkler için `color-scheme: light` ayarlayın veya diğer tüm tonların karıştırılarak oluşturulduğu iki rengi belirleyin. `::part(frame)`, karenin kendisine stil verir. `chrome`, DevTools’un kendi arka planını korur.

<!-- s:f5e077273b -->
Sunucuda render edilen rotalar

<!-- s:eb293d9fb4 -->
`initialPath`, `export const runtime = "server"` içeren bir rota olduğunda `embed.js`, istemci çalışma zamanı yerine kare oynatıcısını yükler. Kareleri `embed.js` dosyasının geldiği sunucudan akışla alır; bu nedenle `text start` komutunu veya `bun` adaptörünü çalıştırın. Diğer adaptörler derlemeyi başarısız kılar. [Sunucuda render etme](/docs/server-rendering) bölümüne bakın.

<!-- s:e2bdd4dbb7 -->
Başka bir sitedeki sayfa, yalnızca kaynağı `allowOrigins` içinde olduğunda canlı oturum açabilir:

<!-- s:6ec7048857 -->
- Bir oturum yalnızca onu açan kaynağa yanıt verir.
- Varsayılan olarak Text.js, diğer sitelerden gelen oturumların çerezlerini ve `Authorization` başlığını kaldırır; bu nedenle [middleware](/docs/middleware), oturum açmamış bir ziyaretçi görür. `credentials: true` bunları korur ve tam kaynak adresleri gerektirir. Sayfa ve sunucu kaydedilebilir bir alan adını paylaştığında (`www.example.com` ve `console.example.com`) ve çerez sunucuyu kapsadığında (`Domain=example.com` veya `console.example.com` üzerinde ayarlanmış) tarayıcı bunları gönderir. Diğer sitelerden yalnızca `SameSite=None; Secure` ile ayarlanan çerezleri gönderir; üçüncü taraf çerezlerini engelleyen tarayıcılar ise hiçbirini göndermez.
- Canlı oturum, bağlanır bağlanmaz ve yeniden bağlandığında `/__textjs/live` yoluna `OPTIONS` ön kontrol istekleri gönderir. Ön kontrol istekleri çerez veya `Authorization` taşımaz; bu nedenle bu yolla eşleşen middleware, oturum açılmadan `OPTIONS` isteklerinin geçmesine izin vermelidir.
- Ters proxy veya CDN arkasında `server.trustProxy` ayarlayın ([Proxy arkasında](/docs/deploying#behind-a-proxy) bölümüne bakın). Bu ayar olmadan her ziyaretçi proxy’nin adresine sahip olur; bu nedenle hepsi istemci başına tek bir oturum sınırını paylaşır.

<!-- s:f739524722 -->
`credentials` ayarlanmadığı sürece `text dev`, `allowOrigins` olmadan herhangi bir porttaki `localhost`, `127.0.0.1` ve `[::1]` sayfalarını kabul eder.

<!-- s:d5df7bf60f -->
Barındırma

<!-- s:4bef54c1c0 -->
`text start` ile `bun`, `vercel` ve `cloudflare` adaptörleri, gömülü uygulama derlemesini bu başlıklarla sunar. `static` adaptörü bunları Cloudflare Pages ve Netlify’ın okuduğu `_headers` dosyasına yazar. Depolama kovası veya sitenin kendi `public/` klasörü gibi başka bir barındırma ortamında bunları kendiniz ayarlayın:

<!-- s:be81a4c5ec -->
| Yol | Başlıklar |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Site başka bir kaynakta olduğunda her ikisi | `Access-Control-Allow-Origin: *` ve `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Tarayıcılar modül script’lerini ve WebAssembly’yi CORS ile getirir; bu nedenle başka bir kaynaktaki dosyalar `Access-Control-Allow-Origin` gerektirir. `yoga-[hash].wasm` dosyasını `application/wasm` olarak sıkıştırılmış biçimde sunun ([WebAssembly](/docs/deploying#webassembly) bölümüne bakın).

<!-- s:1bb976fcdc -->
Dağıtımlar

<!-- s:01b888e293 -->
`embed.js` her sayfa yüklemesinde yeniden doğrulanır, böylece yeni ziyaretçiler yeni dağıtımı hemen alır. Önceki `embed.js` dosyasını yüklemiş bir sekme, ziyaretçi konsolu belki saatler sonra açtığında hâlâ önceki derlemenin dosyalarını içe aktarır. Önceki dağıtımın `assets/` dizinini çevrimiçi tutun: silerek eşitlemek yerine yeni dosyaları eskilerinin üzerine kopyalayın ve eski dosyaları bir veya iki gün sonra kaldırın. Bir derlemeyi sabitlemek için etikete o derlemenin `assets/embed-[hash].js` dosyasını koyun. O derlemenin dosyaları da çevrimiçi kalmalıdır.

<!-- s:b748b07652 -->
Dosyalar artık mevcut değilse `embed.js`, ziyaretçiden sayfayı yeniden yüklemesini isteyen bir uyarıyı konsola yazar ve kendisi uygulamayı başlatmaz veya sayfayı yeniden yüklemez.

<!-- s:fce19037b3 -->
İçerik güvenliği politikası

<!-- s:de8e30a920 -->
`embed.js` satır içi betik veya stil gerektirmez. Bunları barındıran sayfanın politikasına ekleyin; `dist/` aynı kökendeyse köken yerine `'self'` kullanın:

<!-- s:2da4077ce0 -->
| Yönerge | Değer | Kullanım |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` ve parçaları |
| `script-src` | `'wasm-unsafe-eval'` | İstemcide render edilen uygulamalarda Yoga |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm` ve sunucuda render edilen rotalar için `/__textjs/live` |
| `img-src` | `data:` | Yalnızca uygulaması `<Image>` veya `<Pixels>` çizen bir `<text-console mirror>` |

<!-- s:4ce5dcc4cb -->
Uygulamayı kendiniz yükleme

<!-- s:03e56a60b4 -->
`@textjs/app/experimental`, uygulamayı kendi yöntemiyle yükleyen sayfalar için `embed.js` dosyasını oluşturan parçaları dışa aktarır:

<!-- s:238cbf53ee -->
| Dışa aktarım | Açıklama |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | `embed.js` dosyasının çalıştırdığı işlem: ilk kareyi konsola yazar, konsol kullanım niyetini bekler, ardından `boot` işlevini çağırır |
| `bootEmbedClient(options)` | Bellek içi yönlendirme ve sayfa için koşula bağlı klavye girdisiyle istemcide render edilen bir uygulamayı başlatır |
| `bootEmbedPlayer(options)` | Sunucuda render edilen bir rota için kare oynatıcıyı başlatır |
| `createHostInput(options)` | Yukarıdaki kuralları izleyen klavye girdisi |
| `createTextConsoleMount(config)` | `<text-console>` için bir `mount(element, shell?)` işlevi döndürür |
| `reserveCss(cols, rows)` | `<text-console>` için yer ayıran CSS |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` ve `BYPASS_SELECTOR`, uygulamayı başlatan öğeler ile kendi tuşlarını koruyan öğelerin seçicileridir.
