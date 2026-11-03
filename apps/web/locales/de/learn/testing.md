<!-- s:329a4263b5 -->
`@textjs/app/testing` rendert deine App außerhalb des sichtbaren Bereichs, drückt Tasten und gibt den Frame als Klartext zurück. Tests laufen ohne Browser oder DevTools.

<!-- s:22ea22bed4 -->
Dein erster Test

<!-- s:79e830f1ed -->
Die Seite ruft `/api/deployments` ab, wofür unter `bun test` kein Server läuft, daher ersetzt `beforeEach` den Aufruf von `fetch` durch dieselben Daten. `render` verwendet standardmäßig ein Raster mit 80×24 Zellen. `lastFrame()` gibt den gesamten Frame als Text zurück, `lines()` gibt ihn zeilenweise zurück und `cell(x, y)` liefert dir das Zeichen und die Farben einer einzelnen Zelle.

<!-- s:e8fdbe8cac -->
Tasten drücken

<!-- s:8db83c740c -->
`press` akzeptiert dieselben Tastenbezeichnungen wie `useKeymap`. Jeder Aufruf läuft innerhalb von `act()` und verarbeitet die entstandenen Frames vollständig, sodass die nächste Assertion die Aktualisierung sieht.

<!-- s:7c6ee6548f -->
Die Tabelle zeichnet `›` vor die hervorgehobene Zeile, sodass der ↓-Test diese Zeile findet und ihren Commit prüft. Ziffern sortieren nach einer Spalte, und die vierte Spalte ist Build.

<!-- s:5350d592a4 -->
Tests ausführen

<!-- s:88993d5c83 -->
Das funktioniert mit jedem Test-Runner, der `async`-Tests unterstützt: Bun, Vitest oder Jest. Drücke in der Konsole `Enter`, um die Testsuite auszuführen, und `f`, um einen Test fehlschlagen zu lassen und zu sehen, wie ein Fehler aussieht.

<!-- s:26f93acae3 -->
Snapshots

<!-- s:b458212c22 -->
`toAnsi()` gibt den Frame als Truecolor-ANSI zurück und erstellt damit Snapshots, die auch Farbregressionen erkennen:
