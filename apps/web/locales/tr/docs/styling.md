<!-- s:581711536b -->
Bileşenleri `className` yardımcı sınıfları veya tür tanımlı prop’larla biçimlendirin. Text.js uygulamalarında stil sayfaları yoktur.

<!-- s:e0ac1db626 -->
Yardımcı sınıflar

<!-- s:2de571e2bf -->
`className`, Tailwind tarzı yardımcı sınıflar alır. Bir birim bir hücredir.

<!-- s:785b2c3db0 -->
| Kategori | Örnekler |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Boşluk | `p-1` `px-2` `mt-1` |
| Kenarlıklar | `border` `rounded` `border-accent` |
| Renk | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Tür tanımlı prop’lar

<!-- s:4963259a42 -->
Her yardımcı sınıfın bir prop karşılığı vardır. Prop’lar `className` değerinden önceliklidir.

<!-- s:15a3834a24 -->
Renkler

<!-- s:d333dad27a -->
Hex değerleri, Tailwind adları veya `fg`, `muted`, `surface`, `accent`, `success` ve `danger` gibi tema token’ları kullanın. Token’lar etkin temayı izler.

<!-- s:087abce968 -->
Temalar

<!-- s:abba2a3188 -->
Beş hazır tema yerleşik olarak sunulur: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` ve `amberCrt`.

<!-- s:5dc490305b -->
Duyarlı görünüm alanları

<!-- s:419fb844db -->
Uygulamalar varsayılan olarak sabitlenmiş DevTools konsolunu doldurur (`viewport.responsive`) ve paneli sürüklediğinizde yeniden boyutlanır. Layout için flex kullanın ve gerektiğinde boyutu okuyun:

<!-- s:3d847eadf9 -->
Sayfa yalnızca sabitlenmiş bir paneli görebilir. Ayrı penceredeki DevTools’u, DevTools yakınlaştırmasını ve Konsol kenar çubuğunu göremez; bu nedenle uygulama `viewport.width × viewport.height` (varsayılan `120×36`) veya sizin sabitlediğiniz bir boyutu kullanır:
