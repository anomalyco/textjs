<!-- s:b2d192945b -->
Konsol, hücrelerden oluşan bir ızgaradır. Text.js, layout için React Native’in de kullandığı Flexbox motoru Yoga’yı kullanır, bu nedenle `<Box>` CSS flexbox kurallarını izler. Birimler hücre cinsindendir: `p-1`, bir sütun ve bir satır iç boşluktur.

<!-- s:029cc40e38 -->
Üst çubuk

<!-- s:4708298213 -->
Çoğu ekran bir sütundur: önce tek satırlık bir çubuk, ardından geri kalan her şey gelir. Çubuğa `h-1` ile sabit bir yükseklik verin ve `grow` ile içeriğin kalan alanı kaplamasını sağlayın.

<!-- s:5f781355bb -->
`<Spacer>` büyüyen bir kutudur: ardından gelen her şey sağ kenara itilir.

<!-- s:0c01f22e11 -->
Kenar çubuğu ve kartlar

<!-- s:7bf034d9ab -->
Sağ kenarlığı olan sabit genişlikte bir kenar çubuğu ve kalan genişliği paylaşan üç kart ekleyin. `basis-0`, `grow` ile birlikte her karta içeriğinden bağımsız olarak eşit pay verir.

<!-- s:493f8816f0 -->
Konsolda `s` ve `d` tuşlarına basın. Yoga layout’u yeniden hesaplar ve yalnızca değişen satırlar yeniden boyanır, bu nedenle kenar çubuğunu açıp kapatmanın maliyeti tek bir `console.log` çağrısıdır.

<!-- s:66bd0231a6 -->
Varsayılan olarak duyarlı

<!-- s:7d3f8e46eb -->
Izgara, kenara sabitlenmiş DevTools paneline uyum sağlar. Konsolu sürükleyerek genişletin veya yüksekliğini artırın; kartlar yeniden yerleşir. Kırılma noktalarına ihtiyaç duyduğunuzda `useBreakpoint()` geçerli olanı hücre cinsinden döndürür.
