<!-- s:e9f791b208 -->
`text run` rendert eine App Router-App in einem Terminal. Layout, Komponenten, Keymaps und Route-Handler werden gemeinsam mit dem Browser genutzt. Die Ausgabe erfolgt als Truecolor-ANSI statt als `%c`-Spans.

<!-- s:7d8aa376e3 -->
Drücke `Ctrl+C` zum Beenden. `text run` benötigt Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importiert jede Datei in `app/`, mountet den App Router mit einer History im Arbeitsspeicher und zeichnet ihn im Vollbild. `<Link>`, `useRouter()`, `notFound()` und `redirect()` funktionieren unverändert.

<!-- s:75b65c161d -->
Same-Origin-Aufrufe mit `fetch("/api/...")` führen deine `route.ts`-Handler im selben Prozess aus, genau so, wie `text dev` sie bereitstellen würde. Andere URLs gehen über das Netzwerk.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Für eine einzelne Komponente oder deine eigene CLI:

<!-- s:e62e62bfaa -->
`useApp().exit()` unmountet die App und stellt das Terminal wieder her.

<!-- s:082b75dda7 -->
| Option | Beschreibung |
| :-- | :-- |
| `stdin` / `stdout` | Standard: `process.stdin` / `process.stdout` |
| `cols` / `rows` | Feste Größe (Standard: an das Terminal anpassen) |
| `altScreen` | Scrollback beim Beenden wiederherstellen (Standard: `true`) |
| `mouse` | Scrollen mit dem Mausrad (Standard: `true`) |
| `exitOnCtrlC` | Standard: `true` |
| `fps` | Frame-Obergrenze (Standard: `60`) |
| `patchConsole` | `console.*` bis zum Beenden zurückhalten (Standard: `true`) |
| `theme` / `transparent` | Wie in `createConsoleRoot` |

<!-- s:e34e364b9c -->
Ausgabe

<!-- s:2ac174afda -->
Jeder Frame wird zeilenweise mit dem vorherigen verglichen. Nur geänderte Zeilen werden geschrieben, umschlossen von Markierungen für synchronisierte Ausgabe, sodass Terminals mit entsprechender Unterstützung nie einen halb gezeichneten Frame anzeigen. Apps im Leerlauf schreiben nichts.

<!-- s:99a3c4d459 -->
Eingabe

<!-- s:4a9817d820 -->
Standardeingaben im Raw-Modus werden in dieselben Ereignisse umgewandelt, die der Browser erzeugt: Pfeil- und Funktionstasten mit Modifikatoren, `Alt`-Kombinationen, Bracketed Paste, SGR-Mausrad und das Kitty-Tastaturprotokoll. `TerminalInputParser` und `parseTerminalInput` werden exportiert, falls du sie anderswo benötigst.

<!-- s:6b688e229b -->
Unterschiede

<!-- s:56ed51fed3 -->
| Funktion | DevTools | Terminal |
| :-- | :-- | :-- |
| Frame-Taktung | ~15 fps | Bis zu `fps` |
| Rastergröße | Angedockte Konsole | Terminalfenster |
| `<Image src>` | Laden über Canvas | `pixels` verwenden |
| `console.log` | Deine Frames | Bis zum Beenden zurückgehalten |
