<!-- s:68d1688157 -->
Ersetze die selbst geschriebenen Zeilen durch Komponenten: `<Table>` mit Tastaturnavigation und Sortierung, `<List>` mit virtualisiertem Scrollen und Diagramme aus Achtelblöcken und Quadrantenpunkten.

<!-- s:05c3784661 -->
Eine sortierbare Tabelle

<!-- s:7c978a7876 -->
Spalten sind ein Array von Objekten. Eine Spalte ohne `width` erhält ihren Anteil am verbleibenden Platz gemäß `grow`, `value` liefert den Vergleichswert für die Sortierung und `render` zeichnet die Zelle.

<!-- s:d77f425e4a -->
Wenn die Tabelle den Fokus hat, verschieben `↑` `↓` die Hervorhebung, `s` wechselt durch die Sortierspalten, `S` kehrt die Richtung um und `Enter` ruft `onSelect` auf. Lange Tabellen zeichnen nur die sichtbaren Zeilen.

<!-- s:0d24a40c2e -->
Ein Diagramm darüber

<!-- s:146f64e4f0 -->
`<Sparkline>` füllt seine Box mit den neuesten Punkten. `<BarChart>` richtet Beschriftungen und Werte für dich aus.

<!-- s:62ad31a083 -->
Die Diagramm-Box hat eine feste Höhe, sodass ein Diagrammwechsel die Tabelle nie verschiebt und ihre Zeilen nicht erneut kodiert werden.

<!-- s:335111e821 -->
Weitere Komponenten

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` und weitere sind unter [Komponenten](/docs/components-data) dokumentiert.
