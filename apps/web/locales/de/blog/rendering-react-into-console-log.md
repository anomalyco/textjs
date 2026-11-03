<!-- s:16c98cd381 -->
Text.js rendert React-Apps in der Konsole der Chrome DevTools. Abgesehen von einem versteckten Eingabefeld hat die Seite keine UI. Jeder Frame der App ist ein einzelner `console.log`-Aufruf.

<!-- s:fe9cd991d4 -->
Die Konsole als Anzeige

<!-- s:5ae20a07fc -->
`console.log` akzeptiert einen Formatstring. Jedes `%c` wendet das CSS im nächsten Argument auf den folgenden Text an, bis zum nächsten `%c`:

<!-- s:2822a0243c -->
Diese Stile können Farben, Hintergründe, Fettdruck, Kursivschrift und Unterstreichung festlegen, und die Konsolenschrift ist nichtproportional (Menlo unter macOS). Mit einer nichtproportionalen Schrift und Farben, die sich für jede Zeichenfolge ändern können, funktioniert die Konsole als Raster aus formatierten Zeichenzellen. Darauf lassen sich Rahmen, Panels, Eingabefelder und Diagramme zeichnen.

<!-- s:585742694b -->
Ein Frame als Raster aus Zellen

<!-- s:04a12244bc -->
Der Renderer hält jeden Frame in einem `CellBuffer`. Zeichen liegen in einem typisierten Array, Vordergrund- und Hintergrundfarben in zwei weiteren und Attribute wie Fettdruck und Unterstreichung in einem vierten. Die Arrays werden für eine bestimmte Größe einmal angelegt und für jeden Frame wiederverwendet.

<!-- s:2ff86351b3 -->
Um einen Frame zu protokollieren, durchläuft der Treiber jede Zeile und gruppiert benachbarte Zellen mit gleichem Stil zu Folgen. Jede Folge wird zu einem `%c`-Span, und die Zeilen werden mit `\n` verbunden. Unser Test-Dashboard mit 100×32 Zellen, insgesamt 3200 Zellen, wird in etwa 200 Spans kodiert.

<!-- s:48a9b4f008 -->
Ein Aufruf pro Frame

<!-- s:aa2cafe395 -->
Jede Zeile als eigene Nachricht zu protokollieren, funktioniert nicht. Jede Nachricht erhält in DevTools einen eigenen Rahmen und Quellverweis, und DevTools fasst identische aufeinanderfolgende Nachrichten hinter einem Wiederholungszähler zusammen, sodass zwei identische Tabellenzeilen zu einer verschmelzen würden. Ein Frame, der als einzelne Nachricht protokolliert wird, bleibt zusammen.

<!-- s:ea38228d16 -->
Zwei Dinge im Text müssen zuerst maskiert werden. Ein wörtliches `%` wird als `%%` geschrieben, damit Text wie `100%` kein Stilargument verbrauchen kann. DevTools wandelt außerdem URLs in Links um und zeichnet sie in eigenen Farben neu, deshalb erhalten `://` und `www.` einen Word Joiner (U+2060), der keine Breite hat:

<!-- s:ec8783435a -->
Keine Protokollausgabe für unveränderte Frames

<!-- s:8b7f1f9d06 -->
Für jede Zeile des Puffers wird ein Hash berechnet. Wenn sich seit dem letzten Frame kein Hash geändert hat, kehrt der Treiber zurück, bevor er einen String erzeugt, und greift nicht auf die Konsole zu. Eine App, die auf Eingaben wartet, macht keine Aufrufe.

<!-- s:43c3523265 -->
Wenn sich eine Zeile geändert hat, leert der Treiber die Konsole und protokolliert den neuen Frame:

<!-- s:5b584e930a -->
Nur Zeilen, deren Hash sich geändert hat, werden neu kodiert. Die anderen verwenden die Spans des vorherigen Frames wieder.

<!-- s:99a3c4d459 -->
Eingabe

<!-- s:e95aae4719 -->
Die Konsole empfängt keine Tastenanschläge, deshalb erfasst die Seite sie. Ein verstecktes `<textarea>` nimmt Tastendrücke, eingefügten Text und IME-Komposition entgegen und wandelt sie in Tastenereignisse für die App um. Ein Klick auf die Seite gibt ihm den Fokus.

<!-- s:88cae4fc43 -->
Ausblick

<!-- s:cb5f6bd294 -->
Die `@textjs/core`-Prototypen der Version 0.0.x auf npm enthalten alles in einem Paket. Text.js 0.1 verschiebt den hier beschriebenen Renderer nach `@textjs/core`, den React-reconciler nach `@textjs/react` und fügt einen App Router hinzu.
