<!-- s:c351b288ae -->
`text mcp` führt dein `app/`-Verzeichnis ohne Oberfläche im selben Prozess aus und stellt es über das [Model Context Protocol](https://modelcontextprotocol.io) bereit, damit Coding-Agenten es ohne DevTools nutzen können. Der Agent navigiert, drückt Tasten, liest Frames als Klartext und ruft Route-Handler auf.

<!-- s:c66b3eaae7 -->
`text mcp` benötigt Bun. Wenn du es mit Node startest, startet es sich erneut mit Bun, sofern `bun` in deinem `PATH` liegt, und schlägt andernfalls mit `TX019` fehl. MCP-Clients starten es für dich, sodass du es selten von Hand ausführst.

<!-- s:0ecddf15e1 -->
Einrichtung

<!-- s:91bda9ef42 -->
Jeder Client startet `text mcp` aus deinem Projektverzeichnis. Verwende `bunx --bun`, damit Route-Dateien als TypeScript ausgeführt werden.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Oder committe es für das Team:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Hänge für ein Projekt in einem Unterverzeichnis den Pfad an: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Tools

<!-- s:93ae76f73d -->
| Tool | Beschreibung |
| :-- | :-- |
| `list_routes` | Seiten und Route-Handler in `app/` sowie der aktuelle Ort |
| `navigate` | Einen Pfad hinzufügen oder ersetzen oder mit `back` / `forward` zurück- oder vorgehen |
| `read_frame` | Der Frame als Text mit Route, Größe, Fokus und Cursor. `styles: true` ergänzt Farben und Attribute pro Span |
| `press` | Tastenkombinationen: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Text mit einem Tastendruck pro Zeichen eingeben (bis zu 2000; für mehr `paste` verwenden). `submit: true` drückt danach Enter |
| `paste` | Ein Einfügeereignis wie `⌘V` |
| `scroll` | Mit dem Mausrad um `rows` (und `cols`) scrollen. Eine `<ScrollBox>` scrollt per Mausrad ohne Tastaturfokus |
| `resize` | Die Rastergröße in Spalten und Zeilen festlegen |
| `inspect_tree` | Der Komponentenbaum mit Bildschirmgrenzen und jeder fokussierbaren ID |
| `find` | Grenzen jedes Treffers und die darunterliegende Komponente |
| `wait_for` | Darauf warten, dass Text erscheint oder verschwindet oder die App in den Ruhezustand wechselt |
| `logs` | Erfasste `console.*`-Ausgaben und React-Fehler |
| `fetch` | Einen `route.ts`-Handler im selben Prozess aufrufen. Antwortkörper werden bis `maxBytes` gelesen; Ereignisstreams für `streamMs`, dann abgebrochen |
| `reload` | Die App nach Dateiänderungen erneut importieren |

<!-- s:526235e5c5 -->
Eingabe-Tools geben den neuen Frame zurück, sodass der Agent nicht nach jedem Tastendruck ein separates `read_frame` benötigt. Der aktuelle Frame und die Routenliste sind auch als Ressourcen `text://frame` und `text://routes` verfügbar.

<!-- s:c30236f97d -->
Ein typischer Austausch:

<!-- s:45e18bfa25 -->
Frames und Ruhezustand

<!-- s:f2e8fe0f06 -->
Bevor ein Tool einen Frame liest, wartet es auf den Ruhezustand der App: kein Frame geplant, kein laufender `fetch` und seit 50 ms kein Commit oder Frame. So sieht der Agent das Ergebnis seiner Eingabe und keinen Frame mitten in einer Aktualisierung.

<!-- s:fbad6f5c1a -->
Ein `<Spinner>` oder ein Diagramm, das sich einmal pro Sekunde aktualisiert, gilt zwischen den Aktualisierungen weiterhin als im Ruhezustand, sodass Seiten mit Animationen lesbar bleiben. Eine App, die häufiger als alle 50 ms rendert, erreicht nie den Ruhezustand. Lesevorgänge geben nach 1,5 Sekunden auf (`settleMs` ändert dies), geben den neuesten Frame aus und markieren ihn als `busy`. `wait_for` ohne Text wartet mit einem eigenen `quietMs` auf den Ruhezustand und gibt einen Fehler zurück, wenn dieser nie eintritt.

<!-- s:c5250c2f7a -->
Koordinaten sind nullbasierte Zellen: `x` ist die Spalte, `y` die Zeile. Breite Zeichen wie CJK-Zeichen und Emojis belegen zwei Spalten.

<!-- s:7ff82431c5 -->
Fehler und Logs

<!-- s:6e07cf8702 -->
stdout überträgt das Protokoll. Die `console.*`-Ausgaben deiner App, vereinzelte `process.stdout.write`-Aufrufe und React-Fehler landen stattdessen in `logs`, nummeriert, damit ein Agent mit `since` nur neue Einträge abfragen kann. Wenn seit dem letzten Lesen Fehler protokolliert wurden, weist der nächste Frame-Header darauf hin.

<!-- s:9102068439 -->
Fehlschläge werden als Tool-Fehler zurückgegeben, nie als Absturz. Ein Tool mit Zeitüberschreitung wird abgebrochen, bevor der nächste Aufruf startet, sodass ein langsamer Aufruf nie in den Frame des nächsten Aufrufs tippt. Fehler mit einem Text.js-Code behalten ihn, etwa `TX007` für eine unbekannte Taste. Wenn die App nicht geladen werden kann, erklärt jedes Tool den Grund. Korrigiere die Datei und rufe `reload` auf.

<!-- s:d3ad6f781e -->
Optionen

<!-- s:c9c30c0da4 -->
| Option | Beschreibung |
| :-- | :-- |
| `--path <pathname>` | Erste Route (Standard `/`) |
| `--cols` / `--rows` | Rastergröße (Standard: `viewport` in `text.config.ts`, sonst 100×32) |
| `--theme <name>` | Theme-Voreinstellung |
| `--no-config` | `text.config.ts` ignorieren |
| `--verbose` | Erfasste Logs auch auf stderr schreiben |

<!-- s:5ae438610c -->
Funktionsweise

<!-- s:7c71219a13 -->
`text mcp` führt deine App genauso aus wie [`text run`](/docs/terminal): Jedes Route-Modul wird vorab importiert, der App Router verwendet einen Verlauf im Arbeitsspeicher, und `fetch("/api/…")`-Aufrufe mit gleichem Ursprung führen deine Handler im selben Prozess aus. Frames gehen in ein nicht sichtbares Zellenraster statt in ein Terminal. Serverseitig gerenderte Seiten (`export const runtime = "server"`) und ihre `async function`-Komponenten rendern wie bei `text dev` im selben Prozess, und der Frame wird gelesen, sobald sie abgeschlossen sind.

<!-- s:c965dcc0e4 -->
`reload` hängt die App aus, entfernt jedes Projektmodul aus dem Modulcache von Bun (einschließlich Dateien außerhalb von `app/`), durchsucht `app/` erneut und hängt die App am aktuellen Ort wieder ein.

<!-- s:19d6f0da69 -->
So bettest du den Server in deinen eigenen Prozess ein oder verwendest einen anderen Transport:

<!-- s:68c8d3995f -->
Einschränkungen

<!-- s:910af21777 -->
- Die App läuft in Bun, nicht in einem Browser. `window` und `document` sind wie bei `text run` nicht definiert.
- Jeder Server führt eine App mit einem Raster aus. Jeder MCP-Client startet seinen eigenen Server.
- `text mcp` führt eine eigene Kopie der App ohne Oberfläche aus. Es kann sich nicht mit einem unter `text dev` geöffneten Browser-Tab verbinden.
