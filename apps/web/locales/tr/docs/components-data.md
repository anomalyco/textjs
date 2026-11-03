<!-- s:d3c8cb679e -->
`<List>`, `<Table>` ve `<Tree>` büyük veri kümelerini gösterir. Yalnızca görünür satırlar render edilir.

<!-- s:44ffd1d0a7 -->
Gezinme

<!-- s:e3dca4574c -->
`<List>`, `<Table>` ve `<Tree>` aynı klavye modelini paylaşır.

<!-- s:cdac0643be -->
| Tuşlar | Eylem |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Hareket |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Sayfa, yarım sayfa |
| `Home` `End` / `g` `G` | İlk, son |
| `↵` | `onSelect` |
| Tekerlek | İmleci hareket ettirme |

<!-- s:1c65c42a4d -->
Varsayılan olarak üst öğelerini doldururlar. Sabit sayıda satır için `height` değerini geçin.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Sanallaştırılmış bir liste. Satırlar bir hücre yüksekliğindedir.

<!-- s:3408e68b29 -->
| Prop | Açıklama |
| :-- | :-- |
| `items` | Herhangi bir dizi |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | İmlecin atladığı öğeler |
| `height` | Görünür satırlar (varsayılan: doldurma) |
| `highlightedIndex` / `onHighlight` | Kontrollü imleç |
| `vimKeys` | `j` `k` `g` `G` (varsayılan `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Sütunlar, `width` belirtilmedikçe kalan genişliği paylaşır. Başlıklar ve hücreler aynı flex kurallarını kullanır, bu nedenle her zaman hizalanırlar.

<!-- s:e9719839f0 -->
| Sütun alanı | Açıklama |
| :-- | :-- |
| `key` | Kimlik ve varsayılan erişimci |
| `width` / `grow` | Sabit hücre sayısı veya kalan genişlikten pay |
| `align` | `left` `right` `center` |
| `value` | Gösterim ve sıralama değeri |
| `render` | Özel hücre içeriği |
| `compare` | Özel sıralama |

<!-- s:045ee40857 -->
Sıralama

<!-- s:d04de39344 -->
`sortable` ile bir sütuna göre sıralamak için sütunun numarasına (tersine çevirmek için tekrar), sütunlar arasında geçiş yapmak için `s`, yönü tersine çevirmek için `S` tuşuna basın. Sıralama kararlıdır. `sort` ve `onSortChange` ile kontrol edin.

<!-- s:6d625a19ed -->
Seçim

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` bir onay sütunu ekler; `Space` vurgulanan satırın seçim durumunu değiştirir. Seçimi kontrol etmek için `selectedKeys` ve `onSelectionChange`, kararlı anahtarlar için `getRowKey` kullanın.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Kılavuz çizgileri olan genişletilebilir bir ağaç.

<!-- s:eeb148154f -->
`→` bir dalı genişletir veya dalın içine ilerler. `←` dalı daraltır veya üst öğeye atlar. `Space` genişletme durumunu değiştirir. Kendi renderer’ınıza ihtiyaç duyarsanız `flattenTree(data, expanded)` görünür satırları sunar.
