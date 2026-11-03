<!-- s:bd59ce7974 -->
Text.js artık İbranice, Arapça, Farsça ve diğer sağdan sola yazıları doğru sırayla, Arapça harfleri birleştirerek, diğer her şeyle aynı hücre ızgarasında render ediyor.

<!-- s:4673b00c8b -->
Her paragraf, HTML’de `dir="auto"` özelliğinin yaptığı gibi temel yönünü ilk güçlü karakterinden alır ve sağdan sola paragraflar sağa hizalanır. İç içe bir `<Text>` bileşeninde `dir`, span öğesini `<bdi>` gibi yalıtır; böylece yönü bilinmeyen bir kullanıcı adı, çevresindeki metnin sırasını değiştiremez.

<!-- s:9026fc3194 -->
Algoritma

<!-- s:f13f3bb4af -->
Sağdan sola desteği, Unicode Çift Yönlü Algoritması’nın (UAX #9, Unicode 18.0) `@textjs/core` içinde sıfırdan yazılmış bir uygulamasıdır. Açık gömmeler ve yalıtımlar, zayıf ve nötr türler ve eşleşen parantezler dahil olmak üzere her paragrafın gömme düzeylerini çözümler. Ardından kaydırılmış her satır ayrı ayrı yeniden sıralanır ve aynalanan karakterler sağdan sola düzeylerde yer değiştirir; böylece İbranice içinde `(abc)`, `(abc)` olarak kalır.

<!-- s:82ed91ab82 -->
Unicode, algoritma için iki uygunluk dosyası yayımlar. İkisi de gzip ile sıkıştırılmış olarak depoya eklenmiştir ve test paketi her durumu çalıştırır:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt`, girdileri her birinin geçerli olduğu paragraf yönleriyle birlikte bidi sınıfı dizileri olarak listeler. Text.js, 770.241 durumun tamamını geçer.
- `BidiCharacterTest.txt`, gerçek dizeleri beklenen düzeyleri ve sıralarıyla listeler. Text.js, 91.707 durumun tamamını geçer.

<!-- s:3939cd5f43 -->
Mantıksal sıradan hücrelere

<!-- s:e682972504 -->
Sağdan sola bir metin satırı, konsola ulaşmadan önce dört adımdan geçer:

<!-- s:a497c14c9c -->
1. **Mantıksal sırayla satırlara bölme.** Satırlar, hücre genişliğine göre soldan sağa metinle aynı noktalarda bölünür.
2. **Her satırı yeniden sıralama.** Çözümlenen düzeyler, satırın grafemlerinin görüntülenme sırasını belirler.
3. **Arapçayı şekillendirme.** Harfler, bağlamsal biçimlerini (yalın, başta, ortada, sonda) Arabic Presentation Forms bloklarından alır. Bir harf bir hücredir ve birleşik biçimler, sözcüğün ortasındaki bir imleç veya renk değişikliğinde korunur.
4. **Sırayı sabitleme.** Hücreler artık glifleri görüntülenme sırasıyla tutar.

<!-- s:5d1156720d -->
Son adım gereklidir çünkü DevTools, metin üzerinde bidi işlemini ikinci kez çalıştırıp sırayı tekrar tersine çevirir. DevTools’un temizleyicisi `direction` ve `unicode-bidi` özelliklerini kaldırdığı için bir `%c` stili bunu kapatamaz. Bu nedenle sürücü, sağdan sola karakterler içeren her span öğesini `LRO` ve `PDF` (U+202D ve U+202C) ile çevreler; bu da hücrelerin tuttuğu içeriğin aynen soldan sağa görüntülenmesini zorunlu kılar.

<!-- s:aba313fc71 -->
Yarım hücrelik kayma

<!-- s:1109446b98 -->
Ne SF Mono ne de Menlo İbranice veya Arapça glifler içerir; bu nedenle tarayıcı her karakter için yedek yazı tipine başvurur. macOS’te bu yazı tipi, yine eş aralıklı olan Courier New’dur; 12 px boyutunda Menlo’nun 7,2246 px değerine karşılık glif başına 7,2012 px genişliğindedir. %0,3 daha dardır; bu fark, tam bir İbranice satırını yaklaşık yarım hücre kaydırmaya yeter.

<!-- s:dc26e96bdd -->
`CssConsoleDriver`, sağdan sola her span öğesini konsol yazı tipini kullanan bir canvas ile ölçer; bu canvas, DevTools ile aynı Blink yedek yazı tipi mekanizmasını kullanır ve span öğesine LayoutUnits (1/64 px) cinsinden tam fark kadar dolgu ekler. Her span, kapladığı ızgara hücreleriyle aynı genişliğe ulaşır. Bir span en fazla yarım hücre daraltılır; böylece çok daha geniş bir yedek yazı tipi, sonraki span ile örtüşmek yerine taşar.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` komutu, sonucu gerçek DevTools ön yüzünde, İbranice, Arapça, karma ve İbranice içinde emoji içeren satırlardan oluşan 64×21 boyutunda bir karede ölçer:

<!-- s:e6a33dfaa2 -->
| Kare | Satırlar arasındaki sağ kenar kayması |
| :-- | --: |
| Sabitlenmeden günlüğe yazılan hücreler | 14,5 px |
| Sabitlenmiş, genişlik uyarlaması yok | 2,22 px |
| Yayındaki sürücü | 0,156 px |
| Kontrol: her RTL glifi `x` ile değiştirilmiş | 1,67 px |

<!-- s:d03d5a84a3 -->
Kontrol, aynı karenin Latin harfli metin içeren hâlidir. Yayındaki sürücü, sağdan sola span öğelerinin içindeki emojilerin genişliği de bu öğelerle birlikte uyarlandığı için kontrolden daha iyi hizalanır.

<!-- s:d37099863b -->
Soldan sağa metnin değişmeden kalması

<!-- s:41ce31b66a -->
Sağdan sola karakter içermeyen metin, tüm bu işlemleri atlar. Kontrol, grafemler bölümlenirken grafem başına bir karşılaştırmayla yapılır ve tamamen soldan sağa olan metin öncekiyle aynı işlem yolundan çizilir; bu nedenle konsol kareleri bayt düzeyinde aynıdır.

<!-- s:a8fff567e6 -->
Sağdan sola metin desteği Text.js 1.0 ile sunulur. [Uluslararasılaştırma](/docs/internationalization), girdi, düzenleme, terminaller ve API’yi kapsar.
