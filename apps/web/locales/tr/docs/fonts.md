<!-- s:dd02562b57 -->
`@textjs/font`, FIGfont 2 (`.flf`) dosyalarını ayrıştırır ve tam olarak `figlet` programı gibi yerleştirir. Her yazı tipi bir ES modülüdür, bu nedenle yalnızca içe aktardığınız yazı tipleri uygulamanıza dahil edilir.

<!-- s:a15d12503b -->
Kurulum

<!-- s:63bfd61a05 -->
Kullanım

<!-- s:fdffc4b786 -->
`<FigletText>` bir yazı tipi ve bir dize alır. Satırlar hücre cinsinden ölçülür, böylece harfler diğer `<Text>` bileşenleri gibi flexbox layout’larına yerleşir.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont), yerleşik `block` ve `compact` harf biçimlerini koruyarak aynı yazı tiplerini kabul eder:

<!-- s:9fc6ab3e8b -->
React dışında `renderFiglet`, her satır için bir dize döndürür:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Yatay layout, FIGlet’in bayraklarını izler.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Etki |
| :-- | :-- | :-- |
| `"default"` | `-s` | Yazı tipinin layout’u, genellikle birleştirilmiş |
| `"full"` | `-W` | Tam genişlik; karakterler asla birbirine değmez |
| `"fitted"` | `-k` | Karakter aralığı ayarı; karakterler birbirine değene kadar yaklaştırılır |
| `"smushed"` | `-S` | Sıkıştırılmış yazı tiplerinde bile yazı tipinin kurallarıyla birleştirme |
| `"universal"` | `-o` | Sonraki karakterler öncekilerin üzerine biner |
| `0`–`63` | `-m` | Açıkça belirlenen birleştirme modu |

<!-- s:d9f3601792 -->
Altı yatay birleştirme kuralının tümü uygulanır: eşit karakter, alt çizgi, hiyerarşi, karşıt çift, büyük X ve hardblank.

<!-- s:889b1e19ef -->
`verticalLayout` çok satırlı metne uygulanır. FIGlet 2.2.5 satırları asla birbirine yaklaştırmaz, bu nedenle varsayılan değer `"full"` olur; `"fitted"`, `"smushed"` ve `"universal"`, dikey çizgi süper birleştirmesi dahil beş dikey kuralı uygular, `"default"` ise yazı tipinin kurallarını kullanır.

<!-- s:d4ec30b173 -->
Satır kaydırma ve hizalama

<!-- s:f799453d05 -->
`columns` (veya `renderFiglet` işlevindeki `width`), tam olarak `figlet -w` komutunun yaptığı noktalarda, önce sözcük aralarında, ardından sözcük içinde satır kaydırır. `align`, `"left"`, `"center"` veya `"right"` değerini alır; genişlik belirtilmezse satırlar en geniş satırın içinde hizalanır. `ivrit` gibi sağdan sola yazı tipleri sağdan sola yazdırılır ve sağa hizalanır; bunu `direction` ile değiştirin.

<!-- s:f8ccfce091 -->
Pakete dahil yazı tipleri

<!-- s:15e0b8eca7 -->
| İçe aktarma | Satır | Notlar |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet’in varsayılanı |
| `@textjs/font/slant`, `smslant` | 6, 5 | İtalik |
| `@textjs/font/small` | 5 | Kompakt |
| `@textjs/font/big` | 8 | Yunanca içerir |
| `@textjs/font/banner` | 8 | `#` ile harfler, Katakana ve Kiril |
| `@textjs/font/block`, `lean` | 8 | Dış çizgili, dik ve eğik |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Düşen gölge |
| `@textjs/font/script`, `smscript` | 7, 5 | El yazısı |
| `@textjs/font/mini` | 4 | Minik |
| `@textjs/font/bubble`, `digital` | 4, 3 | Daire ve kutu içinde harfler |
| `@textjs/font/ivrit` | 6 | İbranice, sağdan sola |
| `@textjs/font/term` | 1 | Girdi olduğu gibi |

<!-- s:a8ecd7e9c1 -->
Her glif yazdırılabilir ASCII veya Latin-1 karakterlerinden oluşur, bu nedenle her alt karakter DevTools’taki Menlo yazı tipinde tam bir hücre kaplar. `@textjs/font/all`, tüm yazı tiplerini ve galeriler için `BUNDLED_FONTS` sabitini dışa aktarır. Yazı tipleri içe aktarılırken değil, ilk render sırasında ayrıştırılır.

<!-- s:74ff0f95fa -->
Özel yazı tipleri

<!-- s:093892bc6a -->
Her FIGfont çalışır. Önce getirin, ardından ayrıştırın:

<!-- s:c2f4ef471e -->
Ayrıştırıcı; başlığı, yorum satırlarını, hardblank karakterlerini, bitiş işaretlerini, gerekli 102 karakteri ve ondalık, sekizlik veya onaltılık kodla etiketlenmiş karakterleri okur. TOIlet `.tlf` yazı tipleri düz metin olarak render edilir. ASCII veya kutu çizim karakterleriyle çizilmiş yazı tiplerini tercih edin; braille ve emoji, Menlo’da bir hücre genişliğinde değildir.

<!-- s:f64649f401 -->
Lisanslama

<!-- s:adad99f0de -->
Pakete dahil yazı tipleri, FIGlet’in BSD 3-Clause lisansı altındaki FIGlet 2.2.5 dağıtım yazı tiplerinin bayt bayt aynısıdır. Her biri katkıda bulunanların bilgilerini yorum satırlarında saklar; bu bilgilere çalışma zamanında `font.comment` ile erişilebilir. Doom, Larry 3D, ANSI Shadow ve Calvin S gibi yeniden dağıtım izni olmayan popüler yazı tipleri pakete dahil değildir.

<!-- s:2a50d4cddc -->
`figlet` ile karşılaştırarak doğrulama

<!-- s:111c132fa2 -->
Test paketi, gerçek `figlet` 2.2.5 ikili dosyasından kaydedilen 273 çıktıyı yeniden üretir: her layout modunda pakete dahil her yazı tipi, satır kaydırma, iki yana yaslama, sağdan sola metin, paragraf modu ve FIGlet’in kendi regresyon girdisi. Hepsi tam olarak eşleşir.
