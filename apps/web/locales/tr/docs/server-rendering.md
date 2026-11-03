<!-- s:5c794493de -->
Bir rotanın React ağacını sunucuda render edin ve karelerini konsola akışla gönderin. Her statik rotanın ilk karesini HTML’ine ön render edin.

<!-- s:f5f9690d9e -->
İki çalışma ortamı

<!-- s:26b5b0c1e5 -->
Her sayfa iki yerden birinde render edilir:

<!-- s:2b217df435 -->
| | İstemci (varsayılan) | Sunucu (`runtime = "server"`) |
| --- | --- | --- |
| React ağacının çalıştığı yer | Tarayıcı sekmesi | `text dev` / `text start` / `bun` adaptörü (Bun veya Node) |
| Tarayıcının indirdiği | Uygulamanın tamamı: React, Yoga WASM, rotalarınız | Kare oynatıcısı, gzip ile yaklaşık 21 kB |
| Veri erişimi | Rota işleyicilerine `fetch()` çağrısı | Doğrudan: veritabanları, dosyalar, `node:*`, gizli bilgiler |
| Asenkron bileşenler | `use()` veya efektler kullanın | `async function` bileşenleri desteklenir |
| Tuş vuruşu gecikmesi | Aynı görevde, senkron | Sunucuya bir gidiş dönüş |
| Statik barındırmada çalışır | Evet | Hayır, `text start` veya `bun dist/server.js` gerekir |

<!-- s:7b06d151a6 -->
Her iki çalışma ortamı da aynı kareleri üretir. Kare oynatıcısı hücreleri aynı `CssConsoleDriver` ile kodlar ve aynı yaklaşık 15 fps hızında ilerler; böylece sunucuda render edilen bir kare, istemcinin `console.log` çağrısıyla bayt bayt eşleşir.

<!-- s:70a0b18bdd -->
Etkinleştirme

<!-- s:660b2936b0 -->
Bir sayfadan `runtime` değerini dışa aktarın:

<!-- s:567f4b3d2b -->
`runtime`, her sayfa için statik bir dize dışa aktarımı olarak okunur (tür ek açıklaması, `as const` veya yeniden dışa aktarım uygundur; hesaplanan bir değer uygun değildir). Layout’lar, `loading.tsx`, `error.tsx` ve `not-found.tsx`, sayfaları nerede render ediliyorsa orada render edilir: istemci ve sunucu sayfalarının paylaştığı bir layout her iki yerde de çalışır ve tarayıcıya gönderilirken, yalnızca sunucu sayfaları içeren bir segmentin layout’ları ve sınırları sunucuda kalır. Hook’lar, odak, `useInput`, `<Link>` ve `useRouter()` istemcidekiyle aynı şekilde davranır.

<!-- s:43c4fa1dac -->
Çalışma ortamı seçimi

<!-- s:ac38ce3c55 -->
Şunlar için **istemci** çalışma ortamını (varsayılan) kullanın:

<!-- s:ced9e65891 -->
- Editörler ve filtreler gibi, her tuş vuruşunun aynı görevde çizilmesi gereken yoğun yazı girişli arayüzler.
- Statik barındırmaya veya CDN’e dağıtılan uygulamalar.
- Çevrimdışı çalışabilen araçlar.

<!-- s:54292284aa -->
Şunlar için **sunucu** çalışma ortamını kullanın:

<!-- s:bb8a20e6e2 -->
- Veritabanlarını, dosyaları, kuyrukları veya özel API’leri okuyan panolar ve yönetici görünümleri. Kimlik bilgileri sunucuda kalır.
- Tarayıcı paketinde bulunmasını istemediğiniz ağır bağımlılıklara (SDK’lar, ayrıştırıcılar, sözdizimi tabloları) sahip rotalar.
- Yavaş ağlarda hızlı yüklenmesi gereken sayfalar. Tarayıcı, uygulamanın tamamı yerine 21 kB (gzip) boyutundaki oynatıcıyı indirir.

<!-- s:920f4ad7e8 -->
Tek bir uygulamada farklı çalışma ortamlarını bir arada kullanabilirsiniz. Bunlar arasında gezinmek, hedef URL’yi yeni bir belge olarak yükler. Tarayıcı paketi her sunucu sayfasını bir yer tutucuyla değiştirir; böylece sunucu modülleri ve içe aktardıkları hiçbir şey istemciye gönderilmez.

<!-- s:2de98cc507 -->
Yalnızca sunucuda kullanılan modülleri `*.server.ts` olarak adlandırın. Tarayıcıya gönderilen kod (bir istemci sayfası veya istemci sayfasının kullandığı bir layout), bir `*.server.*` modülünü veya `node:*` yerleşik modülünü içe aktarırsa derleme başarısız olur ve içe aktaran dosyayı belirtir.

<!-- s:1c109f371d -->
[Ara katman](/docs/middleware), sunucu rotalarını belgeleri koruduğu gibi korur: oturum açılmadan önce, oturum içindeki her gezinmeden (`router.push`, Geri ve İleri) önce ve oturumun çerezleri veya `Authorization` değiştiğinde hedef rota için çalışır. Yönlendirme, reddetme veya yeniden yazma gerektiğinde tarayıcı bunun yerine URL’yi belge olarak yükler ve ara katman bu isteği yanıtlar.

<!-- s:44ec23073a -->
Asenkron sunucu bileşenleri

<!-- s:491e80d70d -->
Sunucuda her `async function` bileşeni, promise’i çözümlenene kadar en yakın `<Suspense>` veya `loading.tsx` sınırında askıya alınır:

<!-- s:155b6ae10f -->
Her promise oturum başına önbelleğe alınır ve bileşen ile prop’lara göre anahtarlanır; böylece yeniden denenen render, hâlihazırda devam eden isteği yeniden kullanır. Rota değiştiğinde ve `router.refresh()` çağrıldığında önbellek temizlenir. Girdiden sonra veri erişimini yeniden çalıştırmak için `router.refresh()` çağırın:

<!-- s:abfa753a7c -->
Asenkron bileşenlere iletilen prop’lar serileştirilebilir olmalıdır: dizeler, sayılar, düz nesneler, diziler, `Date`, `URL`, `Map`, `Set` ve öğeler. Fonksiyon prop’ları anahtarın parçası değildir (geri çağırımlar yerine veri iletin). Her oturum en fazla 256 promise’i önbelleğe alır. Bir bileşeni `@textjs/app/server-components` paketindeki `serverComponent(fn)` ile elle de sarabilirsiniz.

<!-- s:55cf9764ac -->
Hook’lar (`useState`, `useInput`, …) bir `async function` bileşeninin içinde çalışmaz. Etkileşim için çevresinde veya altında normal bir bileşen render edin.

<!-- s:5ae438610c -->
Çalışma biçimi

<!-- s:ec3e56dbc6 -->
- **Sekme başına bir oturum.** Her sayfa yüklemesi kendi oturumunu açar: sunucuda bir React kökü, bellekte bir yönlendirici geçmişi ve bir hücre arabelleği. Oturum kimlikleri, tarayıcının yalnızca bellekte tuttuğu 192 bitlik rastgele değerlerdir.
- **Hücre farkları.** Sunucu, bağlantının aldığı son kareden bu yana yalnızca hash değeri değişen satırları gönderir. Her satır, yalnızca sona ekleme yapılan bir stil tablosuna göre metin dizileri olarak gönderilir; geniş grafemler, emoji kümeleri ve yarı saydam renkler aynen korunur.
- **Geri basınç.** Kareler arasında en az 66 ms vardır ve her kare, soketin son kabul ettiği veriye göre karşılaştırılır. Yavaş bir bağlantıda veri akışı durduğunda ara durumlar atlanır ve sonraki kare doğrudan en güncel duruma geçer.
- **Yeniden bağlantılar.** Akış kesilirse oynatıcı, oturum kimliğini `x-textjs-live` başlığında (asla URL’de değil) göndererek yeniden bağlanır ve durumu korunmuş aynı oturuma yeni bir anahtar kareden devam eder. Kaçırılan adres çubuğu güncellemeleri yeniden uygulanır. Bağlantısı olmayan bir oturum render etmeyi durdurur ve 30 saniye sonra kaldırılır; sunucu oturumu unutmuşsa oynatıcı yeni bir oturum açar.
- **Geçmiş.** Geri ve İleri, her iki geçmişi de aynı sayıda kayıt kadar taşır; sunucudaki `router.back()` tarayıcının geçmişini de taşır.
- **Güvenlik.** Her iki uç nokta da siteler arası istekleri reddeder (`Sec-Fetch-Site` ve `Origin`; `X-Forwarded-Host` yalnızca `server.trustProxy` ile dikkate alınır). Girdi POST’ları bir JSON gövdesi ve `x-textjs-live` başlığı gerektirir. Her olay sabit bir şemaya göre doğrulanır ve gezinme hedefleri kendi origin’inizdeki yollar olmalıdır. Yalnızca `app/` manifestinizdeki sayfalar render edilebilir. Oturumlar, açılırken kullanılan çerezlere bağlanır.
- **Sınırlar.** POST başına en fazla 64 olay ve oturum başına saniyede yaklaşık 240 olay (aşılırsa `429`), gövde için 5 saniyelik zaman aşımı, istemci adresi başına 32 oturum ve süreç başına `maxSessions` (bağlantısı en uzun süredir kesik olan oturum önce çıkarılır).

<!-- s:981308ad14 -->
Kısmi ön render

<!-- s:294fed5642 -->
`text build`, her statik rotayı yapılandırılmış `viewport` boyutunda bir kez render eder ve bu ilk kareyi küçük, klasik bir `<script>` olarak rotanın HTML’ine gömer. Konsol, herhangi bir modül yüklenmeden önce çizilir:

<!-- s:7eb15c9cc8 -->
1. **Statik kabuk.** Senkron olarak render edilen her şey. Hâlâ bekleyen her `<Suspense>` sınırı, asenkron sunucu bileşenleri (kabuk render edilirken çalışmazlar), `use()` ve geç yüklenen modüller dahil olmak üzere yedek içeriğini gösterir. Kabuk render edilirken `fetch()` hiçbir zaman çözümlenmez; bu yüzden efektlerde yüklenen veriler de yüklenme durumunda kalır.
2. **Dinamik boşluklar.** JavaScript başladığında istemci render edicisi veya kare oynatıcısı gerçek kareyi akışla gönderir. Kare, kabuğun altına sona eklenir ve hidrasyon karesinin kendi perdesi, aynı DevTools çiziminde kabuğu görünümden çıkarır. Kabuk ne zaman çizildiğini kaydeder; böylece ilk hidrasyon karesi, DevTools’un yavaş yoluna girmek yerine temizleme sonrası zaman aralığının bitmesini bekler.

<!-- s:94c6827f2c -->
Yükleme sırasında konsolu yalnızca kabuk temizler. Hidrasyon yapan render edici sona ekleme modunda (`initialClear: false`) başlar; böylece hiçbir şey yanıp sönmez ve kabuk yalnızca render edildiği yolda çizilir. Dinamik rotalar (`[id]`, `force-dynamic`) kabuk render etmez.

<!-- s:1eef464bae -->
`text.config.ts` dosyasında `ppr: false` ile kapatın. Ön render, bileşenlerinizi derleme sırasında çalıştırır; bu nedenle modülün üst düzey kodunda yalnızca tarayıcıda bulunan global değerleri kullanmayın. Ön render sırasında hata fırlatan, `redirect()` / `notFound()` çağıran veya gezinen bir rotaya kabuk verilmez (hata ekranı asla HTML’e gömülmez) ve derleme bunun nedenini bildirir.

<!-- s:c50a022df3 -->
Derleme ziyaretçinin konsol boyutunu bilemediği için kabuk `viewport.width × viewport.height` boyutunda (varsayılan `120 × 36`) render edilir; hidrasyon karesi ardından gerçek konsol boyutuna uyarlanır. Kabuk, satır içi bir `<script>` öğesidir: satır içi betikleri yasaklayan bir İçerik Güvenliği Politikası kullanıyorsanız hash ile izin verin veya `ppr: false` ayarlayın.

<!-- s:ff96d35008 -->
Dağıtım

<!-- s:e8a05a5448 -->
`text build` aşağıdaki dosyaları yazar:

<!-- s:8e75669ec0 -->
| Dosya | Amaç |
| --- | --- |
| `index.html`, `<route>/index.html` | Kabuklarıyla birlikte istemci rotaları. Her statik barındırmada çalışır. |
| `assets/player-[hash].js` | Kare oynatıcısı. |
| `.text/server/live.mjs` | Sunucu rotaları, App Router ve konsol render edicisi. |
| `.text/pages/…`, `.text/live.html` | Sunucu rotalarının belgeleri. |
| `.text/ansi/…` | [curl ve diğer terminal istemcileri](/docs/curl) için ilk kareler. |

<!-- s:5782e0e345 -->
`text start` ve [`bun` adaptörü](/docs/deploying#bun) bunların tümünü sunar. Sunucu rotaları uzun ömürlü bir süreç gerektirir: `static`, `vercel` ve `cloudflare` adaptörleri derlemeyi başarısız kılar (`TX030`).
