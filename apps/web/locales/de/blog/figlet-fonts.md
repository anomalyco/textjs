<!-- s:3c9b7877c3 -->
Text.js 0.3 ergänzte `@textjs/font`, einen Parser und Renderer für FIGlet-Schriftarten. Das Paket enthält die 17 Schriftarten aus der FIGlet-2.2.5-Distribution, jeweils als eigenes ES-Modul, und seine Ausgabe entspricht exakt der des `figlet`-Binary in Version 2.2.5.

<!-- s:ffc9f0eae5 -->
Gründe für FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` hat seit 0.1 zwei integrierte Schriftzüge: `block` und `compact`. FIGlet ist seit 1991 der Standard für diese Art von Schriftzügen, und es gibt Hunderte von `.flf`-Schriftarten. Durch die Unterstützung dieses Formats lässt sich jede davon in einer Konsolen-App einsetzen.

<!-- s:7fdbff5714 -->
Eine FIGlet-Schriftart ist eine reine Textdatei. Eine Kopfzeile legt die Höhe, das Hardblank-Zeichen und die Layout-Regeln fest, danach wird jedes Zeichen als Block aus Zeilen mit einer Endmarkierung am Ende jeder Zeile gezeichnet. In seinen Standard-Layouts verschiebt FIGlet jedes Zeichen nach links, bis es das vorherige berührt, und entscheidet dann anhand der Smushing-Regeln der Schriftart, ob die beiden sich berührenden Teilzeichen zu einem verschmelzen.

<!-- s:4c761bba4d -->
Layout-Modi

<!-- s:3f1c38cf92 -->
`figlet` hat fünf horizontale Layouts, und `renderFiglet` akzeptiert dieselben fünf über `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Wirkung |
| :-- | :-- | :-- |
| `"default"` | `-s` | Eigenes Layout der Schriftart, meist mit Smushing |
| `"full"` | `-W` | Volle Breite; Zeichen berühren sich nie |
| `"fitted"` | `-k` | Zeichen rücken zusammen, bis sie sich berühren |
| `"smushed"` | `-S` | Smushing nach den Regeln der Schriftart |
| `"universal"` | `-o` | Spätere Zeichen überlagern frühere |

<!-- s:7a1307992e -->
Eine Zahl von -1 bis 63 ist ein direkter `-m`-Layout-Modus: `-1` steht für volle Breite, `0` für Einpassen, und `1` bis `63` wählen Smushing-Regeln aus. Alle sechs horizontalen Smushing-Regeln sind implementiert: gleiches Zeichen, Unterstrich, Hierarchie, entgegengesetztes Paar, großes X und Hardblank. Der Parser verarbeitet auch den Rest des Formats: Kommentarzeilen, mit dezimalen, oktalen und hexadezimalen Codes markierte Zeichen, die Glyphe für fehlende Zeichen und Rechts-nach-links-Schriftarten wie `ivrit`.

<!-- s:0c920c94d3 -->
Auch der Zeilenumbruch folgt FIGlet. `width` bricht an Wortgrenzen um und innerhalb eines Wortes, wenn es breiter als die Zeile ist, genau dort, wo `figlet -w` umbrechen würde. `figlet -w 80` gibt höchstens 79 Spalten aus, daher entspricht `-w N` der Einstellung `width: N - 1`.

<!-- s:729dda48fc -->
Übereinstimmung mit dem Binary

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` enthält 273 Ausgaben, die mit dem echten `figlet` 2.2.5 für jede enthaltene Schriftart in jedem Layout-Modus erzeugt wurden, mit Zeilenumbruch, Ausrichtung, Rechts-nach-links-Text, Absatzmodus und FIGlets eigenen Regressionseingaben mit den Flags aus dessen `run-tests.sh`. Jeder Fall speichert die Argumente, die Eingabe und die exakte Ausgabe, und der Test wandelt die Kommandozeile wieder in Optionen um:

<!-- s:d31215cb4b -->
Alle 273 stimmen überein. Um die Testdaten neu zu erzeugen, füge `figlet` 2.2.5 zu deinem `PATH` hinzu und führe `bun run --cwd packages/font references` aus.

<!-- s:9854b41cbc -->
Schriftarten im Zellenraster

<!-- s:ede6764977 -->
Jede enthaltene Schriftart zeichnet mit druckbarem ASCII oder Latin-1, sodass jedes Teilzeichen in Menlo genau eine Zelle belegt und am Raster ausgerichtet ist. `<FigletText>` misst seine Zeilen in Zellen, sodass Schriftzüge wie jedes andere `<Text>` in einem flexbox-Layout sitzen und `columns` und `align` sie innerhalb ihrer Box umbrechen und ausrichten.

<!-- s:3cedd51e92 -->
Jede Schriftart ist ein eigenes Modul, sodass eine App nur die Schriftarten ausliefert, die sie importiert, und eine Schriftart erst beim ersten Rendern statt beim Import geparst wird. `@textjs/font/all` exportiert alle Schriftarten für Galerien.

<!-- s:9d54eeef4f -->
Jede andere FIGfont lässt sich zur Laufzeit abrufen und parsen:

<!-- s:f64649f401 -->
Lizenzierung

<!-- s:67e882f6b4 -->
Die enthaltenen Schriftarten sind byteidentisch mit denen in `figlet-2.2.5.tar.gz` und werden unter FIGlets BSD-3-Klausel-Lizenz verbreitet. Jede behält ihre Urheberangaben in ihren Kommentarzeilen, abrufbar über `font.comment`. Beliebte Schriftarten ohne Erlaubnis zur Weiterverbreitung, etwa Doom, Larry 3D, ANSI Shadow und Calvin S, sind nicht enthalten.

<!-- s:ee98166722 -->
Die vollständige Referenz findest du unter [Schriftarten](/docs/fonts).
