<!-- s:f0ba49aa8c -->
Text.js 0.4 hat einen zweiten Ort zum Rendern einer Seite hinzugefügt. Standardmäßig läuft der React-Baum einer Seite im Browser-Tab. Eine Seite, die `runtime = "server"` exportiert, läuft stattdessen auf dem Server, und der Browser empfängt ihre Frames.

<!-- s:1a12ccffbb -->
`Load` ist eine `async function`-Komponente. Auf dem Server pausiert sie an der nächsten `<Suspense>`-Grenze oder `loading.tsx`, bis ihr Promise aufgelöst ist, und kann Dateien, Datenbanken und `node:*`-Module direkt lesen. Asynchrone Komponenten laden Daten und können keine Hooks verwenden. Die regulären Komponenten um sie herum behalten Hooks, Fokus, `useInput`, `<Link>` und `useRouter()`, die sich in beiden Laufzeitumgebungen gleich verhalten.

<!-- s:f6c454b214 -->
Downloads des Browsers

<!-- s:6764f4bb25 -->
Eine serverseitig gerenderte Seite liefert weder React noch Yoga noch deine Routen aus. Der Browser lädt einen Frame-Player mit etwa 21 kB gzip, der einen `CellBuffer` und denselben `CssConsoleDriver` wie der Client-Renderer enthält. Er gibt Frames mit denselben 15 fps aus, sodass ein serverseitig gerenderter Frame denselben `console.log`-Aufruf erzeugt wie der Client.

<!-- s:c1c4090983 -->
Das Protokoll

<!-- s:20c7e299b3 -->
Jeder Tab öffnet eine eigene Sitzung auf dem Server: eine React-Root, einen Router-Verlauf im Arbeitsspeicher und einen Zellenpuffer. Ein Endpunkt überträgt in beide Richtungen:

<!-- s:0cce1c98cc -->
Der Server sendet nur die Zeilen, deren Hash sich seit dem letzten über diese Verbindung empfangenen Frame geändert hat. Jede Zeile wird als Folge von Textabschnitten mit Verweisen auf eine ausschließlich durch Anhängen erweiterte Stiltabelle übertragen. Breite Grapheme, Emoji-Cluster und durchscheinende Farben kommen unverändert an.

<!-- s:bff22f361e -->
Zwischen Frames liegen mindestens 66 ms, und jeder wird mit dem verglichen, was der Socket zuletzt angenommen hat. Wenn eine langsame Verbindung keine Daten mehr abnimmt, werden Zwischenzustände übersprungen, und der nächste Frame springt zum neuesten Zustand.

<!-- s:f0809ea8c7 -->
Wenn der Stream abbricht, verbindet sich der Player mit seiner Sitzungs-ID im `x-textjs-live`-Header erneut und setzt dieselbe Sitzung mit einem neuen Keyframe und unverändertem Zustand fort. Sitzungs-IDs sind zufällige 192-Bit-Werte, die im Arbeitsspeicher liegen, niemals in der URL. Eine Sitzung ohne Verbindung hört auf zu rendern und wird nach 30 Sekunden ausgehängt.

<!-- s:2c75bd5d29 -->
Beide Endpunkte lehnen Cross-Site-Anfragen ab, und jedes Eingabeereignis wird anhand eines festen Schemas validiert. Eine Sitzung akzeptiert höchstens 64 Ereignisse pro POST und etwa 240 pro Sekunde.

<!-- s:a36b73dab0 -->
Asynchrone Komponenten und Daten

<!-- s:2620366315 -->
Das Promise jeder asynchronen Komponente wird pro Sitzung zwischengespeichert, mit der Komponente und ihren Props als Schlüssel, sodass ein erneuter Render-Versuch die bereits laufende Anfrage wiederverwendet. Der Cache wird geleert, wenn sich die Route ändert und wenn du `router.refresh()` aufrufst:

<!-- s:64ce138e40 -->
Module, die nur auf dem Server laufen, heißen `*.server.ts`. Der Build schlägt fehl, wenn Code, der an den Browser ausgeliefert wird, ein solches Modul oder ein `node:*`-Built-in importiert, und nennt das importierende Modul.

<!-- s:981308ad14 -->
Partielles Prerendering

<!-- s:9142a7d770 -->
Partielles Prerendering funktioniert ohne Server. `text build` rendert jetzt jede statische Route einmal und bettet ihren ersten Frame als kleines klassisches `<script>` in das HTML der Route ein, sodass die Konsole zeichnet, bevor ein Modul geladen wird.

<!-- s:d51b081ec7 -->
Die Shell umfasst alles, was synchron gerendert wird. Eine noch wartende `<Suspense>`-Grenze zeigt ihren Fallback, auch bei asynchronen Komponenten, und `fetch()` wird während des Renderns der Shell nie aufgelöst.

<!-- s:33ba4145a3 -->
Wenn JavaScript startet, streamt der Client-Renderer oder der Frame-Player den eigentlichen Frame. Da 0.4 Frames außerdem anhängt, statt die Konsole zu leeren, startet der hydrierende Renderer mit `initialClear: false` und gibt unterhalb der Shell aus, und sein Vorhang schiebt die Shell im selben DevTools-Zeichenvorgang aus dem sichtbaren Bereich. Die Konsole wird genau einmal geleert, durch die Shell.

<!-- s:f6986897ee -->
Die Shell wird in der konfigurierten `viewport`-Größe gerendert, standardmäßig `120 × 36`, da der Build die Konsolengröße des Besuchers nicht kennen kann. Wenn `viewport.responsive` aktiviert ist, passt sich der erste Live-Frame an die angedockte Konsole an. Dynamische Routen rendern keine Shell, und `ppr: false` in `text.config.ts` schaltet das Prerendering aus.

<!-- s:c61865edfd -->
Eine Laufzeitumgebung wählen

<!-- s:aa5baec7ef -->
Die Client-Laufzeitumgebung bleibt der Standard. Tasteneingaben werden im selben Task gezeichnet, und die App lässt sich auf jedem statischen Host deployen. Die Server-Laufzeitumgebung eignet sich für Dashboards und Verwaltungsansichten, die private Daten lesen, sowie für Routen, deren Abhängigkeiten du nicht im Browser-Bundle haben möchtest. Eine App kann beide kombinieren, und beim Navigieren zwischen ihnen wird die Ziel-URL als neues Dokument geladen.

<!-- s:68f8c75df7 -->
Die vollständige Referenz findest du unter [Server-Rendering](/docs/server-rendering).
