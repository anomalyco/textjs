<!-- s:19797c0276 -->
Bu temel bileşenler, hücre ızgarasını Yoga flexbox ile düzenler.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Layout kapsayıcısı.

<!-- s:b2726c7ef5 -->
| Prop | Açıklama |
| :-- | :-- |
| `className` | Hücre yardımcı sınıfları |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Üst kenarlığa gömülü metin |
| `bg` / `fg` | Arka plan ve metin rengi |
| `overflow` | `hidden` veya `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Satır içi metin. İç içe yerleştirilen `<Text>` bileşenleri, stillendirilmiş span öğelerine dönüşür.

<!-- s:d078a242d3 -->
| Prop | Açıklama |
| :-- | :-- |
| `color` | Metin rengi |
| `bold` `italic` `underline` `dim` | Nitelikler |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Kaydırılabilir bir sütun. `stickyScroll`, içerik büyüdükçe kaydırma konumunu en altta tutar.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Altındaki içeriği karartan ve odağı içinde tutan, ortalanmış bir katman.

<!-- s:7a128a8b11 -->
Spacer, Divider ve Badge

<!-- s:72e5d35050 -->
Layout yardımcıları

<!-- s:e76299d593 -->
Yaygın flex düzenlemeleri için kısaltmalar.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
İki bölme ve bir ayırıcı. `resizable` ile ayırıcı, `Tab` sırasına katılır ve `←` `→` tuşlarıyla yeniden boyutlandırılır (beş hücre için `Shift`).

<!-- s:2143924860 -->
`size`, bir kesir (`0.3`) veya hücre sayısıdır (`24`). `direction="column"`, bölmeleri alt alta yerleştirir.
