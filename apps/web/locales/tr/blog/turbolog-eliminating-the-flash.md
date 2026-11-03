<!-- s:fe58dc6ae4 -->
Her Text.js karesi bir `console.log` çağrısıdır. 0.4 sürümüne kadar her kareden önce bir de `console.clear()` çağrısı vardı. Yük altında konsol, kareler arasında kısa süreliğine boş görünüyordu.

<!-- s:7a82fe5fe2 -->
Yanıp sönmeyi ölçme

<!-- s:1d16f5a106 -->
Bunu ölçmek için `bench/devtools` aracını geliştirdik. Chrome for Testing’i başlatır, gerçek DevTools arayüzünü bir sayfa olarak açar ve ölçüm için izler:

<!-- s:4da6ef7009 -->
- DevTools arayüzündeki her `requestAnimationFrame` çağrısında, konsolun görünüm alanında 32 satırlık tam bir kare olup olmadığını kontrol eder. Böyle bir kare içermeyen çizimler boş çizim sayılır.
- Sonucu piksel düzeyinde doğrulamak için daha sonra `Page.startScreencast` karelerinin kodunu çözer.
- Her kare, 0 numaralı satırda `FRAME:<id> · T:<epochMs>` taşır; böylece arayüz hangi kareyi gösterdiğini ve ne kadar geciktiğini belirleyebilir.

<!-- s:cb3c553c37 -->
Her kareden önce `console.clear()` çağrıldığında, 15 fps hızındaki 100×32 boyutlu bir gösterge paneli DevTools çizimlerinin **%70,6** kadarında boştu. 60 fps hızında bu oran **%81,1** idi.

<!-- s:7076ddd27d -->
Nedeni

<!-- s:1e65554dc0 -->
DevTools’un `ConsoleView` bileşeni iki çağrıyı farklı işler:

<!-- s:56484b5ac3 -->
1. `console.clear()`, görünüm alanını **eşzamanlı olarak** geçersiz kılan `consoleCleared()` çağrısını yapar. Her mesaj aynı görev içinde kaybolur.
2. `console.log()`, yalnızca **50 ms** zaman aşımına sahip bir `Throttler` olan `viewportThrottler` üzerinden yenileme planlayan `addConsoleMessage()` çağrısını yapar.

<!-- s:8a656fe37a -->
Böylece her kare eski kareyi hemen kaldırır, yenisini ise daha sonra çizer. 15 fps hızında her 66 ms’nin yaklaşık 50 ms’sinde hiçbir şey görünmez.

<!-- s:8bb24ac9a4 -->
Kareleri sona ekleme

<!-- s:1092cc0920 -->
0.4 sürümünden beri Turbolog kareleri sona ekliyor. DevTools konsolun en altında kalır, böylece yeni kare tek bir çizim içinde eskisinin yerini alır. Başta yer alan, `margin-top:100vh` stiline sahip sıfır genişlikli bir span (perde), önceki kareleri görünümün dışına iter ve kendi satırını sonlandırır; böylece DevTools kaynak bağlantısı 0 numaralı satırı hiçbir zaman daraltmaz.

<!-- s:6e8cb684de -->
Konsolun yine de eninde sonunda boşaltılması gerekir. Temizleme yalnızca ilk karede, `invalidate()` sonrasında, 100 kare biriktiğinde boşta ve kesin üst sınır olan 300 kareye ulaşıldığında gerçekleşir.

<!-- s:58637d56ab -->
Hızı sınırlayıcıya uyarlama

<!-- s:14c65af87d -->
DevTools’un çizebileceğinden daha hızlı kare göndermek hiçbir şeyi hızlandırmaz. Sınırlayıcı beklerken gelen bir günlük kaydı onu yeniden başlatır, bu yüzden kareler atlanır: 60 fps hızında DevTools, gönderilen 295 karenin 67 tanesini çizdi. Turbolog kareler arasında en az **66 ms** bırakır, yani yaklaşık 15 fps hızında çalışır ve aralık izin verdiğinde ayrık girdileri eşzamanlı olarak render etmeye devam eder.

<!-- s:8a90fd55c3 -->
Faz kilidini kırma

<!-- s:e96505e7a5 -->
Temizleme işlemleri, sonraki her kareye yaklaşık 50 ms gecikme de ekliyordu. Temizlemeden sonra DevTools sentetik bir `Console was cleared` satırı ekler. Bu satır sınırlayıcının anında işlem yuvasını alır ve sonraki kareyi 50 ms’lik zamanlayıcıya iter; sabit 66 ms aralıklarla gelen sonraki her kare bu zamanlayıcıya kilitli kalır.

<!-- s:57527b9818 -->
Render motoru artık her temizlemeden sonra bir kez **110 ms** bekliyor. Bundan sonra her kare, önceki yenilemenin tamamlanmasından 50 ms’den fazla süre sonra gelir ve DevTools’un anında işleme yolunu kullanır. Ortanca görüntüleme gecikmesi **63 ms’den 10,4 ms’ye** düştü.

<!-- s:003645d0bf -->
Sonuçlar

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, 100×32 boyutlu gösterge paneli, gerçek DevTools arayüzü:

<!-- s:9ee75054af -->
| Sürücü | FPS | Boş çizimler | Çizilen / gönderilen | Gecikme p50 |
| :-- | --: | --: | --: | --: |
| Her karede temizleme | 15 | %70,6 | 70 / 75 | 60,4 ms |
| **Sona ekleme (1.0)** | **15** | **%1,0** | **74 / 75** | **10,4 ms** |
| Her karede temizleme | 60 | %81,1 | 45 / 300 | 9,8 ms |
| Sona ekleme, hız ayarsız | 60 | %0,8 | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Kalan %1, konsolu bilerek temizleyen ilk karedir. Bu karenin boş çizimlerinde boş bir konsol yerine `Console was cleared` satırı vardır.

<!-- s:315471c65a -->
Span başına daha az özellik

<!-- s:e210e7e85d -->
DevTools’un kaynak kodu bir maliyet daha ortaya koydu. Bir `%c` stilinin her *uzun yazımlı özelliğini* her satır sarmalayıcısına kopyalar; bu yüzden `font:` ve `margin:` kısa yazımları span başına yaklaşık 33 özelliğe genişliyordu. Span’ler artık onaltılık renklerle, her biri yaklaşık 7 tane olmak üzere yalnızca uzun yazımlı özellikleri kullanıyor.

<!-- s:5b341c4930 -->
Sona ekleme modu Text.js 0.4 ile yayımlandı ve faz kilidi düzeltmesi 1.0 ile geliyor. İkisi de uygulama kodunda değişiklik gerektirmiyor.
