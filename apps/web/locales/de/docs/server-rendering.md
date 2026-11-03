<!-- s:5c794493de -->
Rendere den React-Baum einer Route auf dem Server und streame seine Frames in die Konsole. Rendere den ersten Frame jeder statischen Route per Prerendering in ihr HTML.

<!-- s:f5f9690d9e -->
Zwei Laufzeitumgebungen

<!-- s:26b5b0c1e5 -->
Jede Seite rendert an einem von zwei Orten:

<!-- s:2b217df435 -->
| | Client (Standard) | Server (`runtime = "server"`) |
| --- | --- | --- |
| React-Baum läuft in | Dem Browser-Tab | `text dev` / `text start` / dem `bun`-Adapter (Bun oder Node) |
| Browser lädt herunter | Die gesamte App: React, Yoga WASM, deine Routen | Den Frame-Player, etwa 21 kB mit gzip |
| Datenzugriff | `fetch()` an Route-Handler | Direkt: Datenbanken, Dateien, `node:*`, Geheimnisse |
| Asynchrone Komponenten | `use()` oder Effekte verwenden | `async function`-Komponenten werden unterstützt |
| Latenz bei Tasteneingaben | Derselbe Task, synchron | Ein Roundtrip zum Server |
| Funktioniert auf einem statischen Host | Ja | Nein, erfordert `text start` oder `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Beide Laufzeitumgebungen erzeugen dieselben Frames. Der Frame-Player kodiert Zellen mit demselben `CssConsoleDriver` und gibt sie mit denselben etwa 15 fps aus, sodass ein serverseitig gerenderter Frame Byte für Byte dem `console.log`-Aufruf des Clients entspricht.

<!-- s:70a0b18bdd -->
Aktivieren

<!-- s:660b2936b0 -->
Exportiere `runtime` aus einer Seite:

<!-- s:567f4b3d2b -->
`runtime` wird pro Seite als statischer String-Export gelesen (eine Typannotation, `as const` oder ein Re-Export sind zulässig; ein berechneter Wert nicht). Layouts, `loading.tsx`, `error.tsx` und `not-found.tsx` rendern dort, wo ihre Seite rendert: Ein von Client- und Server-Seiten gemeinsam genutztes Layout läuft an beiden Orten und wird an den Browser ausgeliefert, während die Layouts und Boundaries eines Segments, das nur Server-Seiten enthält, auf dem Server bleiben. Hooks, Fokus, `useInput`, `<Link>` und `useRouter()` verhalten sich wie auf dem Client.

<!-- s:43c4fa1dac -->
Die passende Laufzeitumgebung wählen

<!-- s:ac38ce3c55 -->
Verwende die **Client**-Laufzeitumgebung (den Standard) für:

<!-- s:ced9e65891 -->
- Oberflächen mit vielen Tastatureingaben, bei denen jeder Tastendruck im selben Task dargestellt werden muss, etwa Editoren und Filter.
- Apps, die auf einem statischen Host oder einem CDN deployt werden.
- Offlinefähige Werkzeuge.

<!-- s:54292284aa -->
Verwende die **Server**-Laufzeitumgebung für:

<!-- s:bb8a20e6e2 -->
- Dashboards und Administrationsansichten, die Datenbanken, Dateien, Queues oder private APIs lesen. Zugangsdaten bleiben auf dem Server.
- Routen mit umfangreichen Abhängigkeiten (SDKs, Parser, Syntaxtabellen), die du nicht im Browser-Bundle haben möchtest.
- Seiten, die auch in langsamen Netzwerken schnell laden sollen. Der Browser lädt den 21 kB großen Player (gzip) statt der gesamten App herunter.

<!-- s:920f4ad7e8 -->
Du kannst Laufzeitumgebungen in einer App mischen. Beim Navigieren zwischen ihnen wird die Ziel-URL als neues Dokument geladen. Das Browser-Bundle ersetzt jede Server-Seite durch einen Platzhalter, sodass Server-Module und alle ihre Importe nie an den Client ausgeliefert werden.

<!-- s:2de98cc507 -->
Benenne reine Server-Module mit `*.server.ts`. Der Build schlägt unter Nennung des importierenden Moduls fehl, wenn Code, der an den Browser ausgeliefert wird (eine Client-Seite oder ein von ihr verwendetes Layout), ein `*.server.*`-Modul oder ein eingebautes `node:*`-Modul importiert.

<!-- s:1c109f371d -->
[Middleware](/docs/middleware) schützt Server-Routen genauso wie Dokumente: Sie läuft für die Zielroute, bevor eine Sitzung geöffnet wird, vor jeder Navigation innerhalb der Sitzung (`router.push`, Zurück und Vorwärts) und erneut, sobald sich die Cookies der Sitzung oder `Authorization` ändern. Wenn sie umleiten, ablehnen oder umschreiben würde, lädt der Browser die URL stattdessen als Dokument, und die Middleware beantwortet diese Anfrage.

<!-- s:44ec23073a -->
Asynchrone Server-Komponenten

<!-- s:491e80d70d -->
Auf dem Server pausiert jede `async function`-Komponente bis zum nächsten `<Suspense>` oder `loading.tsx`, bis ihr Promise aufgelöst ist:

<!-- s:155b6ae10f -->
Jedes Promise wird pro Sitzung zwischengespeichert und anhand von Komponente und Props identifiziert, sodass ein erneuter Render-Versuch die bereits laufende Anfrage wiederverwendet. Der Cache wird bei einem Routenwechsel und bei `router.refresh()` geleert. Rufe `router.refresh()` auf, um den Datenzugriff nach einer Eingabe erneut auszuführen:

<!-- s:abfa753a7c -->
Props, die du an asynchrone Komponenten übergibst, sollten serialisierbar sein: Strings, Zahlen, einfache Objekte, Arrays, `Date`, `URL`, `Map`, `Set` und Elemente. Funktions-Props sind kein Teil des Schlüssels (übergib Daten, keine Callbacks). Jede Sitzung speichert höchstens 256 Promises zwischen. Du kannst eine Komponente auch manuell mit `serverComponent(fn)` aus `@textjs/app/server-components` umschließen.

<!-- s:55cf9764ac -->
Hooks (`useState`, `useInput`, …) funktionieren nicht innerhalb einer `async function`-Komponente. Rendere für Interaktionen eine reguläre Komponente um sie herum oder unter ihr.

<!-- s:5ae438610c -->
Funktionsweise

<!-- s:ec3e56dbc6 -->
- **Eine Sitzung pro Tab.** Jeder Seitenaufruf öffnet eine eigene Sitzung: einen React-Root, einen Router-Verlauf im Arbeitsspeicher und einen Zellenpuffer auf dem Server. Sitzungs-IDs sind 192-Bit-Zufallswerte, die der Browser ausschließlich im Arbeitsspeicher hält.
- **Zellendeltas.** Der Server sendet nur Zeilen, deren Hash sich seit dem letzten über diese Verbindung empfangenen Frame geändert hat. Jede Zeile wird als Textabschnitte mit Verweisen auf eine nur erweiterbare Stiltabelle gesendet, und breite Grapheme, Emoji-Cluster und halbtransparente Farben bleiben exakt erhalten.
- **Rückstau.** Frames liegen mindestens 66 ms auseinander, und jeder wird mit dem verglichen, was der Socket zuletzt angenommen hat. Wenn eine langsame Verbindung keine Daten mehr abnimmt, werden Zwischenzustände übersprungen, und der nächste Frame springt direkt zum neuesten Zustand.
- **Wiederverbindungen.** Wenn der Stream abbricht, verbindet sich der Player mit seiner Sitzungs-ID im `x-textjs-live`-Header (nie in der URL) erneut und setzt dieselbe Sitzung mit unverändertem Zustand ab einem neuen Keyframe fort. Verpasste Aktualisierungen der Adressleiste werden nachgeholt. Eine Sitzung ohne Verbindung hört auf zu rendern und wird nach 30 Sekunden ausgehängt; hat der Server sie vergessen, öffnet der Player eine neue.
- **Verlauf.** Zurück und Vorwärts bewegen beide Verläufe um dieselbe Anzahl von Einträgen, und `router.back()` auf dem Server bewegt auch den Browser-Verlauf.
- **Sicherheit.** Beide Endpunkte lehnen Cross-Site-Anfragen ab (`Sec-Fetch-Site` und `Origin`; `X-Forwarded-Host` zählt nur mit `server.trustProxy`). Eingabe-POSTs benötigen einen JSON-Body und den `x-textjs-live`-Header. Jedes Ereignis wird gegen ein festes Schema validiert, und Navigationsziele müssen Pfade auf deiner Origin sein. Nur Seiten in deinem `app/`-Manifest können gerendert werden. Sitzungen sind an die Cookies gebunden, mit denen sie geöffnet wurden.
- **Grenzen.** Höchstens 64 Ereignisse pro POST und etwa 240 pro Sekunde und Sitzung (darüber `429`), ein Body-Timeout von 5 Sekunden, 32 Sitzungen pro Client-Adresse und `maxSessions` pro Prozess (die am längsten getrennte Sitzung wird zuerst entfernt).

<!-- s:981308ad14 -->
Partielles Prerendering

<!-- s:294fed5642 -->
`text build` rendert jede statische Route einmal in der konfigurierten `viewport`-Größe und bettet diesen ersten Frame als kleines klassisches `<script>` in das HTML der Route ein. Die Konsole zeichnet, bevor ein Modul lädt:

<!-- s:7eb15c9cc8 -->
1. **Die statische Hülle.** Alles, was synchron rendert. Jede noch wartende `<Suspense>`-Boundary zeigt ihren Fallback, einschließlich asynchroner Server-Komponenten (die während des Renderns der Hülle nicht laufen), `use()` und verzögert geladener Module. `fetch()` wird während des Renderns der Hülle nie aufgelöst, sodass auch Daten, die in Effekten geladen werden, im Ladezustand bleiben.
2. **Die dynamischen Lücken.** Wenn JavaScript startet, streamt entweder der Client-Renderer oder der Frame-Player den tatsächlichen Frame. Er wird unterhalb der Hülle angehängt, und der eigene Vorhang des hydrierenden Frames schiebt die Hülle im selben DevTools-Zeichenvorgang aus dem sichtbaren Bereich. Die Hülle zeichnet ihren Darstellungszeitpunkt auf, damit der erste hydrierende Frame das Zeitfenster der DevTools nach dem Leeren abwartet, statt in deren langsamen Ausführungspfad zu geraten.

<!-- s:94c6827f2c -->
Während des Ladens leert nur die Hülle die Konsole. Der hydrierende Renderer startet im Anhängemodus (`initialClear: false`), sodass nichts flackert, und die Hülle zeichnet nur auf dem Pfad, für den sie gerendert wurde. Dynamische Routen (`[id]`, `force-dynamic`) rendern keine Hülle.

<!-- s:1eef464bae -->
Deaktiviere es mit `ppr: false` in `text.config.ts`. Prerendering führt deine Komponenten zur Build-Zeit aus, halte daher Modulcode auf oberster Ebene frei von globalen Variablen, die nur im Browser verfügbar sind. Eine Route, die beim Prerendering einen Fehler auslöst, `redirect()` / `notFound()` aufruft oder navigiert, erhält keine Hülle (ein Fehlerbildschirm wird nie ins HTML eingebettet), und der Build nennt dir den Grund.

<!-- s:c50a022df3 -->
Die Hülle wird mit `viewport.width × viewport.height` gerendert (Standard: `120 × 36`), weil der Build die Konsolengröße des Besuchers nicht kennen kann; der hydrierende Frame passt sich dann an die tatsächliche Konsole an. Die Hülle ist ein Inline-`<script>`: Wenn eine Content Security Policy Inline-Skripte verbietet, erlaube es entweder per Hash oder setze `ppr: false`.

<!-- s:ff96d35008 -->
Deployen

<!-- s:e8a05a5448 -->
`text build` schreibt die folgenden Dateien:

<!-- s:8e75669ec0 -->
| Datei | Zweck |
| --- | --- |
| `index.html`, `<route>/index.html` | Client-Routen mit ihren Hüllen. Funktioniert auf jedem statischen Host. |
| `assets/player-[hash].js` | Der Frame-Player. |
| `.text/server/live.mjs` | Server-Routen, der App Router und der Konsolen-Renderer. |
| `.text/pages/…`, `.text/live.html` | Dokumente der Server-Routen. |
| `.text/ansi/…` | Erste Frames für [curl und andere Terminal-Clients](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` und der [`bun`-Adapter](/docs/deploying#bun) liefern sie alle aus. Server-Routen benötigen einen langlebigen Prozess: Die Adapter `static`, `vercel` und `cloudflare` lassen den Build fehlschlagen (`TX030`).
