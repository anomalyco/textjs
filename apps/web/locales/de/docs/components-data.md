<!-- s:d3c8cb679e -->
`<List>`, `<Table>` und `<Tree>` zeigen große Datensätze an. Nur sichtbare Zeilen werden gerendert.

<!-- s:44ffd1d0a7 -->
Navigation

<!-- s:e3dca4574c -->
`<List>`, `<Table>` und `<Tree>` verwenden dieselbe Tastatursteuerung.

<!-- s:cdac0643be -->
| Tasten | Aktion |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Bewegen |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Ganze Seite, halbe Seite |
| `Home` `End` / `g` `G` | Erste, letzte Zeile |
| `↵` | `onSelect` |
| Mausrad | Cursor bewegen |

<!-- s:1c65c42a4d -->
Standardmäßig füllen sie ihr Elternelement aus. Übergib `height` für eine feste Anzahl von Zeilen.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Eine virtualisierte Liste. Jede Zeile ist eine Zelle hoch.

<!-- s:3408e68b29 -->
| Prop | Beschreibung |
| :-- | :-- |
| `items` | Beliebiges Array |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Vom Cursor übersprungen |
| `height` | Sichtbare Zeilen (Standard: ausfüllen) |
| `highlightedIndex` / `onHighlight` | Gesteuerter Cursor |
| `vimKeys` | `j` `k` `g` `G` (Standard: `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Spalten teilen sich die verbleibende Breite, sofern sie kein `width` festlegen. Kopfzeilen und Zellen verwenden dieselben Flex-Regeln und bleiben so immer bündig.

<!-- s:e9719839f0 -->
| Spaltenfeld | Beschreibung |
| :-- | :-- |
| `key` | ID und Standardzugriff |
| `width` / `grow` | Feste Zellenanzahl oder Anteil am Rest |
| `align` | `left` `right` `center` |
| `value` | Anzeige- und Sortierwert |
| `render` | Benutzerdefinierter Zelleninhalt |
| `compare` | Benutzerdefinierte Sortierung |

<!-- s:045ee40857 -->
Sortierung

<!-- s:d04de39344 -->
Drücke bei aktiviertem `sortable` die Nummer einer Spalte, um danach zu sortieren (erneut drücken kehrt die Richtung um), `s` zum Wechseln der Spalte und `S` zum Umkehren der Richtung. Die Sortierung ist stabil. Steuere sie mit `sort` und `onSortChange`.

<!-- s:6d625a19ed -->
Auswahl

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` fügt eine Spalte mit Kontrollkästchen hinzu; `Space` schaltet die Auswahl der hervorgehobenen Zeile um. Verwende `selectedKeys` und `onSelectionChange`, um die Auswahl zu steuern, und `getRowKey` für stabile Schlüssel.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Ein aufklappbarer Baum mit Führungslinien.

<!-- s:eeb148154f -->
`→` klappt einen Zweig auf oder wechselt hinein. `←` klappt ihn zu oder springt zum übergeordneten Knoten. `Space` schaltet zwischen auf- und zugeklappt um. `flattenTree(data, expanded)` stellt die sichtbaren Zeilen bereit, falls du einen eigenen Renderer brauchst.
