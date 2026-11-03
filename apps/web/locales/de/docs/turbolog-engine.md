<!-- s:aca2697522 -->
Turbolog macht aus jedem React-Commit einen `console.log`-Aufruf oder keinen, wenn sich keine Zelle geändert hat.

<!-- s:d01b048a1d -->
Ziele

<!-- s:53b8b34f5a -->
1. **Ein Aufruf pro geändertem Frame.**
2. **Keine Aufrufe im Leerlauf.** Bei einem unveränderten Frame kehrt die Funktion zurück, bevor sie einen String erstellt.
3. **Wenige Stilargumente.** 149 `%c`-Spans für die 3200 Zellen eines dicht gefüllten `100×32`-Dashboards.

<!-- s:e284ac0068 -->
Pipeline

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Der Frame liegt in flachen typisierten Arrays für Zeichen, Farben und Attribute, deren Speicher einmalig reserviert wird.

<!-- s:6215aa69f7 -->
Änderungsprüfung

<!-- s:617da960c4 -->
Für jede Zeile wird ein Hash berechnet. Wenn sich nichts geändert hat, kehrt der Treiber frühzeitig zurück:

<!-- s:524a0717a4 -->
Frame-Wechsel

<!-- s:3c7194b785 -->
Turbolog hängt Frames an und leert die Konsole nur beim ersten Frame, nach `invalidate()`, im Leerlauf, sobald sich 100 Frames angesammelt haben, und bei 300. DevTools entfernt gelöschte Meldungen sofort, zeichnet neue aber gedrosselt in Abständen von 50 ms, sodass beim Leeren nach jedem Frame kurz eine leere Konsole aufblitzt. Angehängte Frames wechseln innerhalb eines einzigen Zeichenvorgangs, und ein verdeckender Span mit einer Breite von null hält den vorherigen Frame außerhalb des sichtbaren Bereichs. Scrolle nach oben, um frühere Frames zu sehen.

<!-- s:7845be2cbb -->
Frames werden auf etwa 15 fps getaktet. Schnellere Frames setzen die DevTools-Drosselung zurück und werden verworfen.

<!-- s:a36177ad5b -->
Lauflängenkodierung

<!-- s:d4079278eb -->
Übereinstimmende Zellen verschmelzen zu einem `%c`-Span. Spans laufen über Zeilenumbrüche hinweg weiter, und CSS-Strings werden interniert.

<!-- s:7fe20496b0 -->
Chromium-Details

<!-- s:ff8301db1f -->
- Ein wörtliches `%` wird als `%%` maskiert.
- URLs und `path:line`-Text erhalten einen Word Joiner, damit DevTools ihren Stil nicht ändert.
- Spans verwenden nur ausgeschriebene CSS-Eigenschaften. DevTools kopiert jede aufgelöste Eigenschaft auf jede Zeile.
- Spans sind so abgestimmt, dass Hintergründe lückenlos aneinander anschließen.

<!-- s:41e36e3179 -->
Firefox und Safari

<!-- s:8b2f3136a1 -->
Chromium stellt jede Zeile eines `%c`-Spans als Inline-Block dar. Firefox und Safari belassen Spans inline, ignorieren daher vertikale Außenabstände und brechen lange Zeilen um. `CssConsoleDriver` erkennt den Browser durch CSS-Funktionstests und setzt für diese beiden Konsolen eine Zeilenhöhe von 14 px ohne Außenabstände, schaltet den Zeilenumbruch mit `text-wrap-mode: nowrap` aus und schiebt frühere Frames mit einem verdeckenden `line-height: 100vh`-Span aus dem sichtbaren Bereich. Beim Einpassen in die Konsole bleibt Platz für die Spalte mit Quellverweisen in Firefox. Safari setzt Menlo an die erste Stelle der Schriftartenliste, weil seine Seiten eine vom Benutzer installierte SF Mono nicht verwenden können, mit der Web Inspector möglicherweise Text zeichnet. Übergib `browser` an `createConsoleRoot`, um selbst eine Konsole auszuwählen.

<!-- s:66b07a5809 -->
Benchmarks

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` auf einem dicht gefüllten `100×32`-Dashboard, Mittelwert aus 1000 Frames (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Frame | Zeit | `%c`-Spans |
| :-- | --: | --: |
| Vollständiges Neuzeichnen (Layout, Zeichnen, Kodieren) | **0,163 ms** | 149 |
| Änderung einer Zeile | **0,011 ms** | 149 |
| Leerlauf | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
Die [Statusseite](/status) führt dieselbe Pipeline in deinem Browser aus. Führe `text.stats()` in DevTools aus, während eine Demo aus dem [Playground](/playground) läuft.
