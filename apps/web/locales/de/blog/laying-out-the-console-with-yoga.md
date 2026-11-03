<!-- s:e4dabd0578 -->
Yoga berechnet das Layout jedes Text.js-Frames. Die flexbox-Engine kommt auch in React Native zum Einsatz und ist hier zu WebAssembly kompiliert. Boxen und Text teilen sich einen Yoga-Baum. Die Konsole ist ein Raster aus Zeichenzellen, daher müssen alle berechneten Positionen und Größen einer ganzen Anzahl von Zellen entsprechen.

<!-- s:9c86e1b16d -->
Ein Punkt entspricht einer Zelle

<!-- s:9026ebff4f -->
Yoga rundet seine Ergebnisse auf ein Pixelraster, das der Punktskalierungsfaktor vorgibt. Bei 2, wie auf einem Retina-Bildschirm, können Kanten auf halben Punkten liegen. Text.js lädt Yoga einmal und setzt den Faktor auf 1:

<!-- s:f5193c7abd -->
Mit einem Faktor von 1 rundet Yoga jede Kante auf eine ganze Einheit, und Text.js behandelt eine Einheit als eine Zelle. Yoga rundet die absolute Position jeder Kante und leitet die Größen aus den gerundeten Kanten ab, sodass benachbarte Boxen eine gemeinsame Kante haben. Teile eine Zeile mit 81 Spalten in zwei Boxen mit `width="50%"` auf, und eine erhält 40 Spalten, die andere 41, ohne Lücke und ohne Überlappung.

<!-- s:4f9619621a -->
Text.js wendet die CSS-Standardwerte selbst an: `flexDirection` ist `row` und `flexShrink` ist `1`, wie in einem Browser.

<!-- s:5240062c19 -->
Text messen

<!-- s:25f0052f43 -->
Textknoten sind Blätter im Yoga-Baum mit einer Messfunktion. Yoga ruft sie mit der verfügbaren Breite auf, und Text.js gibt die Größe des Textes in Zellen zurück:

<!-- s:a543588dc9 -->
Text, der hineinpasst, wird in seiner natürlichen Größe zurückgegeben. Text, der nicht hineinpasst, wird bei der verfügbaren Breite umgebrochen, und seine Höhe entspricht der Anzahl der Zeilen. Der Knoten speichert seinen letzten Umbruch, sodass eine erneute Messung mit derselben Breite den Text nicht erneut umbricht.

<!-- s:3c253fdc4c -->
Graphemcluster messen

<!-- s:7d52c4b9c9 -->
Die `length` einer Zeichenkette zählt UTF-16-Codeeinheiten, was wenig darüber aussagt, wie viele Zellen sie füllt. Text wird zunächst mit `Intl.Segmenter` in Graphemcluster aufgeteilt, sodass `e` gefolgt von einem kombinierenden Akzent einen Cluster bildet, ebenso wie eine durch Zero-Width Joiner verbundene Emoji-Sequenz. Anschließend erhält jeder Cluster eine Breite:

<!-- s:f36acd4206 -->
| Text | Zellen | Begründung |
| :-- | --: | :-- |
| `abc` | 3 | Eine Zelle pro Zeichen |
| `你好` | 4 | Breite ostasiatische Zeichen belegen zwei |
| `🚀` | 2 | Die Emoji-Darstellung belegt zwei |
| `é` (`e` + U+0301) | 1 | Kombinierende Zeichen belegen keine |
| `─│┌▼←⠋` | 6 | Rahmenzeichen, geometrische Formen, Pfeile und Braille sind auf eine Zelle festgelegt |

<!-- s:75d5c21868 -->
Rahmenzeichen, das Zeichen `▼`, Pfeile und Spinner-Frames werden immer als eine Zelle gemessen, sodass der Rahmen einer Box ihren Inhalt nie aus der Ausrichtung schiebt.

<!-- s:cee20acd8c -->
Druckbare ASCII-Zeichen überspringen die Segmentierung, und andere Breiten werden pro Codepunkt und pro Cluster zwischengespeichert.

<!-- s:5f37d5a215 -->
Zeilenumbruch

<!-- s:b59adefd34 -->
`<Text>` akzeptiert einen `wrap`-Modus:

<!-- s:0ad0b36724 -->
- `wrap` (der Standard) bricht an Leerzeichen um und innerhalb eines Wortes, wenn das Wort breiter als die Zeile ist.
- `nowrap` behält eine Zeile bei und lässt die Box sie abschneiden.
- `truncate-end`, `truncate-middle` und `truncate-start` behalten eine Zeile bei und ersetzen alles, was nicht hineinpasst, durch `…`.

<!-- s:73ec8f197a -->
Auch das Kürzen zählt Zellen, sodass eine Zeile mit chinesischem Text an einer Zeichengrenze abgeschnitten wird und das Auslassungszeichen genau eine Zelle belegt.

<!-- s:1d11d6a370 -->
In der Praxis

<!-- s:50e47bf264 -->
Hier steht eine Seitenleiste mit 30 Spalten neben einem Bereich, der die restliche Breite einnimmt:

<!-- s:f9394d30d6 -->
In einer Konsole mit 100 Spalten belegt die Seitenleiste einschließlich ihres Rahmens 30 Spalten, und der Gesprächsbereich belegt die übrigen 70. Ein Rahmen belegt auf jeder Seite eine Zelle, daher wird der Sitzungstitel bei 28 Zellen gekürzt.
