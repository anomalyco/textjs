<!-- s:263d7e4a86 -->
Die Text.js-DevTools-Erweiterung fügt neben „Konsole“ einen Bereich **Text.js** hinzu. Er untersucht die App, die in der Konsole rendert.

<!-- s:becd3b25ff -->
- **Komponenten:** der React-Baum jedes Konsolen-Roots mit Props, Hooks, Keys und den dahinterliegenden Szenenknoten `tx-box` / `tx-text`, angeordnet in Zellen.
- **Frame:** der aktuelle Frame als Zellenraster. Bewege den Mauszeiger über eine Zelle, um zu sehen, welche Komponente sie gezeichnet hat. Klicke, um den Knoten auszuwählen. Er wird in der laufenden Konsole hervorgehoben.
- **Zeitleiste:** Zeiten für React, Layout, Zeichnen und Kodieren pro Frame, übersprungene und ausgegebene Frames, Frame-Abstände und `%c`-Spans.
- **Steuerung:** Ausgabe pausieren und fortsetzen, Layout-Drahtgitter ein- und ausschalten, Rastergröße fixieren oder anpassen, den Frame als Text kopieren.

<!-- s:98304b8243 -->
Installation

<!-- s:2452819f12 -->
Die Erweiterung wird aus `packages/devtools-extension` gebaut und entpackt geladen:

<!-- s:3754c750b3 -->
1. Öffne `chrome://extensions` und aktiviere den **„Entwicklermodus“**.
2. Klicke auf **„Entpackte Erweiterung laden“** und wähle `packages/devtools-extension/dist` aus.
3. Lade deine App neu und öffne DevTools. Der Bereich **Text.js** erscheint, sobald die Seite einen Konsolen-Root erstellt.

<!-- s:e0c59fa53a -->
Der Build erstellt außerdem `release/textjs-devtools-<version>.zip`, bereit für den Chrome Web Store.

<!-- s:364bc3ef6f -->
Komponenten

<!-- s:e1204a3559 -->
Wähle eine Komponente aus, um ihre Props, ihre Hooks in Aufrufreihenfolge (`State`, `Ref`, `Memo`, `Effect` und so weiter, mit aktuellen Werten) und den von ihr gerenderten Szenenknoten mit Position, Größe und Box-Innenabständen in Zellen zu sehen. Wenn du den Mauszeiger über eine Zeile bewegst, wird der Knoten in der Konsole hervorgehoben. **Host-Knoten** blendet die Elemente `tx-box` und `tx-text` zwischen Komponenten ein oder aus.

<!-- s:77b62adc9c -->
Der Baum aktualisiert sich nach Commits, solange der Bereich geöffnet ist. Werte sind Zusammenfassungen für die Anzeige, keine Live-Objekte.

<!-- s:a0d819048c -->
Frame

<!-- s:2cceea6000 -->
Der Frame-Inspektor zeichnet den Zellenpuffer des Renderers: jede Glyphe, jeden Vordergrund, Hintergrund und jedes Attribut. Wenn du den Mauszeiger über eine Zelle bewegst, siehst du ihr Zeichen und ihre Farben, den in Zeichenreihenfolge obersten Szenenknoten (unter Berücksichtigung von `overflow`, Scroll-Versatz und `zIndex`) sowie die Komponenten, die diesen Knoten gerendert haben. Ein Klick wählt den Knoten unter **Komponenten** aus und hebt ihn in der laufenden Konsole mit dem eigenen Hervorhebungs-Overlay des Renderers hervor.

<!-- s:57a8990372 -->
Zeitleiste

<!-- s:2187cf7a17 -->
Jeder Balken entspricht einem Renderer-Frame:

<!-- s:f53def4922 -->
| Phase | Messung |
| --- | --- |
| React | Synchrone React-Arbeit, die zu Beginn des Frames ausgeführt wird |
| Layout | Yoga-Layout |
| Zeichnen | Rastern der Szene in den Zellenpuffer |
| Kodieren | Erstellen der `%c`-Formatzeichenfolge und Aufrufen von `console.log()` |

<!-- s:9b988f3cfb -->
Übersprungene Frames erscheinen blasser: Es hat sich nichts geändert, also wurde nichts ausgegeben. Das Diagramm der Frame-Abstände zeigt den Abstand zwischen ausgegebenen Frames im Vergleich zum Mindestintervall von 66 ms.

<!-- s:8abccb04ec -->
Die Zeitmessung endet bei `console.log()`. Formatierung und Zeichnen der Nachricht finden in DevTools statt und lassen sich von der Seite aus nicht beobachten, daher zeigt die Zeitleiste sie nicht an. Nebenläufige Render-Vorgänge, die zwischen Frames committen, werden als Commits gezählt, aber nicht zeitlich erfasst.

<!-- s:5ae438610c -->
Funktionsweise

<!-- s:1dda342130 -->
Wie React DevTools installiert die Erweiterung einen globalen Hook, bevor die Seite ausgeführt wird:

<!-- s:9a7af3e89c -->
Jede Konsolen-Root registriert sich bei ihm. Die erste Root auf einer Seite lädt den Code, der mit dem Panel kommuniziert (etwa 5 KB gzip), und registriert sich, sobald er geladen ist. Weitere Roots registrieren sich beim Erstellen. Ohne die Erweiterung existiert der Hook nicht, daher prüft eine Root einmal, ob er vorhanden ist, lädt nichts und führt keine Arbeit pro Frame aus. Ist die Erweiterung installiert, aber das Panel geschlossen, kostet jeder Frame einen Eigenschaftszugriff. Bäume und Frames werden nur berechnet, wenn das Panel sie anfordert.

<!-- s:843fc9a8ad -->
Nachrichten fließen von der Seite → Content-Skript → Service-Worker → Bereich. Die Content-Skripte laufen auf jeder Seite, damit der Hook existiert, bevor deine App startet. Das ist der einzige Zugriff, den die Erweiterung anfordert. Sie lädt keinen entfernten Code und sendet nichts vom Rechner.

<!-- s:e425f181df -->
Datenschutz

<!-- s:f2cd52a110 -->
Die Erweiterung erfasst keine Daten. Sie stellt keine Netzwerkanfragen, speichert nichts und verwendet keine Analysewerkzeuge. Komponentenbäume, Frames und Zeitmessungen werden nur zwischen der Seite und dem DevTools-Bereich im selben Browser übertragen und beim Schließen von DevTools verworfen. **Frame kopieren** schreibt den Text des Frames in deine Zwischenablage, wenn du darauf klickst.

<!-- s:639d5ea4c0 -->
Einschränkungen

<!-- s:05616a1196 -->
- Chrome und Chromium-basierte Browser ab Version 111.
- Apps, die vor der Installation der Erweiterung gestartet wurden, müssen neu geladen werden.
- Nur der oberste Frame eines Tabs wird untersucht.
- Die Zeitleiste zeichnet Frames auf, sobald das Panel verbunden ist.
- Zeiten stammen von `performance.now()`, dessen Auflösung Browser auf etwa 0,1 ms begrenzen.
