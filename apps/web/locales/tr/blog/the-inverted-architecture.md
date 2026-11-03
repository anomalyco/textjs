<!-- s:710c25737e -->
Bir DOM framework’ünde bileşenler, tarayıcının sayfada yerleştirip çizdiği DOM düğümlerine dönüşür. Text.js’te bileşenler hücrelere dönüşür ve hücrelerden oluşan her değişmiş kare, DevTools’ta bir `console.log` çağrısına dönüşür. Buna Tersine Mimari diyoruz.

<!-- s:d00a01bf6f -->
İşlem hattı

<!-- s:12c6e8f741 -->
Her aşamanın varlık nedeni, konsolun alışılmadık bir ekran olmasıdır. Eş aralıklı ve satır odaklıdır, `%c` ile biçimlendirilir ve ne zaman yeniden çizileceğine DevTools karar verir.

<!-- s:db7daa7cf2 -->
Uzlaştırıcı

<!-- s:f3cdc101e1 -->
`@textjs/react`, `tx-box` ve `tx-text` adlı iki ana öğeye ve dize alt öğeler için metin örneklerine sahip bir React 19 uzlaştırıcısıdır (`react-reconciler@0.34.0`). `<Box>` bileşeninden `<Markdown>` bileşenine kadar içe aktardığınız her şey bunların üzerine kuruludur. Commit işlemleri `requestAnimationFrame` ile zamanlanır ve bir tuşa basma ya da yapıştırma işlemi aynı görev içinde eşzamanlı olarak render edilir.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
WebAssembly’ye derlenen Yoga, ağacı `pointScaleFactor = 1` ile yerleştirir; böylece her kutu tam bir hücreye oturur. Metin, `Intl.Segmenter` ve Doğu Asya genişlik tablolarıyla ölçülür; bu nedenle `你好` dört hücre, `🚀` ise iki hücre kaplar. Bir düzenleme metin düğümünün boyutunu değiştiremiyorsa Yoga’ya yeniden başvurulmaz.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Kare, belleği bir kez ayrılan türlenmiş dizilerden oluşan bir ızgaradır: karakterler bir `Uint32Array` içinde, ön plan ve arka plan paketlenmiş `0xRRGGBBAA` biçiminde, öznitelikler ise bir `Uint16Array` bit maskesi olarak tutulur. Çizim bu dizilere yazar ve hangi satırlara dokunduğunu izler.

<!-- s:2a9b8dd7b1 -->
Geçit

<!-- s:1cdfa61881 -->
Her satırın önbelleğe alınmış 32 bitlik bir FNV-1a özeti vardır. Son kareden bu yana yazılan satırların özetleri yeniden hesaplanır. Hiçbir satır değişmediyse sürücü, bir dize oluşturmadan geri döner ve konsol çağrısı yapmaz. Gizli bir sekmedeki dönen yükleme göstergesi ilerlemediği için hiçbir maliyet oluşturmaz.

<!-- s:a36177ad5b -->
Çalışma uzunluğu kodlaması

<!-- s:c372fac68d -->
Değişen satırlar, aynı stile sahip diziler halinde yeniden taranır ve her dizi bir `%c` span’ine dönüşür. Diziler satır sonları boyunca devam eder. CSS dizeleri, tamsayı stil kimlikleriyle tekilleştirilerek saklanır; böylece sık çalışan kod yolu aynı dizeyi asla iki kez oluşturmaz. 100×32 boyutunda bir kontrol paneli 3.200 hücre ve 149 span’den oluşur.

<!-- s:922d9e42bd -->
Biçim dizesi ayrıca iki DevTools davranışına karşı koruma sağlar. Gerçek bir `%` karakteri `%%` olarak yazılır. `://` sonrasına, `www.` içine ve `path:line` içine bir word joiner yerleştirilir; böylece DevTools metninizi bağlantıya dönüştürüp kendi renkleriyle yeniden çizmez.

<!-- s:f55ed8e2b0 -->
Tek çağrı

<!-- s:b57bb25475 -->
Değişen her kare tek bir çağrıdır:

<!-- s:e3e37e3616 -->
Kareler sona eklenir, DevTools’un 50 ms’lik hız sınırlayıcısına göre zamanlanır ve tek bir çizim içinde değiştirilir. [Turbolog: parlamayı ortadan kaldırma](/blog/turbolog-eliminating-the-flash) bu kısmı ele alır.

<!-- s:99a3c4d459 -->
Girdi

<!-- s:e569f67f37 -->
Konsol tuş vuruşlarını alamaz, bu yüzden onları sayfa alır. Gizli bir `<textarea>`, tuşları, yapıştırılan içeriği ve IME ile metin oluşturmayı toplar; `wheel` olayları da `ScrollBox` bileşenlerini kaydırır. textjs.org üzerinde Playground ve OpenCode sayfaları tek bir büyük odak alanıdır. Konsolu açın, ardından yazmak için sayfaya tıklayın.

<!-- s:7db6aa160c -->
Sayfanın gördükleri

<!-- s:03e00f4b44 -->
Sayfa konsolun boyutunu okuyamaz, yalnızca kendi penceresininkini okuyabilir; bu yüzden Text.js bu boyutu çıkarır: kenara sabitlenmiş bir panel `innerWidth` veya `innerHeight` değerini küçültürken `outer*` sabit kalır ve her sabitleme varsayımı Chrome’un yakınlaştırma düzeyleri için çözülür. En iyi uyum kazanır. Sabitler (56 px yatay iç boşluk, 104 px konsol arayüzü, 14 px satır aralığı) gerçek DevTools ön yüzünde ölçülmüştür.
