<!-- s:d3c8cb679e -->
`<List>`, `<Table>` i `<Tree>` wyświetlają duże zbiory danych. Renderowane są tylko widoczne wiersze.

<!-- s:44ffd1d0a7 -->
Nawigacja

<!-- s:e3dca4574c -->
`<List>`, `<Table>` i `<Tree>` mają wspólny model obsługi klawiatury.

<!-- s:cdac0643be -->
| Klawisze | Działanie |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Przesuwanie |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Przesuwanie o stronę, pół strony |
| `Home` `End` / `g` `G` | Przejście do pierwszego, ostatniego wiersza |
| `↵` | `onSelect` |
| Kółko myszy | Przesuwanie kursora |

<!-- s:1c65c42a4d -->
Domyślnie wypełniają element nadrzędny. Przekaż `height`, aby ustalić liczbę wierszy.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Lista wirtualizowana. Wiersze mają wysokość jednej komórki.

<!-- s:3408e68b29 -->
| Prop | Opis |
| :-- | :-- |
| `items` | Dowolna tablica |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Pomijanie przez kursor |
| `height` | Widoczne wiersze (domyślnie: wypełnienie) |
| `highlightedIndex` / `onHighlight` | Kontrolowany kursor |
| `vimKeys` | `j` `k` `g` `G` (domyślnie `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Kolumny dzielą pozostałą szerokość, chyba że mają ustawione `width`. Nagłówki i komórki używają tych samych reguł flex, więc zawsze są wyrównane.

<!-- s:e9719839f0 -->
| Pole kolumny | Opis |
| :-- | :-- |
| `key` | Identyfikator i domyślny akcesor |
| `width` / `grow` | Stała liczba komórek lub udział w pozostałej szerokości |
| `align` | `left` `right` `center` |
| `value` | Wartość do wyświetlania i sortowania |
| `render` | Własna zawartość komórki |
| `compare` | Własne sortowanie |

<!-- s:045ee40857 -->
Sortowanie

<!-- s:d04de39344 -->
Przy włączonym `sortable` naciśnij numer kolumny, aby według niej sortować (ponownie, aby odwrócić kierunek), `s`, aby przełączać kolumny, i `S`, aby odwrócić kierunek. Sortowanie jest stabilne. Kontroluj je za pomocą `sort` i `onSortChange`.

<!-- s:6d625a19ed -->
Zaznaczanie

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` dodaje kolumnę pól wyboru; `Space` przełącza zaznaczenie podświetlonego wiersza. Użyj `selectedKeys` i `onSelectionChange`, aby kontrolować zaznaczenie, oraz `getRowKey`, aby zapewnić stabilne klucze.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Rozwijane drzewo z liniami pomocniczymi.

<!-- s:eeb148154f -->
`→` rozwija gałąź lub do niej przechodzi. `←` zwija gałąź lub przechodzi do elementu nadrzędnego. `Space` przełącza rozwinięcie. `flattenTree(data, expanded)` udostępnia widoczne wiersze, jeśli potrzebujesz własnego renderera.
