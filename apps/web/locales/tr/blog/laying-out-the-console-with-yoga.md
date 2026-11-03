<!-- s:e4dabd0578 -->
Her Text.js karesinin layout’unu, React Native’in kullandığı ve WebAssembly’ye derlenen flexbox motoru Yoga oluşturur. Kutular ve metin aynı Yoga ağacını paylaşır. Konsol, karakter hücrelerinden oluşan bir ızgaradır; bu nedenle üretilen her konum ve boyutun tam sayıda hücreye karşılık gelmesi gerekir.

<!-- s:9c86e1b16d -->
Bir punto bir hücre

<!-- s:9026ebff4f -->
Yoga, sonuçlarını punto ölçek faktörünün tanımladığı piksel ızgarasına yuvarlar. Faktör 2 olduğunda, Retina ekranlarda olduğu gibi, kenarlar yarım puntolara denk gelebilir. Text.js, Yoga’yı bir kez yükler ve faktörü 1 olarak ayarlar:

<!-- s:f5193c7abd -->
Faktör 1 olduğunda Yoga her kenarı tam birime yuvarlar ve Text.js bir birimi bir hücre olarak ele alır. Yoga, her kenarın mutlak konumunu yuvarlar ve boyutları yuvarlanmış kenarlardan türetir; böylece komşu kutular bir kenarı paylaşır. 81 sütunluk bir satırı iki `width="50%"` kutusuna böldüğünüzde biri 40, diğeri 41 sütun kaplar; arada boşluk veya örtüşme olmaz.

<!-- s:4f9619621a -->
Text.js, CSS varsayılanlarını kendisi uygular: tarayıcıda olduğu gibi `flexDirection` değeri `row`, `flexShrink` değeri ise `1` olur.

<!-- s:5240062c19 -->
Metin ölçümü

<!-- s:25f0052f43 -->
Metin düğümleri, ölçüm fonksiyonu olan Yoga yapraklarıdır. Yoga bu fonksiyonu kullanılabilir genişlikle çağırır ve Text.js metnin boyutunu hücre cinsinden döndürür:

<!-- s:a543588dc9 -->
Sığan metin doğal boyutunda döndürülür. Sığmayan metin kullanılabilir genişlikte satırlara bölünür ve yüksekliği satır sayısı olur. Düğüm son satır bölme sonucunu saklar; böylece aynı genişlik tekrar ölçüldüğünde metin yeniden satırlara bölünmez.

<!-- s:3c253fdc4c -->
Grafem kümelerinin ölçümü

<!-- s:7d52c4b9c9 -->
Bir dizgenin `length` değeri UTF-16 kod birimlerini sayar; bu da kaç hücre doldurduğu hakkında pek bilgi vermez. Metin önce `Intl.Segmenter` ile grafem kümelerine ayrılır; böylece ardından birleştirici aksan gelen `e` tek bir küme oluşturur, sıfır genişlikli birleştiricilerle bağlanmış bir emoji dizisi de öyle. Ardından her kümeye bir genişlik atanır:

<!-- s:f36acd4206 -->
| Metin | Hücre | Neden |
| :-- | --: | :-- |
| `abc` | 3 | Karakter başına bir hücre |
| `你好` | 4 | Doğu Asya geniş karakterleri iki hücre kaplar |
| `🚀` | 2 | Emoji gösterimi iki hücre kaplar |
| `é` (`e` + U+0301) | 1 | Birleştirici işaretler hücre kaplamaz |
| `─│┌▼←⠋` | 6 | Kutu çizimi, geometrik şekiller, oklar ve braille bir hücreye sabitlenir |

<!-- s:75d5c21868 -->
Kenarlıklar, `▼` işareti, oklar ve yükleme göstergesi kareleri her zaman bir hücre olarak ölçülür; böylece kutu kenarlığı içeriğin hizasını bozmaz.

<!-- s:cee20acd8c -->
Yazdırılabilir ASCII için bölümleme atlanır; diğer genişlikler kod noktası ve küme başına önbelleğe alınır.

<!-- s:5f37d5a215 -->
Satırlara bölme

<!-- s:b59adefd34 -->
`<Text>` bir `wrap` modu alır:

<!-- s:0ad0b36724 -->
- `wrap` (varsayılan), boşluklarda ve sözcük satırdan geniş olduğunda sözcük içinde satırı böler.
- `nowrap` tek satırı korur ve kutunun satırı kırpmasına izin verir.
- `truncate-end`, `truncate-middle` ve `truncate-start` tek satırı korur ve sığmayan kısmı `…` ile değiştirir.

<!-- s:73ec8f197a -->
Kısaltma da hücreleri sayar; bu nedenle Çince bir metin satırı karakter sınırında kesilir ve üç nokta tam olarak bir hücre kaplar.

<!-- s:1d11d6a370 -->
Uygulama

<!-- s:50e47bf264 -->
Burada 30 sütunluk bir kenar çubuğunun yanında kalan genişliği kaplayan bir panel bulunur:

<!-- s:f9394d30d6 -->
100 sütunluk bir konsolda kenar çubuğu, kenarlığı dahil 30 sütun kaplar; konuşma paneli ise kalan 70 sütunu kaplar. Kenarlık her iki tarafta birer hücre kapladığından oturum başlığı 28 hücrede kısaltılır.
