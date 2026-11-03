<!-- s:bd59ce7974 -->
Text.js rendert jetzt Hebräisch, Arabisch, Persisch und andere von rechts nach links geschriebene Schriften in der richtigen Reihenfolge, mit verbundenen arabischen Buchstaben, auf demselben Zellenraster wie alles andere.

<!-- s:4673b00c8b -->
Jeder Absatz bestimmt seine Grundrichtung anhand seines ersten starken Zeichens, wie `dir="auto"` in HTML, und Absätze mit Rechts-nach-links-Richtung werden rechtsbündig ausgerichtet. Bei einem verschachtelten `<Text>` isoliert `dir` den Span wie `<bdi>`, sodass ein Benutzername mit unbekannter Schreibrichtung den umgebenden Text nicht umordnen kann.

<!-- s:9026fc3194 -->
Der Algorithmus

<!-- s:f13f3bb4af -->
Die Unterstützung für Rechts-nach-links-Text implementiert den Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0), von Grund auf neu geschrieben in `@textjs/core`. Er ermittelt die Einbettungsebenen für jeden Absatz, einschließlich expliziter Einbettungen und Isolate, schwacher und neutraler Typen sowie Klammerpaare. Anschließend wird jede umgebrochene Zeile einzeln umgeordnet, und gespiegelte Zeichen werden auf Rechts-nach-links-Ebenen ausgetauscht, sodass `(abc)` innerhalb von Hebräisch `(abc)` bleibt.

<!-- s:82ed91ab82 -->
Unicode veröffentlicht zwei Konformitätsdateien für den Algorithmus. Beide liegen gzip-komprimiert im Repository, und die Testsuite führt jeden Fall aus:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` enthält Eingaben als Folgen von Bidi-Klassen, jeweils mit den Absatzrichtungen, für die sie gelten. Text.js besteht alle 770.241 Fälle.
- `BidiCharacterTest.txt` enthält echte Zeichenfolgen mit den erwarteten Ebenen und der erwarteten Reihenfolge. Text.js besteht alle 91.707.

<!-- s:3939cd5f43 -->
Von der logischen Reihenfolge zu Zellen

<!-- s:e682972504 -->
Eine Zeile mit Rechts-nach-links-Text durchläuft vier Schritte, bevor sie die Konsole erreicht:

<!-- s:a497c14c9c -->
1. **In logischer Reihenfolge umbrechen.** Zeilen werden wie bei Links-nach-rechts-Text anhand der Zellenbreite umgebrochen.
2. **Jede Zeile umordnen.** Die ermittelten Ebenen bestimmen die Anzeigereihenfolge der Grapheme in der Zeile.
3. **Arabische Buchstaben formen.** Buchstaben erhalten ihre kontextabhängigen Formen (isoliert, initial, medial, final) aus den Blöcken Arabic Presentation Forms. Ein Buchstabe belegt eine Zelle, und verbundene Formen bleiben auch bei einem Cursor oder Farbwechsel mitten im Wort erhalten.
4. **Die Reihenfolge fixieren.** Die Zellen enthalten die Glyphen jetzt in Anzeigereihenfolge.

<!-- s:5d1156720d -->
Der letzte Schritt ist nötig, weil DevTools den Bidi-Algorithmus ein zweites Mal auf den Text anwenden und ihn erneut umkehren würde. Ein `%c`-Stil kann das nicht abschalten, weil der Sanitizer von DevTools `direction` und `unicode-bidi` entfernt. Deshalb umschließt der Treiber jeden Span mit Rechts-nach-links-Zeichen mit `LRO` und `PDF` (U+202D und U+202C), was die Anzeige genau des Zelleninhalts von links nach rechts erzwingt.

<!-- s:aba313fc71 -->
Eine halbe Zelle Versatz

<!-- s:1109446b98 -->
Weder SF Mono noch Menlo enthält hebräische oder arabische Glyphen, deshalb verwendet der Browser für jedes Zeichen eine Ersatzschrift. Unter macOS ist das Courier New, ebenfalls eine nichtproportionale Schrift, mit 7,2012 px pro Glyphe bei 12 px gegenüber 7,2246 px bei Menlo. Sie ist 0,3 % schmaler, genug, um eine volle Zeile Hebräisch um etwa eine halbe Zelle zu verschieben.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` misst jeden Rechts-nach-links-Span mit einem Canvas in der Konsolenschrift, der denselben Blink-Schrift-Fallback wie DevTools verwendet, und ergänzt den Span um die exakte Differenz in LayoutUnits (1/64 px). Jeder Span ist am Ende genauso breit wie die Rasterzellen, die er abdeckt. Ein Span wird um höchstens eine halbe Zelle zusammengezogen, sodass eine deutlich breitere Ersatzschrift überläuft, statt den nächsten Span zu überlappen.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` misst das Ergebnis im echten DevTools-Frontend auf einem 64×21-Frame mit hebräischen, arabischen, gemischten und hebräischen Zeilen mit Emojis:

<!-- s:e6a33dfaa2 -->
| Frame | Versatz am rechten Rand über die Zeilen hinweg |
| :-- | --: |
| Zellen ohne fixierte Reihenfolge ausgegeben | 14,5 px |
| Reihenfolge fixiert, ohne Breitenanpassung | 2,22 px |
| Ausgelieferter Treiber | 0,156 px |
| Kontrollmessung: jede RTL-Glyphe durch `x` ersetzt | 1,67 px |

<!-- s:d03d5a84a3 -->
Die Kontrollmessung verwendet denselben Frame mit lateinischem Text. Der ausgelieferte Treiber richtet die Zeilen besser aus als die Kontrollmessung, weil Emojis innerhalb von Rechts-nach-links-Spans zusammen mit diesen angepasst werden.

<!-- s:d37099863b -->
Links-nach-rechts-Text unverändert

<!-- s:41ce31b66a -->
Text ohne Rechts-nach-links-Zeichen überspringt all diese Schritte. Die Prüfung erfolgt während der Segmentierung der Grapheme, mit einem Vergleich pro Graphem, und reiner Links-nach-rechts-Text wird über denselben Pfad wie bisher gezeichnet, sodass seine Konsolen-Frames byteidentisch sind.

<!-- s:a8fff567e6 -->
Rechts-nach-links-Text ist in Text.js 1.0 enthalten. [Internationalisierung](/docs/internationalization) behandelt Eingabe, Bearbeitung, Terminals und die API.
