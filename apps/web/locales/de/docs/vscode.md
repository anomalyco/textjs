<!-- s:8f3fd7167d -->
Die Text.js-Erweiterung für VS Code zeigt deinen Konsolen-Frame neben dem Code. Sie spiegelt die unter `text dev` laufende App oder rendert die offene Datei selbst, wenn nichts läuft. Außerdem bietet sie App Router-Vorlagen, Snippets und Links zu `TX###`-Fehlercodes.

<!-- s:98304b8243 -->
Installation

<!-- s:80e247d2f7 -->
Installiere [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) aus dem Visual Studio Marketplace. Öffne in VS Code die Ansicht „Erweiterungen“ (`⌘⇧X`) und suche nach `textjs.vscode-textjs`, oder führe Folgendes aus:

<!-- s:fd2344ec36 -->
Sie aktiviert sich in jedem Ordner, der eine Text.js-App enthält: eine `text.config.ts` oder ein Paket, das von `@textjs/app` abhängt und ein `app/`-Verzeichnis hat. Monorepos mit mehreren Apps funktionieren ebenfalls.

<!-- s:74f1530aa8 -->
Live-Vorschau

<!-- s:d9807ea49d -->
Öffne eine `page.tsx`, `layout.tsx` oder Komponente und führe **Text.js: Open Preview** (`⌘K V`) aus, oder klicke auf die Vorschau-Schaltfläche in der Titelleiste des Editors. Das Panel zeichnet den Frame mit derselben DevTools-Oberfläche und denselben Menlo-Zellen wie deine Browser-Konsole.

<!-- s:2f69f76b80 -->
Die Vorschau bezieht ihre Frames aus einer von zwei Quellen. Die Kennzeichnung in der Werkzeugleiste zeigt, welche aktiv ist:

<!-- s:f81cef21bf -->
| Quelle | Wann | Was du siehst |
| :-- | :-- | :-- |
| **Live** | `text dev` läuft und die App ist in einem Browser-Tab geöffnet | Die echte App mit ihrem Zustand, ihren Daten und ihrer Rastergröße |
| **Headless** | Kein Dev-Server oder kein Tab geöffnet | Die offene Datei, von der Erweiterung in der Größe des Panels gerendert |

<!-- s:f40888c2bb -->
`auto` (der Standard) nutzt Live, wenn möglich, andernfalls Headless. Lege eine der beiden Quellen über die Kennzeichnung oder mit `textjs.preview.mode` fest.

<!-- s:fd587df6f1 -->
Tastatur

<!-- s:9ce66a1aa7 -->
Klicke in die Konsole, um Tasteneingaben an die App zu senden: Pfeiltasten, `Tab`, Tastenkürzel, Tippen und Einfügen funktionieren wie im Browser. Klicke außerhalb der Konsole, um das zu beenden. Editor-Tastenkürzel wie `⌘P` und `⌘⇧P` gehen weiterhin an VS Code. Scrollen über der Konsole sendet Mausrad-Ereignisse.

<!-- s:0910b5fd48 -->
Im Adressfeld kannst du eine Route wie `/deployments/dpl_a1` eingeben, um in beiden Quellen zu navigieren.

<!-- s:4507d73bb4 -->
Live-Modus

<!-- s:787b87d328 -->
Solange eine Vorschau geöffnet ist, fordert der Dev-Server verbundene Tabs auf, ihre Frames zu streamen. Tabs senden nur geänderte Zeilen und hören auf, sobald die Vorschau geschlossen wird, sodass für eine App ohne offene Vorschau kein Aufwand entsteht. Das Speichern einer Datei läuft über Fast Refresh, und die Vorschau aktualisiert sich zusammen mit dem Tab.

<!-- s:86ae14b746 -->
Aktiviere **Follow** (`textjs.preview.followEditor`), um den Browser-Tab zur Route der `page.tsx` zu navigieren, die du gerade bearbeitest.

<!-- s:68839106d6 -->
Hintergrund-Tabs erhalten keine Animationsframes und halten ihre Frames deshalb normalerweise zurück, bis sie wieder sichtbar sind. Solange eine Vorschau zuschaut, zeichnet ein Hintergrund-Tab einen Frame, sobald eine Eingabe eintrifft, sodass Tippen in der Vorschau weiterhin Aktualisierungen auslöst. Animationen in einem Hintergrund-Tab aktualisieren sich etwa einmal pro Sekunde. Öffne die App in einem eigenen Fenster, damit sie flüssig bleiben.

<!-- s:1ae6e7077f -->
Headless-Modus

<!-- s:1cddf967be -->
Die Erweiterung startet einen kleinen Runner in deinem Projekt. Er lädt Route-Dateien über das projekteigene Vite und `@textjs/app`, sodass sich Aliasse, TypeScript und JSX genauso verhalten wie in `text dev`. Er bindet den App Router mit seinen Layouts an der Route der offenen Datei ein und verwendet dabei einen Verlauf im Arbeitsspeicher:

<!-- s:23d9451fef -->
| Datei | Vorschau |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (dynamische Segmente verwenden ihren Namen) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | Der Standardexport oder der erste PascalCase-Export, ohne Props |

<!-- s:f111cbfc61 -->
`fetch("/api/...")`-Aufrufe mit demselben Ursprung führen deine `route.ts`-Handler im selben Prozess aus, wie bei [`text run`](/docs/terminal). Das Raster folgt der Panelgröße, und das Speichern einer beliebigen Datei in der App rendert sie erneut. Fehler erscheinen über dem Frame, mit Links zu ihren `TX###`-Seiten.

<!-- s:36cd3f2bb4 -->
Befehle

<!-- s:d542a683ff -->
| Befehl | Beschreibung |
| :-- | :-- |
| Text.js: Start Dev Server | Führt dein `dev`-Skript (oder `text dev`) in einem Terminal aus |
| Text.js: Stop Dev Server | Stoppt einen aus VS Code gestarteten Dev-Server |
| Text.js: Open Preview | Öffnet die Live-Vorschau für die aktive Datei |
| Text.js: Open in Browser Console | Öffnet die aktuelle Route auf dem Dev-Server. [Öffne danach die Browser-Konsole](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` mit Metadaten und typisierten `params` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` mit `GET` und `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Die Befehle zum Erstellen von Vorlagen findest du auch im Explorer-Kontextmenü für Ordner. Sie akzeptieren [App Router](/docs/routing)-Segmente wie `settings`, `blog/[slug]`, `docs/[...path]` und `(marketing)/about` und lassen nicht zu, dass eine `page` und eine `route.ts` im selben Segment liegen. JavaScript-Projekte (ohne `tsconfig.json`) erhalten `.jsx`- und `.js`-Dateien.

<!-- s:9ba0c1b237 -->
Snippets

<!-- s:193db2a68e -->
| Präfix | Fügt ein |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Route-Dateien, nach ihrem Ordner benannt |
| `txc` | Eine nach der Datei benannte Konsolen-Komponente |
| `txroute`, `txroutep` | Route-Handler, mit oder ohne Parameter |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Komponenten |
| `input`, `select`, `tabs` | Interaktive Komponenten |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooks |
| `metadata`, `txconfig` | Route-Metadaten und `text.config.ts` |

<!-- s:a6e574a6aa -->
Fehlercodes

<!-- s:5e9e2a4649 -->
Bewege den Mauszeiger über einen `TX###`-Code: im Quelltext, in Logs, im Panel „Ausgabe“ oder in einem eingefügten Stacktrace. Die eingeblendete Information zeigt Titel, Meldung und Paket sowie einen Link zur zugehörigen Seite auf textjs.org. Jeder Code ist auch ein Link (`⌘`-Klick).

<!-- s:b67d013d7e -->
Statusleiste

<!-- s:be63ef7ae2 -->
Der Eintrag `▼` zeigt den Zustand des Dev-Servers und die Rastergröße der Konsole, zum Beispiel `▼ :3000  120×36`. Tabs melden dem Dev-Server jede Größenänderung, auch ohne offene Vorschau. Klicke auf den Eintrag, um die wichtigsten Befehle aufzurufen.

<!-- s:5b827aed4d -->
Einstellungen

<!-- s:457ec968c0 -->
| Einstellung | Standard | Beschreibung |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` oder `headless` |
| `textjs.preview.followEditor` | `false` | Live-Modus: der bearbeiteten Route folgen |
| `textjs.preview.fontSize` | `12` | Schriftgröße der Zellen (DevTools verwendet 12) |
| `textjs.preview.runtime` | | Node.js-Binary für Headless-Vorschauen (Standard: das mit VS Code ausgelieferte) |
| `textjs.devServer.url` | | URL des Dev-Servers (Standard: Suche auf Ports 3000–3010). Es werden nur `http://`-Loopback-Adressen verwendet |
| `textjs.devServer.command` | | Befehl für Start Dev Server |

<!-- s:ea5e740ef1 -->
Arbeitsbereichsvertrauen

<!-- s:ddcdd0b053 -->
Die Vorschau und der Dev-Server führen den Code deines Projekts aus (seine Vite-Konfiguration, `text.config.*` und Komponenten). Im eingeschränkten Modus bietet die Erweiterung nur Snippets, Vorlagen und Fehlerlinks an und ignoriert `textjs.preview.runtime`, `textjs.devServer.command` und `textjs.devServer.url` aus den Arbeitsbereichseinstellungen. Vertraue dem Arbeitsbereich, um die Vorschau zu aktivieren. Dateien außerhalb deiner Arbeitsbereichsordner erscheinen nie in der Vorschau.

<!-- s:5ae438610c -->
Funktionsweise

<!-- s:857bac4692 -->
`text dev` stellt drei Endpunkte für Editoren bereit. Sie antworten nur auf Loopback-Verbindungen, die an einen Loopback-Host (`localhost`, `127.0.0.1`, `[::1]`) adressiert sind, und nur auf Anfragen ohne `Origin` oder mit dem Ursprung des Dev-Servers. Websiteübergreifende Anfragen und `no-cors`-Anfragen von Browsern werden abgelehnt:

<!-- s:2345c81baf -->
| Endpunkt | |
| :-- | :-- |
| `GET /__textjs/status` | Projektwurzel, verbundene Tabs, Rastergröße und aktuelle Route |
| `GET /__textjs/frames` | Server-Sent Events: ein `frame`-Ereignis pro Änderung, als Zeilendeltas codiert |
| `POST /__textjs/input` | Eine Taste, eingefügter Text, IME-Text oder Text einer Tottaste (`text`), Mausrad oder Navigation für den Tab. Erfordert JSON und den Header `x-textjs-mirror: 1`, damit andere Websites keine Tasteneingaben senden können |

<!-- s:6693972af6 -->
Tabs senden Frames über den HMR-Socket von Vite an den Dev-Server, der ein serverspezifisches Token erfordert. Das Übertragungsformat wird aus `@textjs/app/frame-protocol` exportiert (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`), falls du eine eigene Anzeige bauen möchtest. Nichts davon ist in der Ausgabe von `text build` enthalten.
