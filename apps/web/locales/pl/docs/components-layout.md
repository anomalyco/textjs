<!-- s:19797c0276 -->
Te podstawowe komponenty układają siatkę komórek za pomocą Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Kontener layoutu.

<!-- s:b2726c7ef5 -->
| Prop | Opis |
| :-- | :-- |
| `className` | Klasy narzędziowe komórek |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Tekst wstawiony w górne obramowanie |
| `bg` / `fg` | Kolor tła i tekstu |
| `overflow` | `hidden` lub `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Tekst w wierszu. Zagnieżdżone komponenty `<Text>` stają się stylizowanymi spanami.

<!-- s:d078a242d3 -->
| Prop | Opis |
| :-- | :-- |
| `color` | Kolor tekstu |
| `bold` `italic` `underline` `dim` | Atrybuty |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Przewijana kolumna. `stickyScroll` utrzymuje przewinięcie na dole, gdy treści przybywa.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Wyśrodkowana nakładka, która przyciemnia zawartość pod spodem i zatrzymuje fokus wewnątrz.

<!-- s:7a128a8b11 -->
Spacer, Divider i Badge

<!-- s:72e5d35050 -->
Komponenty pomocnicze layoutu

<!-- s:e76299d593 -->
Skróty dla typowych układów flex.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Dwa panele i separator. Z `resizable` separator trafia do kolejności nawigacji klawiszem `Tab`, a `←` `→` zmieniają jego położenie (`Shift` przesuwa o pięć komórek).

<!-- s:2143924860 -->
`size` to ułamek (`0.3`) lub liczba komórek (`24`). `direction="column"` układa panele jeden pod drugim.
