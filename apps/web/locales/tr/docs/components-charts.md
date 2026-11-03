<!-- s:8f99ab8d5a -->
Grafikler blok öğelerle çizilir. Çubuklar hücre başına sekiz seviye, çizgiler ise hücre başına 2×2 noktalı bir ızgara kullanır.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Y ekseni ve açıklama içeren nokta matrisli çizgi grafikleri.

<!-- s:977778a73f -->
| Prop | Açıklama |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Tek seri için kısa kullanım |
| `height` | Satır sayısı (varsayılan `8`) |
| `min` / `max` | Sabit sınırlar (varsayılan: veriler) |
| `axis` | Min / max etiketli Y ekseni |
| `formatValue` | Eksen etiketleri (varsayılan `1.2k`) |
| `marker` | `quadrant` (varsayılan) veya `braille` |

<!-- s:3827b070cb -->
`braille` hücre başına 2×4 nokta sığdırır. Bunu terminallerde kullanın: macOS’ta DevTools konsolunun yazı tipi olan Menlo’da braille yoktur ve yedek glifler bir hücreden daha geniştir.

<!-- s:a1d8752203 -->
Seri renkleri varsayılan olarak `accent`, `success`, `warning`, `info` ve `danger` değerlerini kullanır.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Etiketleri ve değerleri hizalanmış, hücrenin sekizde biri hassasiyetinde yatay çubuklar.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Genişliğini en son noktalarla doldurur. `height` değeri `1` üzerinde olduğunda dolu bir alan render eder.

<!-- s:9b515e6ed1 -->
`sparkline(values)` aynı sparkline’ı bir dize olarak döndürür.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Açıklama |
| :-- | :-- |
| `value` / `max` | İlerleme (belirsiz ilerleme için belirtmeyin) |
| `variant` | `block` (pürüzsüz) `line` `thin` |
| `width` | Hücre sayısı (varsayılan: doldur) |
| `label` | Baştaki metin |
| `formatValue` | Sondaki metin (varsayılan `42%`) |

<!-- s:39c076d22f -->
Belirsiz ilerleme çubukları, render motorunun kare hızında ilerler ve çıktı duraklatıldığında durur.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Hücre başına renk enterpolasyonu. Çok satırlı dizeler tek bir gradyanı paylaşır, bu nedenle `<AsciiFont>` ile birlikte kullanılabilir.

<!-- s:99155d62a4 -->
Adlandırılmış gradyanlar: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Chromium ve Firefox konsolları görseli bir piksel sprite’ı olarak çizer. Piksel sanatı (256 veya daha az renk, kısmen saydam piksel olmadan) hücre başına en fazla 8 × 16 piksel, fotoğraflar ise en fazla 4 × 8 piksel korur. Safari, terminaller, düz metin kopyaları ve [`runtime = "server"`](/docs/server-rendering) kullanan sayfalar `▀` yarım bloklarını kullanır: her hücre iki piksel tutar; üst piksel ön planda, alt piksel arka plandadır. `<Image>` bileşeninin 1.3 sürümünde yaptığı gibi her yerde yarım blok çizmek için `renderMode="halfblock"` geçirin.

<!-- s:70bb4fc454 -->
| Prop | Açıklama |
| :-- | :-- |
| `src` | Görsel URL’si (yalnızca tarayıcıda) |
| `pixels` | `{ width, height, data }` biçiminde ham RGBA, satır sırasıyla piksel başına 4 bayt |
| `width` / `height` | Hücre cinsinden genişlik, satır cinsinden yükseklik. En boy oranını korumak için birini geçirin veya hücre başına 1 × 2 piksel için ikisini de belirtmeyin (`src` en fazla 256 × 256 px boyutuna ölçeklenir) |
| `fit` | `contain` (varsayılan), `cover` veya `fill` |
| `alt` | `src` yüklenirken veya yüklenemezse gösterilen metin |
| `renderMode` | `auto` (varsayılan: desteklenen yerlerde sprite, diğer yerlerde `▀` yarım blokları) veya `halfblock` |

<!-- s:c106665c64 -->
`<Image>` ayrıca layout prop’larını da alır.

<!-- s:20dac26bff -->
`src` bir canvas üzerinden yüklenir, bu nedenle farklı kaynaklardaki görseller CORS gerektirir. `pixels`, terminal dahil her yerde ham RGBA alır.

<!-- s:4e3b06ef0e -->
Bir görsel tek bir sprite olamadığında Chromium ve Firefox’ta da yarım bloklarla çizilir:

<!-- s:00d2e660eb -->
- Galerideki gibi aynı satırlarda yan yana duran iki görsel.
- Yanında metin bulunan bir fotoğraf. Metnin yanındaki piksel sanatı sprite olarak kalır.
- Bir `overflow="hidden"` kutusunun kırptığı veya başka bir kutunun kısmen kapattığı görsel.
- Metnin veya birden fazla arka plan renginin üzerindeki saydam pikseller.

<!-- s:dd4fefaac0 -->
`<Pixels>` (deneysel)

<!-- s:71eeeca05d -->
`@textjs/react/experimental`, oyunlar, emülatörler ve video gibi canlı `0xRRGGBBAA` kare arabellekleri için `<Pixels>` bileşenini dışa aktarır. Paketlenmiş pikselleri yerinde `source.data` içine yazın ve yeniden çizmek için `frame` değerini artırın.

<!-- s:2d12b69e81 -->
| Prop | Açıklama |
| :-- | :-- |
| `source` | `0xRRGGBBAA` sırasında `{ width, height, data: Uint32Array }` |
| `frame` | Kare sayacı; `source.data` değiştirildikten sonra artırın |
| `width` / `height` | Hücre ve satır cinsinden kutu boyutu |
| `fit` | `contain` (varsayılan) veya `fill` |
| `pixelAspect` | Bir kaynak pikselin görüntülenen genişliğinin yüksekliğine bölümü (varsayılan `1`) |
| `palette` | Renkleri kuantalamak için isteğe bağlı `PackedColor[]` paleti |
| `sample` | Yarım blok yedek filtresi: `nearest` (varsayılan) veya `average` |
| `renderMode` | `auto` (varsayılan: desteklenen yerlerde sprite, diğer yerlerde `▀` yarım blokları) veya `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"`, Chromium’da ve konsolunun stil kurallarına göre Firefox’ta (performansı ölçülmedi) pikselli bir sprite çizer; Safari’de, terminallerde, düz metin kopyalarında ve [`runtime = "server"`](/docs/server-rendering) kullanan sayfalarda `▀` yarım bloklarına geçer. Her yerde yarım blok çizmek için `renderMode="halfblock"` geçirin.

<!-- s:5d2bbbc47b -->
React olmadan piksel çizmek için `@textjs/core/experimental` paketinden `drawPixels` ile birlikte `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` ve `PixelRect` içe aktarın. `encoding: "rgba"` seçeneği durağan görseller için 256’dan fazla rengi ve yumuşak alfayı korur; `fallback` ise sprite’ın gösterilemediği her yerde kendi hücrelerinizi boyar. Deneysel dışa aktarımların nasıl sürümlendiğini öğrenmek için [Uyumluluğu bozan değişiklikler](/docs/support-policy#breaking-changes) bölümüne bakın.
