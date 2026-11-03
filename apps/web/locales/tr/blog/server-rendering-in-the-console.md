<!-- s:f0ba49aa8c -->
Text.js 0.4, bir sayfanın render edilebileceği ikinci bir yer ekledi. Varsayılan olarak, sayfanın React ağacı tarayıcı sekmesinde çalışır. `runtime = "server"` dışa aktaran bir sayfa ise sunucuda çalışır ve tarayıcı bu sayfanın karelerini alır.

<!-- s:1a12ccffbb -->
`Load`, bir `async function` bileşenidir. Sunucuda promise’i sonuçlanana kadar en yakın `<Suspense>` veya `loading.tsx` sınırında askıya alınır ve dosyaları, veritabanlarını ve `node:*` modüllerini doğrudan okuyabilir. Asenkron bileşenler veri yükler ve hook kullanamaz. Çevrelerindeki normal bileşenler, her iki çalışma zamanında da aynı davranan hook’ları, odağı, `useInput`, `<Link>` ve `useRouter()` API’lerini korur.

<!-- s:f6c454b214 -->
Tarayıcının indirdikleri

<!-- s:6764f4bb25 -->
Sunucuda render edilen bir sayfa React, Yoga veya rotalarınızı tarayıcıya göndermez. Tarayıcı, bir `CellBuffer` ve istemci render motorunun kullandığı aynı `CssConsoleDriver` sınıfını içeren, gzip ile yaklaşık 21 kB boyutunda bir kare oynatıcısı yükler. Kareleri aynı 15 fps hızında oynatır; böylece sunucuda render edilen bir kare, istemcinin üreteceğiyle aynı `console.log` çağrısını üretir.

<!-- s:c1c4090983 -->
Protokol

<!-- s:20c7e299b3 -->
Her sekme sunucuda kendi oturumunu açar: bir React kökü, bellekte tutulan bir yönlendirici geçmişi ve bir hücre arabelleği. Tek bir uç nokta her iki yöndeki trafiği taşır:

<!-- s:0cce1c98cc -->
Sunucu, bağlantının aldığı son kareden bu yana yalnızca hash değeri değişen satırları gönderir. Her satır, yalnızca sonuna ekleme yapılan bir stil tablosuna göre metin dizileri olarak gönderilir. Geniş grafemler, emoji kümeleri ve yarı saydam renkler bozulmadan ulaşır.

<!-- s:bff22f361e -->
Kareler arasında en az 66 ms vardır ve her karenin farkı, soketin en son kabul ettiği kareye göre hesaplanır. Yavaş bir bağlantı veri aktaramaz hâle geldiğinde ara durumlar atlanır ve sonraki kare en güncel duruma geçer.

<!-- s:f0809ea8c7 -->
Akış koparsa oynatıcı, oturum kimliğini `x-textjs-live` başlığında göndererek yeniden bağlanır ve durumu korunmuş aynı oturumu yeni bir anahtar kareden sürdürür. Oturum kimlikleri, URL’de değil bellekte tutulan 192 bitlik rastgele değerlerdir. Bağlantısı olmayan bir oturum render etmeyi durdurur ve 30 saniye sonra kaldırılır.

<!-- s:2c75bd5d29 -->
Her iki uç nokta da siteler arası istekleri reddeder ve her girdi olayı sabit bir şemaya göre doğrulanır. Bir oturum, POST başına en fazla 64, saniyede ise yaklaşık 240 olay kabul eder.

<!-- s:a36b73dab0 -->
Asenkron bileşenler ve veri

<!-- s:2620366315 -->
Her asenkron bileşenin promise’i, bileşen ve prop’ları anahtar olarak kullanılarak oturum başına önbelleğe alınır; böylece yeniden denenen bir render, hâlihazırda devam eden isteği tekrar kullanır. Rota değiştiğinde ve `router.refresh()` çağırdığınızda önbellek temizlenir:

<!-- s:64ce138e40 -->
Yalnızca sunucuda kullanılan modüller `*.server.ts` olarak adlandırılır. Tarayıcıya gönderilen kod bunlardan birini veya yerleşik bir `node:*` modülünü içe aktarırsa derleme başarısız olur ve içe aktaran modülün adını belirtir.

<!-- s:981308ad14 -->
Kısmi ön render

<!-- s:9142a7d770 -->
Kısmi ön render, sunucu olmadan çalışır. `text build` artık her statik rotayı bir kez render eder ve ilk karesini küçük bir klasik `<script>` olarak rotanın HTML’ine gömer; böylece herhangi bir modül yüklenmeden önce konsol çizilir.

<!-- s:d51b081ec7 -->
Kabuk, eşzamanlı olarak render edilen her şeydir. Hâlâ bekleyen bir `<Suspense>` sınırı, asenkron bileşenler de dahil olmak üzere yedek içeriğini gösterir ve kabuk render edilirken `fetch()` hiçbir zaman sonuçlanmaz.

<!-- s:33ba4145a3 -->
JavaScript başladığında istemci render motoru veya kare oynatıcısı gerçek kareyi akışla iletir. 0.4, temizlemek yerine kareleri sona da eklediğinden, hidrasyon yapan render motoru `initialClear: false` ile başlar ve kabuğun altına günlük kaydı yazar; perdesi de aynı DevTools çiziminde kabuğu görüş alanından çıkarır. Konsolu tam olarak bir kez kabuk temizler.

<!-- s:f6986897ee -->
Derleme ziyaretçinin konsol boyutunu bilemeyeceğinden kabuk, varsayılanı `120 × 36` olan yapılandırılmış `viewport` boyutunda render edilir. `viewport.responsive` açıkken ilk canlı kare, kenetlenmiş konsola göre yeniden boyutlanır. Dinamik rotalar kabuk render etmez ve `text.config.ts` dosyasındaki `ppr: false` ön render işlemini kapatır.

<!-- s:c61865edfd -->
Çalışma zamanı seçimi

<!-- s:aa5baec7ef -->
İstemci çalışma zamanı varsayılan olarak kalır. Tuş vuruşları aynı görev içinde çizilir ve uygulama herhangi bir statik barındırma hizmetine dağıtılabilir. Sunucu çalışma zamanı, özel verileri okuyan panolara ve yönetici görünümlerine, ayrıca bağımlılıklarını tarayıcı paketinde istemediğiniz rotalara uygundur. Bir uygulama her ikisini birlikte kullanabilir ve aralarında gezinmek hedef URL’yi yeni bir belge olarak yükler.

<!-- s:68f8c75df7 -->
Tam başvuru kaynağı [Sunucuda render etme](/docs/server-rendering) sayfasındadır.
