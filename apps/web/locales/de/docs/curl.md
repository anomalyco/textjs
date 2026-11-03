<!-- s:5f3abb073d -->
Terminal-HTTP-Clients erhalten den ersten Frame einer Seite als Truecolor-ANSI-Text statt des HTML-Dokuments. Du musst nichts konfigurieren.

<!-- s:f501ff55e0 -->
Anfragen, die einen Frame erhalten

<!-- s:3384141bb9 -->
Eine Anfrage erhält einen Frame, wenn alle folgenden Bedingungen erfüllt sind:

<!-- s:05a334e510 -->
- Die Methode ist `GET` oder `HEAD`;
- der `User-Agent` beginnt mit `curl/`, `Wget/`, `wget2/`, `HTTPie/` oder `xh/`;
- der `Accept`-Header fehlt oder enthält kein `text/html`.

<!-- s:4af297e372 -->
Browser, Crawler und Linkvorschauen erhalten die HTML-Seite. Um mit curl das HTML zu erhalten, fordere es an:

<!-- s:03dba887a9 -->
Der Frame wird an der Stelle ausgewählt, an der die Seite ausgeliefert würde: nach [Middleware](/docs/middleware), `rewrites` und [Route-Handlern](/docs/route-handlers), und niemals für Dateien oder Pfade, deren letztes Segment einen Punkt enthält. Middleware-Weiterleitungen, `401`-Antworten, Header und Rewrites gelten für curl genauso wie für Browser. `/api/health` führt weiterhin seinen Handler aus und `/robots.txt` liefert weiterhin die Datei aus.

<!-- s:e0c4f5f416 -->
Inhalt des Frames

<!-- s:50fa4581ec -->
Der Frame ist das erste Rendering der Seite, wie bei einer [vorgerenderten Shell](/docs/server-rendering#partial-prerendering): Jede `<Suspense>`-Grenze, die noch wartet, zeigt ihren Fallback. Asynchrone Server-Komponenten werden nicht ausgeführt und `fetch()` wird nie aufgelöst, sodass Daten, die in Effekten geladen werden, im Ladezustand bleiben.

<!-- s:08efeec61a -->
- **Größe:** 80 × 24 Zellen. Eine App mit festem Viewport (`viewport.responsive: false`) verwendet stattdessen `viewport.width × viewport.height`.
- **Farben:** 24-Bit-SGR-Escape-Codes im `viewport.theme` der App. Jede Zeile endet mit einem Reset und der Frame endet mit einem Zeilenumbruch.
- **Status:** `200` oder `404` mit der Nicht-gefunden-Seite der App, wenn keine Seite passt oder die Seite `notFound()` aufruft. Eine Seite, die beim Rendern `redirect()` aufruft, liefert HTML aus.

<!-- s:1125803eb1 -->
Antworten haben den Typ `text/plain; charset=utf-8` mit `Vary: User-Agent, Accept` und `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, damit gemeinsam genutzte Caches niemals einen Frame speichern und an einen Browser ausliefern. Die HTML-Seite unter einem Pfad, an dem curl einen Frame erhält, enthält denselben `Vary`-Header.

<!-- s:0e2aba0a67 -->
Unterstützte Umgebungen

<!-- s:d40234848f -->
| Host | Statische Seiten | Dynamische Seiten, unbekannte Pfade |
| :-- | :-- | :-- |
| `text dev` | Bei Anfrage gerendert | Bei Anfrage gerendert |
| `text start`, `bun` | Durch `text build` vorgerendert | Bei Anfrage gerendert |
| `vercel`, `cloudflare` | Durch `text build` vorgerendert | HTML-Seite |
| `static` | HTML-Seite | HTML-Seite |

<!-- s:11c905d6a6 -->
Serverseitig gerenderte Seiten benötigen `text start` oder `bun` (siehe [Deployen](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Statische Hosts können einem Client nicht anders antworten als einem anderen, deshalb unterstützt der `static`-Adapter keine Frames. Auf Vercel und Cloudflare werden Frames für statische Seiten mit dem Build ausgeliefert. Dynamische Seiten (`[id]`, `force-dynamic`) liefern dort HTML aus, weil die Adapter `vercel` und `cloudflare` keinen Renderer deployen.

<!-- s:022d3d5541 -->
`text start` und `bun dist/server.js` rendern die übrigen Seiten bei Anfrage mit `.text/server/live.mjs` und halten die letzten 128 Frames für 10 Sekunden vor. Jeder Server rendert höchstens 20 nicht gecachte Seiten pro 10 Sekunden. Danach erhält curl die HTML-Seite, bis das Budget wieder aufgefüllt ist. Wenn `live.mjs` auf dem Server nicht geladen werden kann, etwa weil ein Seitenmodul auf oberster Ebene auf `window` zugreift, liefern diese Seiten HTML aus.

<!-- s:2500855fbd -->
`text build` meldet die vorgerenderten Frames:

<!-- s:37f210b46a -->
Konfiguration

<!-- s:ac46338e16 -->
Ändere die Größe für die gesamte App oder schalte Frames aus:

<!-- s:36fb2e113c -->
Eine Seite kann ihre eigene Größe ändern oder auch an Terminals HTML ausliefern:

<!-- s:11c75396f6 -->
Größen werden auf 1–500 Zellen begrenzt. Mit `ansi: false` in `text.config.ts` werden Seitenexporte ignoriert.

<!-- s:17ae9b44af -->
Unverschlüsseltes HTTP

<!-- s:e9b0dd23eb -->
curl folgt Weiterleitungen nur, wenn du `-L` übergibst. Vercel leitet `http://`-Anfragen auf `https://` um, ebenso Cloudflare bei aktiviertem **Immer HTTPS verwenden**, sodass `curl http://…` die Weiterleitung statt des Frames ausgibt. Teile `https://`-URLs.

<!-- s:740b32f53f -->
Eigene Server

<!-- s:144c78c64b -->
`@textjs/app/ansi` exportiert Hilfsfunktionen zur Erkennung und für Antworten, für Server und Funktionen, die weder `text start` noch einen Adapter ausführen:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` akzeptiert auch `(method, headers)` mit Web-`Headers` oder Nodes `IncomingHttpHeaders`. `frameToAnsi(buffer, { theme })` kodiert einen gerenderten `CellBuffer` genauso wie das Framework.
