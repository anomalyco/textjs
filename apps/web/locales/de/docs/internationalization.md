<!-- s:43751f7845 -->
Text.js rendert Hebräisch, Arabisch, Persisch und andere von rechts nach links geschriebene Schriften in der richtigen Reihenfolge, am Zellenraster ausgerichtet, in DevTools, Terminals und DOM-Spiegeln. Es implementiert den Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) und besteht die offiziellen Konformitätstests: alle 770.241 Fälle aus `BidiTest.txt` (jede Eingabe in jeder Absatzrichtung) und alle 91.707 Fälle aus `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Richtung

<!-- s:0c7b144a82 -->
Jeder Absatz (jede durch `\n` getrennte Zeile eines `<Text>`) bestimmt seine eigene Basisrichtung anhand seines ersten starken Zeichens, wie `dir="auto"` in HTML. Rechts-nach-links-Absätze sind standardmäßig rechtsbündig.

<!-- s:c17beb4498 -->
| `align` | Links-nach-rechts-Absatz | Rechts-nach-links-Absatz |
| :-- | :-- | :-- |
| `"start"` (Standard) | links | rechts |
| `"end"` | rechts | links |
| `"left"` / `"center"` / `"right"` | wie angegeben | wie angegeben |

<!-- s:6db8fa68bb -->
Bei einem verschachtelten `<Text>` isoliert `dir` den Span wie `<bdi>` in HTML: Sein Inhalt erhält ein eigenes Layout und kann den umgebenden Text nicht umordnen. Verwende es für Namen, Titel und andere Texte mit unbekannter Richtung, die Nutzer eingeben.

<!-- s:68088feb2d -->
Ablauf des Renderings

<!-- s:d401630cda -->
1. **In logischer Reihenfolge umbrechen.** Zeilen brechen genau wie bei Links-nach-rechts-Text nach Zellenbreite um.
2. **Jede Zeile umordnen.** Der Algorithmus bestimmt die Einbettungsebenen für den gesamten Absatz (explizite Einbettungen und Isolate, schwache und neutrale Typen, Klammerpaare), dann ordnet er jede umgebrochene Zeile einzeln um (Regeln L1–L2). Klammern und andere gespiegelte Zeichen wechseln auf Rechts-nach-links-Ebenen (L4) ihre Form, sodass `(abc)` innerhalb von Hebräisch `(abc)` bleibt.
3. **Arabische Zeichen formen.** Buchstaben erhalten ihre kontextabhängigen Formen (isoliert, initial, medial, final) aus den Blöcken Arabic Presentation Forms, berechnet in logischer Reihenfolge innerhalb jedes Abschnitts gleicher Ebene einer Zeile (ZWJ und ZWNJ zählen an ihrer jeweiligen Position). Ein Buchstabe belegt eine Zelle, verbundene Formen bleiben über jede Span-Grenze hinweg erhalten (ein Cursor, ein Farbwechsel), und die Konsole muss sie nie selbst formen.
4. **Die Reihenfolge fixieren.** Die Zellen enthalten jetzt Glyphen in Anzeigereihenfolge. Browser und viele Terminals würden Bidi ein zweites Mal darauf anwenden, deshalb fixieren die Treiber die Reihenfolge:

<!-- s:153724c967 -->
| Ausgabe | Fixierung der Reihenfolge |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Spans mit Rechts-nach-links-Zeichen werden in `LRO … PDF` (U+202D / U+202C) eingeschlossen. Der `%c`-Sanitizer von DevTools entfernt `direction` und `unicode-bidi`. |
| Terminals (`AnsiDriver`, `text run`) | Zeilen mit Rechts-nach-links-Text werden für Terminals, die Bidi pro Zeile anwenden, in `LRO … PDF` eingeschlossen. `renderToTerminal` wechselt beim Start einmal in den expliziten BDSM-Modus nach ECMA-48 (`CSI 8 l`, von VTE-basierten Terminals berücksichtigt) und beim Beenden zurück in den impliziten Modus (`CSI 8 h`); einmalig ausgegebene `renderToAnsi`-Frames mit Rechts-nach-links-Text beginnen mit `CSI 8 l`. Übergib `bidi: "none"`, um Zellen unverändert auszugeben. |
| DOM-Spiegel (`<ConsoleMirror>`) | Der Spiegel verwendet `direction: ltr` (damit eine RTL-Hostseite ihn nicht umkehren kann), und Spans mit Rechts-nach-links-Text erhalten `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` und `<Divider title>` durchlaufen dieselben Schritte (`drawLogicalText(buffer, x, y, text, …)` zeichnet jede einzelne Zeile auf diese Weise), sodass ihre Beschriftungen in der richtigen Reihenfolge und verbunden erscheinen.

<!-- s:3b67946601 -->
Text ohne Rechts-nach-links-Zeichen überspringt all diese Schritte. Ein reines Links-nach-rechts-Textmodell wird beim Segmentieren seiner Grapheme erkannt (ein Vergleich pro Graphem) und über den unveränderten Pfad gezeichnet; die Konsolen-Frames sind bytegleich.

<!-- s:26ac17c25a -->
Zellenbreiten

<!-- s:552e751976 -->
Der ausgelieferte Font-Stack ist `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Keine dieser Schriftarten enthält hebräische oder arabische Glyphen, daher greifen Browser pro Zeichen auf eine Ersatzschrift zurück. Unter macOS ist das Courier New, eine nichtproportionale Schrift mit 0,6 em: 7,2012 px pro Glyphe bei 12 px gegenüber 7,2246 px bei Menlo. Sie ist 0,3 % schmaler, genug, um eine ganze Zeile Hebräisch um etwa eine halbe Zelle zu verschieben.

<!-- s:851f84e769 -->
`CssConsoleDriver` misst jeden Rechts-nach-links-Span mit einem Canvas in der Konsolenschrift (mit derselben Blink-Zeichenformung und Ersatzschriftauswahl wie DevTools) und ergänzt dann den exakten Unterschied in LayoutUnits (1/64 px) als Innenabstand. Der Span ist dadurch so breit wie die Rasterzellen, die er abdeckt (ein breites Graphem wie ein Emoji zählt als zwei). Ein Span wird höchstens um eine halbe Zelle zusammengezogen, sodass eine proportionale Ersatzschrift (Times New Roman neben Cascadia Mono unter Windows) überläuft, statt dass der nächste Span ihre Glyphen überlappt. Gemessen im echten DevTools-Frontend (Chromium 151) mit einem 64×21-Frame aus hebräischen, arabischen, gemischten und hebräischen Zeilen mit Emojis sowie RTL-Box-Titeln (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Frame | Abweichung am rechten Rand zwischen den Zeilen |
| :-- | --: |
| Ohne Fixierung ausgegebene Zellen | 14,5 px (DevTools ordnet um und formt erneut) |
| Fixiert, ohne Breitenanpassung | 2,22 px |
| Ausgelieferter Treiber | 0,156 px |
| Kontrolle: gleiche Zellen, jede RTL-Glyphe durch `x` ersetzt | 1,67 px |

<!-- s:a7ec844aae -->
Der ausgelieferte Frame entspricht in jeder Zeile der rein lateinischen Kontrolle, außer in der Emoji-Zeile, wo er besser abschneidet: Emojis werden zusammen mit dem umgebenden Rechts-nach-links-Span angepasst (0,03 px), während die Links-nach-rechts-Emoji-Zeile der Kontrolle nicht angepasst wird (1,66 px).

<!-- s:318b8b5f4c -->
DevTools zeichnet jeden `%c`-Span mit `contain: paint` und richtet jeden einzeln an Gerätepixeln aus, sodass dort, wo zwei Hintergründe an einer gebrochenen Pixelposition aufeinandertreffen, das Pixel dazwischen keinem von beiden zugeordnet werden kann und eine 1 px breite Haarlinie bleibt. In Chrome und Edge verlängert ein Span mit Hintergrund diesen um 1 px unter einen undurchsichtigen rechten Nachbarn, und ein angepasster Span fügt dieses Pixel seinem Innenabstand hinzu. Keiner der vier Frames oben zeigt eine Haarlinie.

<!-- s:7deafc8e74 -->
Übergib `measureText: false`, um die Anpassung auszuschalten, oder stelle eine eigene Messfunktion `(text, bold, italic) => px` bereit.

<!-- s:f088ff48f9 -->
Eingabe und Bearbeitung

<!-- s:6aca925fed -->
`<Input>` und `<Textarea>` verwenden einen logischen Cursor. Pfeiltasten bewegen sich in Speicherreihenfolge durch den Text, sodass sich ← in Rechts-nach-links-Text sichtbar nach rechts bewegt. Der Blockcursor sitzt auf dem logischen Zeichen, das er abdeckt, unabhängig davon, wohin die Umordnung es verschiebt. Innerhalb eines Rechts-nach-links-Abschnitts ist das die Zelle links vom vorherigen Zeichen. Auch die Auswahl ist ein logischer Bereich, und ihre Hervorhebung kann deshalb in Zeilen mit gemischten Richtungen nicht zusammenhängende Zellen abdecken. Das horizontale Scrollen eines einzeiligen `<Input>` folgt der logischen Spalte, sodass ein langer Rechts-nach-links-Wert den Cursor aus dem sichtbaren Bereich scrollen kann. Ein Cursor auf einem Leerzeichen oder am Textende wird als isoliertes geschütztes Leerzeichen gezeichnet, sodass er neutral bleibt und sich nie mit den Zahlen auf beiden Seiten verbindet.

<!-- s:68c8d3995f -->
Einschränkungen

<!-- s:fbb8008232 -->
- **Absatztrenner.** Zeilen werden bei `\n` getrennt. U+2029 und andere Absatztrenner beenden einen Bidi-Absatz, beginnen aber keine neue Zeile.
- **Tabulatoren.** Tabulatoren werden vor der Bidi-Verarbeitung zu Leerzeichen erweitert und wirken daher als Leerraum (WS), nicht als Segmenttrenner (S).
- **Zeichenformung.** Nur Buchstaben mit Präsentationsformen werden geformt: Arabisch, Persisch, Urdu und die anderen Buchstaben in U+FB50–U+FDFF und U+FE70–U+FEFF. Lam-Alef bleibt als zwei verbundene Buchstaben in zwei Zellen erhalten, statt eine Ligatur aus einer Glyphe zu bilden. Syrisch, N'Ko und andere verbindende Schriften behalten ihre Nominalformen.
- **Kopieren.** Aus der Konsole kopierter Text steht in Anzeigereihenfolge (mit den `LRO`/`PDF`-Markierungen), nicht in logischer Reihenfolge.
- **Terminals.** Terminals, die sowohl BDSM als auch `LRO` ignorieren und ihre eigene Bidi-Verarbeitung ausführen (zum Beispiel mit aktiviertem Bidi in iTerm2), ordnen Rechts-nach-links-Zeilen möglicherweise erneut um.
- **DOM-Spiegel.** `<ConsoleMirror>` passt keine Breiten an, sodass Rechts-nach-links-Abschnitte dort um bis zu 0,3 % ihrer Breite abweichen können.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` und `reorderIndices` stellen den Algorithmus selbst bereit: Regeln P1–I2, L1 und L2.
