<!-- s:3c9b7877c3 -->
Text.js 0.3, FIGlet yazı tipleri için bir ayrıştırıcı ve render aracı olan `@textjs/font` paketini ekledi. FIGlet 2.2.5 dağıtımındaki 17 yazı tipini, her biri ayrı bir ES modülü olarak içerir ve çıktısı `figlet` 2.2.5 ikili dosyasının çıktısıyla birebir eşleşir.

<!-- s:ffc9f0eae5 -->
FIGlet’in tercih edilme nedeni

<!-- s:3ff2fd01df -->
`<AsciiFont>`, 0.1 sürümünden beri `block` ve `compact` adlı iki yerleşik yazı stiline sahiptir. FIGlet, 1991’den beri bu tür yazıların standardıdır ve yüzlerce `.flf` yazı tipi vardır. Bu biçimin desteklenmesi, bunlardan herhangi birinin bir konsol uygulamasına eklenebilmesi demektir.

<!-- s:7fdbff5714 -->
Bir FIGlet yazı tipi, düz metin dosyasıdır. Bir başlık satırı yüksekliği, hardblank karakterini ve layout kurallarını belirler; ardından her karakter, her satırın sonunda bir bitiş işareti bulunan bir satır bloğu olarak çizilir. FIGlet, varsayılan layout’larında her karakteri bir öncekiyle temas edene kadar sola kaydırır, ardından temas eden iki alt karakterin tek bir karakterde birleşip birleşmeyeceğine karar vermek için yazı tipinin birleştirme kurallarını kullanır.

<!-- s:4c761bba4d -->
Layout modları

<!-- s:3f1c38cf92 -->
`figlet` beş yatay layout sunar ve `renderFiglet`, aynı beş layout’u `layout` üzerinden alır:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Etki |
| :-- | :-- | :-- |
| `"default"` | `-s` | Yazı tipinin kendi layout’u, genellikle birleştirilmiş |
| `"full"` | `-W` | Tam genişlik; karakterler asla temas etmez |
| `"fitted"` | `-k` | Karakterler temas edene kadar birbirine yaklaşır |
| `"smushed"` | `-S` | Yazı tipinin kurallarıyla birleştirme |
| `"universal"` | `-o` | Sonraki karakterler öncekilerin üzerine biner |

<!-- s:7a1307992e -->
-1 ile 63 arasındaki bir sayı, ham bir `-m` layout modudur: `-1` tam genişliktir, `0` sığdırılmıştır ve `1` ile `63` arası birleştirme kurallarını seçer. Altı yatay birleştirme kuralının tamamı uygulanmıştır: eşit karakter, alt çizgi, hiyerarşi, karşıt çift, büyük X ve hardblank. Ayrıştırıcı, biçimin geri kalanını da işler: yorum satırları, onluk, sekizlik ve onaltılık tabanda kodla etiketlenmiş karakterler, eksik karakter glifi ve `ivrit` gibi sağdan sola yazı tipleri.

<!-- s:0c920c94d3 -->
Satır kaydırma da FIGlet’i izler. `width`, `figlet -w` komutunun yaptığı gibi sözcük sınırlarında, bir sözcük satırdan geniş olduğunda ise sözcük içinde satırı böler. `figlet -w 80` en fazla 79 sütun yazdırır, dolayısıyla `-w N`, `width: N - 1` değerine karşılık gelir.

<!-- s:729dda48fc -->
İkili dosyayla eşleşme

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json`, gerçek `figlet` 2.2.5 çalıştırılarak üretilmiş 273 çıktı içerir; birlikte gelen her yazı tipi her layout modunda, satır kaydırma, hizalama, sağdan sola metin, paragraf modu ve FIGlet’in kendi regresyon girdisiyle, `run-tests.sh` dosyasındaki bayraklar kullanılarak çalıştırılır. Her durum argümanları, girdiyi ve tam çıktıyı saklar; test de komut satırını tekrar seçeneklere dönüştürür:

<!-- s:d31215cb4b -->
273 çıktının tamamı eşleşir. Test verilerini yeniden üretmek için `figlet` 2.2.5 sürümünü `PATH` ortam değişkeninize ekleyin ve `bun run --cwd packages/font references` komutunu çalıştırın.

<!-- s:9854b41cbc -->
Hücre ızgarasında yazı tipleri

<!-- s:ede6764977 -->
Birlikte gelen her yazı tipi yazdırılabilir ASCII veya Latin-1 ile çizim yapar; dolayısıyla her alt karakter Menlo’da tam olarak bir hücre kaplar ve ızgaraya hizalanır. `<FigletText>`, satırlarını hücre cinsinden ölçer; böylece yazılar diğer tüm `<Text>` bileşenleri gibi bir flexbox layout’una yerleşir, `columns` ve `align` ise yazıları kutuları içinde kaydırır ve hizalar.

<!-- s:3cedd51e92 -->
Her yazı tipi ayrı bir modüldür; bu nedenle bir uygulama yalnızca içe aktardığı yazı tiplerini içerir ve yazı tipi içe aktarılırken değil, ilk render sırasında ayrıştırılır. `@textjs/font/all`, galeriler için tüm yazı tiplerini dışa aktarır.

<!-- s:9d54eeef4f -->
Diğer tüm FIGfont yazı tipleri çalışma zamanında alınıp ayrıştırılabilir:

<!-- s:f64649f401 -->
Lisanslama

<!-- s:67e882f6b4 -->
Birlikte gelen yazı tipleri, `figlet-2.2.5.tar.gz` dosyasındakilerle bayt düzeyinde aynıdır ve FIGlet’in BSD 3-Clause lisansı kapsamında dağıtılır. Her biri, katkıda bulunanlara ilişkin bilgileri `font.comment` üzerinden erişilebilen yorum satırlarında saklar. Doom, Larry 3D, ANSI Shadow ve Calvin S gibi yeniden dağıtım izni olmayan popüler yazı tipleri pakete dahil değildir.

<!-- s:ee98166722 -->
Başvuru belgelerinin tamamı [Yazı tipleri](/docs/fonts) sayfasındadır.
