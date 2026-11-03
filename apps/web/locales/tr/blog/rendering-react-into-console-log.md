<!-- s:16c98cd381 -->
Text.js, React uygulamalarını Chrome DevTools konsolunda render eder. Gizli bir giriş alanı dışında sayfada kullanıcı arayüzü yoktur. Uygulamanın her karesi tek bir `console.log` çağrısıdır.

<!-- s:fe9cd991d4 -->
Ekran olarak konsol

<!-- s:5ae20a07fc -->
`console.log` bir biçim dizesi kabul eder. Her `%c`, sonraki argümandaki CSS’i kendisinden sonraki metne, bir sonraki `%c` ifadesine kadar uygular:

<!-- s:2822a0243c -->
Bu stiller renkleri, arka planları, kalınlığı, italik yazımı ve alt çizgiyi ayarlayabilir; konsol yazı tipi ise eş aralıklıdır (macOS’te Menlo). Eş aralıklı yazı tipi ve her karakter grubunda değişebilen renklerle konsol, stillendirilmiş karakter hücrelerinden oluşan bir ızgara işlevi görür. Üzerine kenarlıklar, paneller, giriş alanları ve grafikler çizilebilir.

<!-- s:585742694b -->
Hücre ızgarası olarak kare

<!-- s:04a12244bc -->
Render motoru her kareyi bir `CellBuffer` içinde tutar. Karakterler bir türlenmiş dizide, ön plan ve arka plan renkleri iki ayrı dizide, kalınlık ve alt çizgi gibi nitelikler ise dördüncü bir dizide bulunur. Diziler belirli bir boyut için bir kez ayrılır ve her karede yeniden kullanılır.

<!-- s:2ff86351b3 -->
Sürücü, bir kareyi günlüğe yazmak için her satırı dolaşır ve aynı stili paylaşan komşu hücreleri gruplar. Her grup bir `%c` span olur ve satırlar `\n` ile birleştirilir. 3.200 hücreden oluşan 100×32 boyutundaki test panomuz yaklaşık 200 span olarak kodlanır.

<!-- s:48a9b4f008 -->
Kare başına bir çağrı

<!-- s:aa2cafe395 -->
Her satırı ayrı bir mesaj olarak günlüğe yazmak işe yaramaz. DevTools’ta her mesajın kendi kenarlığı ve kaynak bağlantısı olur; ayrıca DevTools art arda gelen aynı mesajları bir tekrar sayacının arkasında toplar, bu yüzden bir tablonun birbirinin aynısı iki satırı tek satırda birleşir. Tek mesaj olarak günlüğe yazılan kare tek parça kalır.

<!-- s:ea38228d16 -->
Önce metindeki iki öğeye kaçış uygulanması gerekir. Düz metindeki `%`, `%%` olarak yazılır; böylece `100%` gibi metinler bir stil argümanını tüketemez. DevTools ayrıca URL’leri bağlantılara dönüştürüp kendi renkleriyle yeniden boyar; bu yüzden `://` ve `www.` içine genişliği olmayan bir word joiner (U+2060) eklenir:

<!-- s:ec8783435a -->
Boşta kalan karelerde günlük kaydı yok

<!-- s:8b7f1f9d06 -->
Tampondaki her satırın hash değeri hesaplanır. Son kareden bu yana hiçbir hash değeri değişmediyse sürücü bir dize oluşturmadan geri döner ve konsola hiç dokunmaz. Girdi bekleyen bir uygulama hiçbir çağrı yapmaz.

<!-- s:43c3523265 -->
Bir satır değiştiğinde sürücü konsolu temizler ve yeni kareyi günlüğe yazar:

<!-- s:5b584e930a -->
Yalnızca hash değeri değişen satırlar yeniden kodlanır. Diğerleri önceki karenin span öğelerini yeniden kullanır.

<!-- s:99a3c4d459 -->
Girdi

<!-- s:e95aae4719 -->
Konsol tuş vuruşlarını almaz, bu yüzden bunları sayfa toplar. Gizli bir `<textarea>`; tuşa basma, yapıştırma ve IME ile metin oluşturma girdilerini alıp uygulama için tuş olaylarına dönüştürür. Sayfaya tıklamak bu alana odaklanır.

<!-- s:88cae4fc43 -->
Sonraki adım

<!-- s:cb5f6bd294 -->
npm üzerindeki `@textjs/core` 0.0.x prototipleri her şeyi tek pakette tutar. Text.js 0.1, burada açıklanan render motorunu `@textjs/core` paketine, React uzlaştırıcısını `@textjs/react` paketine taşır ve bir App Router ekler.
