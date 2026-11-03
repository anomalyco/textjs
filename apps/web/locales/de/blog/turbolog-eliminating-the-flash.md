<!-- s:fe58dc6ae4 -->
Jeder Text.js-Frame ist ein `console.log`-Aufruf. Bis 0.4 ging jedem Frame außerdem ein `console.clear()` voraus. Unter Last blitzte die Konsole zwischen den Frames leer auf.

<!-- s:7a82fe5fe2 -->
Das Aufblitzen messen

<!-- s:1d16f5a106 -->
Um das zu messen, haben wir `bench/devtools` gebaut. Es startet Chrome for Testing, öffnet das echte DevTools-Frontend als Seite und instrumentiert es:

<!-- s:4da6ef7009 -->
- Bei jedem `requestAnimationFrame` im DevTools-Frontend prüft es, ob ein vollständiger Frame mit 32 Zeilen im sichtbaren Bereich der Konsole liegt. Zeichenvorgänge ohne einen solchen Frame zählen als leere Zeichenvorgänge.
- Es dekodiert anschließend die Frames von `Page.startScreencast`, um das Ergebnis anhand der Pixel zu bestätigen.
- Jeder Frame trägt `FRAME:<id> · T:<epochMs>` in Zeile 0, damit das Frontend erkennen kann, welchen Frame es anzeigt und wie verspätet er ist.

<!-- s:cb3c553c37 -->
Mit `console.clear()` vor jedem Frame blieb ein 100×32-Dashboard bei 15 fps in **70,6 %** der DevTools-Zeichenvorgänge leer. Bei 60 fps waren es **81,1 %**.

<!-- s:7076ddd27d -->
Die Ursache

<!-- s:1e65554dc0 -->
Die `ConsoleView` von DevTools behandelt die beiden Aufrufe unterschiedlich:

<!-- s:56484b5ac3 -->
1. `console.clear()` ruft `consoleCleared()` auf, das den sichtbaren Bereich **synchron** invalidiert. Jede Meldung verschwindet im selben Task.
2. `console.log()` ruft `addConsoleMessage()` auf, das lediglich eine Aktualisierung über `viewportThrottler` einplant, einen `Throttler` mit einem Timeout von **50 ms**.

<!-- s:8a656fe37a -->
Jeder Frame entfernt den alten Frame also sofort und zeichnet den neuen erst später. Bei 15 fps bleibt die Anzeige ungefähr 50 von jeweils 66 ms leer.

<!-- s:8bb24ac9a4 -->
Frames anhängen

<!-- s:1092cc0920 -->
Seit 0.4 hängt Turbolog Frames an. DevTools bleibt am unteren Ende der Konsole, sodass der neue Frame den alten innerhalb eines einzigen Zeichenvorgangs ersetzt. Ein vorangestellter Span ohne Breite mit `margin-top:100vh` (der Vorhang) schiebt frühere Frames aus dem sichtbaren Bereich und beendet seine eigene Zeile, damit der DevTools-Quelltextlink Zeile 0 nie verengt.

<!-- s:6e8cb684de -->
Irgendwann muss die Konsole trotzdem geleert werden. Das geschieht nur beim ersten Frame, nach `invalidate()`, im Leerlauf, sobald sich 100 Frames angesammelt haben, und an der festen Obergrenze von 300.

<!-- s:58637d56ab -->
Den Takt an den Throttler anpassen

<!-- s:14c65af87d -->
Frames schneller zu senden, als DevTools sie zeichnen kann, beschleunigt nichts. Eine Log-Meldung, die während der Wartezeit des Throttlers eintrifft, startet ihn neu, sodass Frames verworfen werden: Bei 60 fps zeichnete DevTools 67 von 295 ausgegebenen Frames. Turbolog hält zwischen Frames mindestens **66 ms** Abstand, etwa 15 fps, und rendert diskrete Eingaben weiterhin synchron, wenn das Intervall es zulässt.

<!-- s:8a90fd55c3 -->
Die Phasenbindung aufheben

<!-- s:e96505e7a5 -->
Das Leeren verzögerte außerdem jeden späteren Frame um etwa 50 ms. Nach dem Leeren fügt DevTools eine synthetische Zeile `Console was cleared` ein. Sie belegt den sofortigen Ausführungsslot des Throttlers und verschiebt den nächsten Frame auf den 50-ms-Timer, und bei einem gleichmäßigen 66-ms-Takt bleibt jeder spätere Frame an diesen Timer gebunden.

<!-- s:57527b9818 -->
Der Renderer wartet jetzt nach jedem Leeren einmalig **110 ms**. Danach trifft jeder Frame mehr als 50 ms nach Abschluss der vorherigen Aktualisierung ein und nimmt den sofortigen Ausführungspfad von DevTools. Der Median der Anzeigeverzögerung sank von **63 ms auf 10,4 ms**.

<!-- s:003645d0bf -->
Ergebnisse

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, 100×32-Dashboard, echtes DevTools-Frontend:

<!-- s:9ee75054af -->
| Modus | FPS | Leere Zeichenvorgänge | Gezeichnet / ausgegeben | Verzögerung p50 |
| :-- | --: | --: | --: | --: |
| Leeren pro Frame | 15 | 70,6 % | 70 / 75 | 60,4 ms |
| **Anhängen (1.0)** | **15** | **1,0 %** | **74 / 75** | **10,4 ms** |
| Leeren pro Frame | 60 | 81,1 % | 45 / 300 | 9,8 ms |
| Anhängen, ohne Taktung | 60 | 0,8 % | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Das verbleibende 1 % entfällt auf den ersten Frame, der die Konsole absichtlich leert. Seine leeren Zeichenvorgänge zeigen die Zeile `Console was cleared`, keine leere Konsole.

<!-- s:315471c65a -->
Weniger Eigenschaften pro Span

<!-- s:e210e7e85d -->
Der DevTools-Quellcode zeigte einen weiteren Kostenfaktor. Er kopiert jede *Langformeigenschaft* eines `%c`-Stils auf jeden Zeilen-Wrapper, sodass sich die Kurzformen `font:` und `margin:` auf etwa 33 Eigenschaften pro Span erweiterten. Spans verwenden jetzt nur Langformen, jeweils etwa 7, mit Hex-Farben.

<!-- s:5b341c4930 -->
Der Anhängemodus wurde mit Text.js 0.4 ausgeliefert, und die Korrektur der Phasenbindung erscheint in 1.0. Beides erfordert keine Änderungen am Anwendungscode.
