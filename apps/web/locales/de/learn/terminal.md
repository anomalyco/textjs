<!-- s:3ddc060411 -->
`text run` führt dieselbe App in einem Terminal aus. Layout, Komponenten, Keymaps und Route-Handler werden gemeinsam genutzt, und die Ausgabe erfolgt als Truecolor-ANSI statt als `%c`-CSS-Spans.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Füge ein Skript hinzu und führe es aus:

<!-- s:ad1db08664 -->
`text run` importiert jede Datei in `app/`, mountet den App Router mit einer History im Arbeitsspeicher und zeichnet ihn im Vollbild. `<Link>`, `useRouter()`, `notFound()` und `redirect()` funktionieren unverändert, und `fetch("/api/…")`-Aufrufe mit derselben Origin führen deine Route-Handler im selben Prozess aus. `Ctrl+C` beendet die App und stellt deinen Scrollback wieder her. Dafür ist Bun erforderlich.

<!-- s:86d6034750 -->
Mit `q` beenden

<!-- s:f06966bd5c -->
Terminal-Nutzer erwarten `q`. `useApp().exit()` unmountet die App und stellt das Terminal wieder her; im Browser unmountet es die Konsolen-App.

<!-- s:62111506f4 -->
Deine eigene CLI

<!-- s:e5f8a30037 -->
Verwende für eine einzelne Komponente `renderToTerminal`. Es mountet ein Element ohne den App Router, und `fetch("/api/…")` erreicht deine Route-Handler nur unter `text run`, also übergib der Komponente ihre Daten:

<!-- s:718df08aaf -->
Führe es mit `bun cli.tsx` aus. `DeploymentsPage` ruft seine Zeilen ab und benötigt deshalb `text run`.

<!-- s:76d0fa5082 -->
Die Unterschiede

<!-- s:505bd1bfa2 -->
Terminals zeichnen schneller neu (bis zu 60 fps statt ~15) und passen das Raster an das Fenster statt an die angedockte Konsole an. Bilder benötigen Pixeldaten statt einer URL. Alles andere, einschließlich dieses Dashboards, verwendet denselben Code.
