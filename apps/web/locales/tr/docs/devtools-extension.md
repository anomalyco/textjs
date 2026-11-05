<!-- s:263d7e4a86 -->
Text.js DevTools uzantısı, Konsol’un yanına bir **Text.js** paneli ekler. Konsolda render edilen uygulamayı inceler.

<!-- s:becd3b25ff -->
- **Bileşenler:** her konsol kökünün React ağacı; prop’lar, hook’lar, anahtarlar ve bunların arkasındaki `tx-box` / `tx-text` sahne düğümleriyle birlikte hücreler halinde yerleştirilir.
- **Kare:** hücre ızgarası olarak geçerli kare. Hangi bileşenin boyadığını görmek için bir hücrenin üzerine gelin. Düğümü seçmek için tıklayın. Düğüm canlı konsolda vurgulanır.
- **Zaman çizelgesi:** kare başına React, layout, boyama ve kodlama süreleri, atlanan ve çıktı verilen kareler, kare zamanlaması ve `%c` span’leri.
- **Denetimler:** çıktıyı duraklatma ve sürdürme, layout tel kafesini açıp kapatma, ızgara boyutunu sabitleme veya sığdırma, kareyi metin olarak kopyalama.

<!-- s:98304b8243 -->
Kurulum

<!-- s:2452819f12 -->
Uzantı, `packages/devtools-extension` dizininden derlenir ve paketlenmemiş olarak yüklenir:

<!-- s:3754c750b3 -->
1. `chrome://extensions` adresini açın ve **Geliştirici modu** seçeneğini etkinleştirin.
2. **Paketlenmemiş öğe yükle** düğmesine tıklayın ve `packages/devtools-extension/dist` dizinini seçin.
3. Uygulamanızı yeniden yükleyin ve DevTools’u açın. Sayfa bir konsol kökü oluşturduğunda **Text.js** paneli görünür.

<!-- s:e0c59fa53a -->
Derleme ayrıca Chrome Web Store için hazır olan `release/textjs-devtools-<version>.zip` dosyasını yazar.

<!-- s:364bc3ef6f -->
Bileşenler

<!-- s:e1204a3559 -->
Bir bileşenin prop’larını, çağrı sırasına göre hook’larını (`State`, `Ref`, `Memo`, `Effect` ve diğerleri, geçerli değerleriyle) ve render ettiği sahne düğümünü hücre cinsinden konumu, boyutu ve kutu iç mesafeleriyle görmek için bileşeni seçin. Bir satırın üzerine geldiğinizde düğüm konsolda vurgulanır. **Ana makine düğümleri**, bileşenler arasındaki `tx-box` ve `tx-text` öğelerini gösterir veya gizler.

<!-- s:77b62adc9c -->
Panel açıkken ağaç, commit’lerden sonra yenilenir. Değerler, görüntüleme amaçlı özetlerdir; canlı nesneler değildir.

<!-- s:a0d819048c -->
Kare

<!-- s:2cceea6000 -->
Kare inceleyicisi, render motorunun hücre arabelleğini çizer: her glif, ön plan, arka plan ve öznitelik. Bir hücrenin üzerine geldiğinizde karakteri ve renkleri, boyama sırasına göre üzerindeki sahne düğümü (`overflow`, kaydırma ofsetleri ve `zIndex` dikkate alınarak) ve o düğümü render eden bileşenler gösterilir. Tıkladığınızda düğüm **Bileşenler** panelinde seçilir ve render motorunun kendi vurgulama katmanıyla canlı konsolda vurgulanır.

<!-- s:57a8990372 -->
Zaman çizelgesi

<!-- s:2187cf7a17 -->
Her çubuk, render motorunun bir karesidir:

<!-- s:f53def4922 -->
| Aşama | Ölçülen işlem |
| --- | --- |
| React | Kare başlangıcında tamamlanan eşzamanlı React işi |
| Layout | Yoga layout’u |
| Boyama | Sahnenin hücre arabelleğine rasterleştirilmesi |
| Kodlama | `%c` biçim dizesinin oluşturulması ve `console.log()` çağrısı |

<!-- s:9b988f3cfb -->
Atlanan kareler soluk çizilir: hiçbir şey değişmediği için günlüğe hiçbir şey yazılmamıştır. Zamanlama grafiği, çıktı verilen kareler arasındaki süreyi 66 ms minimum aralıkla karşılaştırarak gösterir.

<!-- s:8abccb04ec -->
Süreler `console.log()` çağrısında sona erer. Mesajın biçimlendirilmesi ve boyanması DevTools içinde gerçekleşir ve sayfadan gözlemlenemez; bu nedenle zaman çizelgesi bunları göstermez. Kareler arasında commit edilen eşzamanlı render’lar commit olarak sayılır, süreleri ölçülmez.

<!-- s:5ae438610c -->
Çalışma şekli

<!-- s:1dda342130 -->
React DevTools gibi, uzantı da sayfa çalışmadan önce global bir hook kurar:

<!-- s:9a7af3e89c -->
Her konsol kökü bu hook’a kaydolur. Sayfadaki ilk kök, panelle iletişim kuran kodu (gzip ile yaklaşık 5 KB) yükler ve kod geldiğinde kaydolur. Sonraki kökler oluşturulduklarında kaydolur. Uzantı olmadan hook mevcut değildir; bu nedenle kök, hook’u bir kez kontrol eder, hiçbir şey yüklemez ve kare başına hiçbir işlem yapmaz. Uzantı kurulu ancak panel kapalıyken karelerin maliyeti bir özellik okumasıdır. Ağaçlar ve kareler yalnızca panel bunları istediğinde hesaplanır.

<!-- s:843fc9a8ad -->
Mesajlar sayfa → içerik betiği → service worker → panel yönünde akar. İçerik betikleri her sayfada çalışır; böylece uygulamanız başlamadan önce hook mevcut olur. Uzantının istediği tek erişim budur. Uzak kod yüklemez ve makine dışına hiçbir şey göndermez.

<!-- s:e425f181df -->
Gizlilik

<!-- s:f2cd52a110 -->
Uzantı veri toplamaz. Ağ isteği yapmaz, hiçbir şey saklamaz ve analitik içermez. Bileşen ağaçları, kareler ve süreler yalnızca aynı tarayıcıdaki sayfa ile DevTools paneli arasında iletilir ve DevTools’u kapattığınızda silinir. **Kareyi kopyala** düğmesine tıkladığınızda karenin metni panonuza yazılır.

<!-- s:639d5ea4c0 -->
Sınırlamalar

<!-- s:05616a1196 -->
- Chrome ve Chromium tabanlı tarayıcılar, sürüm 111 veya üzeri.
- Uzantı kurulmadan önce başlatılan uygulamaların yeniden yüklenmesi gerekir.
- Bir sekmenin yalnızca en üst çerçevesi incelenir.
- Zaman çizelgesi, panel bağlandıktan sonra kareleri kaydeder.
- Süreler, tarayıcıların hassasiyetini yaklaşık 0,1 ms düzeyine düşürdüğü `performance.now()` çağrısından alınır.
