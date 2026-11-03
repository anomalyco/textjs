<!-- s:710c25737e -->
In einem DOM-Framework werden Komponenten zu DOM-Knoten, die der Browser auf der Seite anordnet und zeichnet. In Text.js werden Komponenten zu Zellen, und jeder geänderte Frame aus Zellen wird zu einem `console.log`-Aufruf in DevTools. Wir nennen das die invertierte Architektur.

<!-- s:d00a01bf6f -->
Die Pipeline

<!-- s:12c6e8f741 -->
Jede Stufe existiert, weil die Konsole eine ungewöhnliche Anzeige ist. Sie verwendet eine Festbreitenschrift und ist zeilenorientiert, wird mit `%c` gestaltet, und DevTools entscheidet, wann sie neu gezeichnet wird.

<!-- s:db7daa7cf2 -->
Reconciler

<!-- s:f3cdc101e1 -->
`@textjs/react` ist ein Reconciler für React 19 (`react-reconciler@0.34.0`) mit zwei Host-Elementen, `tx-box` und `tx-text`, sowie Textinstanzen für String-Kindelemente. Alles, was du importierst, von `<Box>` bis `<Markdown>`, baut darauf auf. Commits werden über `requestAnimationFrame` eingeplant, und ein Tastendruck oder Einfügen löst synchron im selben Task das Rendering aus.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, zu WebAssembly kompiliert, ordnet den Baum mit `pointScaleFactor = 1` an, sodass jede Box auf einer ganzen Zelle landet. Text wird mit `Intl.Segmenter` und ostasiatischen Zeich­enbreitentabellen gemessen, sodass `你好` vier Zellen und `🚀` zwei belegt. Wenn eine Änderung die Größe eines Textknotens nicht ändern kann, wird Yoga nicht erneut aufgerufen.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Der Frame ist ein Raster aus einmalig angelegten typisierten Arrays: Zeichen in einem `Uint32Array`, Vorder- und Hintergrund als gepacktes `0xRRGGBBAA`, Attribute als `Uint16Array`-Bitmaske. Beim Zeichnen werden diese Arrays beschrieben und die betroffenen Zeilen erfasst.

<!-- s:2a9b8dd7b1 -->
Die Prüfschranke

<!-- s:1cdfa61881 -->
Jede Zeile hat einen zwischengespeicherten 32-Bit-FNV-1a-Hash. Nur für Zeilen, die seit dem letzten Frame beschrieben wurden, wird der Hash neu berechnet. Wenn sich keine Zeile geändert hat, kehrt der Treiber zurück, bevor er einen String erstellt, und führt keinen Konsolenaufruf aus. Ein Spinner in einem ausgeblendeten Tab kostet nichts, weil er nicht weiterläuft.

<!-- s:a36177ad5b -->
Lauflängenkodierung

<!-- s:c372fac68d -->
Geänderte Zeilen werden erneut in Abschnitte mit identischem Stil zerlegt, und jeder Abschnitt wird zu einem `%c`-Span. Abschnitte laufen über Zeilenumbrüche hinweg weiter. CSS-Strings werden unter ganzzahligen Stil-IDs intern gespeichert, sodass der häufig ausgeführte Codepfad denselben String nie zweimal erstellt. Ein 100×32-Dashboard umfasst 3200 Zellen und 149 Spans.

<!-- s:922d9e42bd -->
Der Formatstring schützt auch vor zwei Verhaltensweisen von DevTools. Ein wörtliches `%` wird als `%%` geschrieben. Ein Word Joiner steht nach `://`, innerhalb von `www.` und in `path:line`, damit DevTools deinen Text nicht in einen Link umwandelt und in eigenen Farben neu zeichnet.

<!-- s:f55ed8e2b0 -->
Ein Aufruf

<!-- s:b57bb25475 -->
Jeder geänderte Frame ist ein einzelner Aufruf:

<!-- s:e3e37e3616 -->
Frames werden angehängt, auf die 50-ms-Drosselung von DevTools abgestimmt und innerhalb eines Zeichenvorgangs ausgetauscht. [Turbolog: Das Aufblitzen beseitigen](/blog/turbolog-eliminating-the-flash) behandelt diesen Teil.

<!-- s:99a3c4d459 -->
Eingabe

<!-- s:e569f67f37 -->
Die Konsole kann keine Tastendrücke empfangen, also übernimmt das die Seite. Ein verborgenes `<textarea>` erfasst Tastendrücke, eingefügten Text und IME-Komposition, und `wheel`-Ereignisse scrollen `ScrollBox`-Komponenten. Auf textjs.org sind die Seiten Playground und OpenCode jeweils eine große Fokusfläche. Öffne die Konsole und klicke dann auf die Seite, um zu tippen.

<!-- s:7db6aa160c -->
Die Sicht der Seite

<!-- s:03e00f4b44 -->
Die Seite kann die Größe der Konsole nicht auslesen, nur die ihres eigenen Fensters, also leitet Text.js sie ab: Ein angedocktes Panel verkleinert `innerWidth` oder `innerHeight`, während `outer*` gleich bleibt, und jede Annahme zur Andockposition wird für die Zoomstufen von Chrome durchgerechnet. Die beste Übereinstimmung gewinnt. Die Konstanten (56 px horizontaler Innenabstand, 104 px für die Bedienoberfläche der Konsole, 14 px Zeilenabstand) wurden im tatsächlichen DevTools-Frontend gemessen.
