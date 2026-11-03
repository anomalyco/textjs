<!-- s:b2d192945b -->
Die Konsole ist ein Raster aus Zellen. Text.js berechnet das Layout mit Yoga, derselben flexbox-Engine, die React Native verwendet, sodass `<Box>` den CSS-Regeln für flexbox folgt. Die Einheiten sind Zellen: `p-1` entspricht einer Spalte und einer Zeile Innenabstand.

<!-- s:029cc40e38 -->
Eine obere Leiste

<!-- s:4708298213 -->
Die meisten Ansichten sind als Spalte aufgebaut: eine einzeilige Leiste, dann alles andere. Gib der Leiste mit `h-1` eine feste Höhe und lass den Inhalt mit `grow` den Rest einnehmen.

<!-- s:5f781355bb -->
`<Spacer>` ist eine wachsende Box: Alles danach rückt an den rechten Rand.

<!-- s:0c01f22e11 -->
Seitenleiste und Karten

<!-- s:7bf034d9ab -->
Füge eine Seitenleiste mit fester Breite und rechtem Rahmen sowie drei Karten hinzu, die sich die verbleibende Breite teilen. `basis-0` mit `grow` gibt jeder Karte den gleichen Anteil, unabhängig von ihrem Inhalt.

<!-- s:493f8816f0 -->
Drücke `s` und `d` in der Konsole. Yoga berechnet das Layout neu und zeichnet nur die geänderten Zeilen neu, sodass das Ein- und Ausblenden der Seitenleiste einen einzigen `console.log`-Aufruf kostet.

<!-- s:66bd0231a6 -->
Standardmäßig responsiv

<!-- s:7d3f8e46eb -->
Das Raster richtet sich nach dem angedockten DevTools-Bereich. Ziehe die Konsole breiter oder höher und die Karten ordnen sich neu an. Wenn du Breakpoints brauchst, liefert `useBreakpoint()` den aktuellen Breakpoint in Zellen.
