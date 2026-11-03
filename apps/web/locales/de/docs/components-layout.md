<!-- s:19797c0276 -->
Diese Grundbausteine ordnen das Zellenraster mit Yoga flexbox an.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Der Layout-Container.

<!-- s:b2726c7ef5 -->
| Prop | Beschreibung |
| :-- | :-- |
| `className` | Hilfsklassen für Zellen |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | In den oberen Rahmen eingelassener Text |
| `bg` / `fg` | Hintergrund- und Textfarbe |
| `overflow` | `hidden` oder `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Inline-Text. Verschachtelte `<Text>`-Komponenten werden zu formatierten Spans.

<!-- s:d078a242d3 -->
| Prop | Beschreibung |
| :-- | :-- |
| `color` | Textfarbe |
| `bold` `italic` `underline` `dim` | Attribute |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Eine scrollbare Spalte. `stickyScroll` hält die Scrollposition am unteren Rand, wenn der Inhalt wächst.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Ein zentriertes Overlay, das den darunterliegenden Inhalt abdunkelt und den Fokus im Overlay hält.

<!-- s:7a128a8b11 -->
Spacer, Divider und Badge

<!-- s:72e5d35050 -->
Layout-Helfer

<!-- s:e76299d593 -->
Kurzformen für gängige Flex-Anordnungen.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Zwei Bereiche und eine Trennlinie. Mit `resizable` wird die Trennlinie Teil der `Tab`-Reihenfolge, und `←` `→` ändern die Bereichsgrößen (`Shift` für fünf Zellen).

<!-- s:2143924860 -->
`size` ist ein Anteil (`0.3`) oder eine Anzahl von Zellen (`24`). `direction="column"` ordnet die Bereiche untereinander an.
