<!-- s:43751f7845 -->
Text.js, İbranice, Arapça, Farsça ve diğer sağdan sola yazıları DevTools’ta, terminallerde ve DOM aynalarında hücre ızgarasına hizalı, doğru sırada render eder. Unicode Çift Yönlü Metin Algoritmasını (UAX #9, Unicode 18.0) uygular ve resmî uyumluluk testlerinin tamamını geçer: 770.241 `BidiTest.txt` vakasının tümü (her paragraf yönünde her girdi) ve 91.707 `BidiCharacterTest.txt` vakasının tümü.

<!-- s:7c0d8f9883 -->
Yön

<!-- s:0c7b144a82 -->
Her paragraf (`<Text>` içindeki `\n` ile ayrılmış her satır), HTML’deki `dir="auto"` gibi temel yönünü ilk güçlü karakterinden belirler. Sağdan sola paragraflar varsayılan olarak sağa hizalanır.

<!-- s:c17beb4498 -->
| `align` | Soldan sağa paragraf | Sağdan sola paragraf |
| :-- | :-- | :-- |
| `"start"` (varsayılan) | sol | sağ |
| `"end"` | sağ | sol |
| `"left"` / `"center"` / `"right"` | yazıldığı gibi | yazıldığı gibi |

<!-- s:6db8fa68bb -->
İç içe bir `<Text>` üzerinde `dir`, span öğesini HTML’deki `<bdi>` gibi yalıtır: içeriği kendi başına yerleştirilir ve çevresindeki metnin sırasını değiştiremez. Kullanıcıların sağladığı adlar, başlıklar ve yönü bilinmeyen diğer metinler için bunu kullanın.

<!-- s:68088feb2d -->
Render işleyişi

<!-- s:d401630cda -->
1. **Mantıksal sırada satırlara bölme.** Satırlar, soldan sağa metinde olduğu gibi hücre genişliğine göre bölünür.
2. **Her satırı yeniden sıralama.** Algoritma tüm paragrafın gömme düzeylerini çözümler (açık gömmeler ve yalıtımlar, zayıf ve nötr türler, eşleşen parantezler), ardından bölünmüş her satır kendi başına yeniden sıralanır (L1–L2 kuralları). Parantezler ve diğer aynalanan karakterler sağdan sola düzeylerde ters çevrilir (L4), böylece İbranice içindeki `(abc)`, `(abc)` olarak kalır.
3. **Arapçayı biçimlendirme.** Harfler bağlamsal biçimlerini (yalıtılmış, başta, ortada, sonda) Arabic Presentation Forms bloklarından alır; bunlar satırın her düzey dizisi içinde mantıksal sırada hesaplanır (ZWJ ve ZWNJ bulundukları yerde hesaba katılır). Bir harf bir hücredir, birleşik biçimler her türlü span sınırında (imleç, renk değişimi) korunur ve konsolun bunları biçimlendirmesi gerekmez.
4. **Sırayı sabitleme.** Hücreler artık glifleri görüntüleme sırasında tutar. Tarayıcılar ve birçok terminal bunlara ikinci kez bidi uygulayacağından sürücüler sırayı kilitler:

<!-- s:153724c967 -->
| Çıktı | Sıranın sabitlenmesi |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Sağdan sola karakterler içeren span öğeleri `LRO … PDF` (U+202D / U+202C) içine alınır. DevTools’un `%c` temizleyicisi `direction` ve `unicode-bidi` değerlerini kaldırır. |
| Terminaller (`AnsiDriver`, `text run`) | Satır başına bidi uygulayan terminaller için sağdan sola metin içeren satırlar `LRO … PDF` içine alınır. `renderToTerminal`, girişte bir kez ECMA-48 BDSM açık moduna (`CSI 8 l`, VTE tabanlı terminallerin uyduğu mod), çıkışta ise örtük moda (`CSI 8 h`) geçer; sağdan sola metin içeren tek seferlik `renderToAnsi` kareleri `CSI 8 l` ile başlar. Hücreleri olduğu gibi üretmek için `bidi: "none"` geçirin. |
| DOM aynaları (`<ConsoleMirror>`) | Ayna `direction: ltr` kullanır (böylece RTL yönündeki bir ana sayfa onu ters çeviremez) ve sağdan sola metin içeren span öğelerine `unicode-bidi: bidi-override` uygulanır. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` ve `<Divider title>` aynı adımlardan geçer (`drawLogicalText(buffer, x, y, text, …)` herhangi bir tek satırı bu şekilde çizer), böylece etiketleri sıralı ve birleşik görüntülenir.

<!-- s:3b67946601 -->
Sağdan sola karakter içermeyen metin tüm bu işlemleri atlar. Tamamen soldan sağa bir metin modeli, grafemleri bölümlenirken algılanır (grafem başına bir karşılaştırma) ve değişmeyen yoldan çizilir; konsol kareleri bayt düzeyinde aynıdır.

<!-- s:6181d9259c -->
Bidi motorunu yükleme

<!-- s:8bd0807fa0 -->
Text.js uygulamalarında (`text dev`, `text build`), bidi motoru ve Unicode tabloları ayrı bir 10,1 kB parçadır (gzip). Bir sayfa ilk kez sağdan sola metin veya `dir="rtl"` içeren bir `<Text>` render ettiğinde indirilir, bu yüzden diğer sayfalar bu parçayı hiç yüklemez. Parça gelene kadar bu metin mantıksal sırada çizilir. Ardından konsol görüntüleme sırasına göre yeniden çizilir.

<!-- s:ed4299ea80 -->
Ön render edilmiş bir kabuğu olan `text build` uygulamaları, kabukta sağdan sola metin varsa indirmeyi kendileri başlatır. Konsolu kendiniz bağlarsanız ilk karenin görüntüleme sırasında olması için indirmeyi `createConsoleRoot()` ile birlikte başlatın. Örneğin, sağdan sola sayfalarda:

<!-- s:8ebc8c3712 -->
Parça yüklenemezse `loadBidi()` reddedilir. Bu durumda sağdan sola metin mantıksal sırada kalır.

<!-- s:7adcf6764d -->
Sunucuda render etme, `text run`, testler ve `@textjs/client` çözümleme koşulu olmayan paketler motoru içerir, bu yüzden sağdan sola metni her zaman görüntüleme sırasında çizerler ve `loadBidi()` hemen çözümlenir.

<!-- s:26ac17c25a -->
Hücre genişlikleri

<!-- s:552e751976 -->
Dağıtılan yazı tipi yığını `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace` şeklindedir. Bu yazı tiplerinin hiçbirinde İbranice veya Arapça glifler yoktur, bu nedenle tarayıcılar her karakter için yedek yazı tipine geçer. macOS’te bu, 0,6 em sabit genişlikli Courier New yazı tipidir: 12 px boyutta glif başına 7,2012 px, Menlo’da ise 7,2246 px. %0,3 daha dardır; bu, tam bir İbranice satırını yaklaşık yarım hücre kaydırmaya yeter.

<!-- s:851f84e769 -->
`CssConsoleDriver`, sağdan sola her span öğesini konsol yazı tipindeki bir canvas ile ölçer (DevTools’un kullandığı aynı Blink biçimlendirmesi ve yedek yazı tipi seçimi), ardından tam LayoutUnit (1/64 px) farkı kadar dolgu ekler. Span, kapladığı ızgara hücreleri kadar geniş olur (emoji gibi geniş bir grafem iki sayılır). Bir span en fazla yarım hücre daraltılır; böylece orantılı bir yedek yazı tipi (Windows’ta Cascadia Mono yanında Times New Roman) sonraki span öğesinin glifleriyle örtüşmesine izin vermek yerine taşar. Gerçek DevTools ön yüzünde (Chromium 151), İbranice, Arapça, karma ve İbranice içinde emoji içeren satırlar ile RTL kutu başlıklarından oluşan 64×21 kare üzerinde ölçülmüştür (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Kare | Satırlar arasında sağ kenar kayması |
| :-- | --: |
| Sabitlemeden günlüğe yazılan hücreler | 14,5 px (DevTools yeniden sıralar ve biçimlendirir) |
| Sabitlenmiş, genişlik uyarlaması yok | 2,22 px |
| Dağıtılan sürücü | 0,156 px |
| Kontrol: aynı hücreler, her RTL glifi `x` ile değiştirilmiş | 1,67 px |

<!-- s:a7ec844aae -->
Dağıtılan kare, emoji satırı dışındaki her satırda tamamen Latin karakterli kontrol karesiyle eşleşir; emoji satırında ise daha iyi sonuç verir: emojiler, çevrelerindeki sağdan sola span ile birlikte uyarlanır (0,03 px), kontrol karesinin soldan sağa emoji satırı ise uyarlanmaz (1,66 px).

<!-- s:318b8b5f4c -->
DevTools her `%c` span öğesini `contain: paint` ile çizer ve her birini ayrı ayrı cihaz piksellerine hizalar; bu nedenle iki arka planın kesirli bir konumda buluştuğu yerde aradaki piksel hiçbirine ait olmayabilir ve 1 px ince çizgi bırakabilir. Chrome ve Edge’de arka planı olan bir span, arka planını sağındaki opak komşunun altına 1 px uzatır ve uyarlanmış bir span bu pikseli dolgusuna ekler. Yukarıdaki dört karenin hiçbirinde ince çizgi görünmez.

<!-- s:7deafc8e74 -->
Uyarlamayı kapatmak için `measureText: false` geçirin veya kendi `(text, bold, italic) => px` ölçüm işlevinizi sağlayın.

<!-- s:f088ff48f9 -->
Girdi ve düzenleme

<!-- s:6aca925fed -->
`<Input>` ve `<Textarea>` mantıksal bir imleç tutar. Ok tuşları metinde depolama sırasına göre ilerler, bu nedenle sağdan sola metinde ← görsel olarak sağa hareket eder. Blok imleç, yeniden sıralama onu nereye koyarsa koysun, kapsadığı mantıksal karakterin üzerinde durur. Sağdan sola bir dizide bu, önceki karakterin solundaki hücredir. Seçim de mantıksal bir aralıktır ve bu nedenle vurgusu karma yönlü satırlarda bitişik olmayan hücreleri kapsayabilir. Tek satırlı bir `<Input>` bileşeninin yatay kaydırması mantıksal sütunu izler; bu nedenle uzun bir sağdan sola değer, imleci görünüm dışına kaydırabilir. Boşluk üzerindeki veya metnin sonundaki imleç, yalıtılmış bölünemez boşluk olarak çizilir; böylece nötr kalır ve iki yanındaki sayılarla asla birleşmez.

<!-- s:68c8d3995f -->
Sınırlamalar

<!-- s:fbb8008232 -->
- **Paragraf ayırıcıları.** Satırlar `\n` noktasında bölünür. U+2029 ve diğer paragraf ayırıcıları bir bidi paragrafını bitirir ancak yeni satır başlatmaz.
- **Sekmeler.** Sekmeler bidi çalışmadan önce boşluklara dönüştürülür; bu nedenle bölüm ayırıcısı (S) yerine boşluk (WS) olarak davranırlar.
- **Biçimlendirme.** Yalnızca sunum biçimleri olan harfler biçimlendirilir: Arapça, Farsça, Urduca ve U+FB50–U+FDFF ile U+FE70–U+FEFF aralıklarındaki diğer harfler. Lam-elif, tek glifli bir ligatür yerine iki hücrede birleşmiş iki harf olarak kalır. Süryanice, N'Ko ve diğer birleşen yazılar nominal biçimlerini korur.
- **Kopyalama.** Konsoldan kopyalanan metin mantıksal sırada değil, görüntüleme sırasındadır (`LRO`/`PDF` işaretleriyle birlikte).
- **Terminaller.** Hem BDSM hem de `LRO` işaretlerini yok sayıp kendi bidi işlemlerini uygulayan terminaller (örneğin iTerm2’de bidi etkinleştirildiğinde), sağdan sola satırları yeniden sıralayabilir.
- **DOM aynaları.** `<ConsoleMirror>` genişlikleri uyarlamaz; bu nedenle buradaki sağdan sola diziler, genişliklerinin %0,3’üne kadar kayabilir.

<!-- s:f4d4dadbf6 -->
Odak alanını çevirme

<!-- s:7791d4db4e -->
`@textjs/react/dom` paketindeki `<FocusPad>` (`<TextCanvas>` da bunu render eder), ziyaretçilere konsolu açmalarını, sayfaya tıklamalarını ve bir tuşa basmalarını söyler. Metni varsayılan olarak İngilizcedir. Çevirmek için değiştirmek istediğiniz dizelerle `messages` geçirin. Belirtmediğiniz anahtarlar, `defaultFocusPadMessages` içinde listelenen İngilizce metinlerini korur.

<!-- s:66c2b8e3e2 -->
Değer içeren bir dize, cümlenin tamamını döndüren bir işlevdir; böylece çeviri, değeri cümlenin herhangi bir yerine koyabilir. `step`, `pressShortcut`, `then`, `defaultAction` ve `shortcutOpens` birer işlevdir. `step`, adım numarasını ve adım sayısını alır. `then`, `action` prop değerini veya `action` yoksa `defaultAction` metnini alır. `defaultAction`, ilk ipucunun tuşlarını veya ipucu yoksa `null` alır. `pressShortcut`, ekran okuyucular için kısayolun tuşlarını, `shortcutOpens` ise kısayolu `<kbd>` öğeleri olarak alır.

<!-- s:e9475554da -->
`messages`, ekran okuyucuların seslendirdiği etiketleri ve konsol boyutu denetimini (`sizeControl`) de kapsar. `<TextCanvas>` aynı `messages` prop değerini alır. `<ViewportControl>` da bunu alır ve boyut denetiminin anahtarlarını kullanır. ⌘⌥J, Ctrl+Shift+J ve Enter gibi tuş etiketleri çevrilmez.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` ve `reorderIndices`, algoritmanın kendisini sunar: P1–I2, L1 ve L2 kuralları.
