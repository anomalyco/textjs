<!-- s:7e7d3cb07e -->
`text build --embed` baut deine App so, dass eine andere Website sie mit einem einzigen Script-Tag einbinden kann, etwa eine Marketingseite, eine Dokumentationswebsite, eine WordPress- oder Webflow-Seite oder eine React-18-App. Besucher, die DevTools öffnen, sehen deine App in der Konsole. Andere Besucher laden `embed.js` herunter (etwa 3 kB mit gzip) und sonst nichts, sofern die Seite kein `<text-console>` enthält.

<!-- s:2aa1d07d89 -->
Embeds sind experimentell. `text build --embed`, die Option `embed`, `<text-console>` und die Exporte aus `@textjs/app/experimental` können sich in einem Minor-Release ändern. Siehe [Inkompatible Änderungen](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Eine App in eine Website einbinden

<!-- s:f296ccaeef -->
Baue die App:

<!-- s:2198c52791 -->
Lade `dist/` auf einen beliebigen statischen Host oder ein CDN hoch oder kopiere es in den `public/`-Ordner der Website und füge dann ein Tag auf den Seiten der Website hinzu:

<!-- s:aa94ef1985 -->
`embed.js` lädt seine anderen Dateien relativ zur eigenen URL, sodass `dist/` unter jedem Pfad und jeder Origin funktioniert. Es enthält nur `embed.js` und `assets/`, ohne `index.html` oder `404.html`, die die entsprechenden Dateien der Website ersetzen könnten. Eine App mit [serverseitig gerenderten Routen](#server-rendered-routes), Route-Handlern oder Middleware braucht einen Server statt eines rein statischen Uploads. Die Adapter `vercel` und `cloudflare` führen Route-Handler und Middleware aus, und serverseitig gerenderte Routen benötigen `text start` oder den `bun`-Adapter.

<!-- s:5c139759a2 -->
Um Besuchern zu zeigen, wo die App ist, füge [`<text-console>`](#text-console) an einer beliebigen Stelle der Seite hinzu. Auch jedes Element mit `data-textjs-engage` startet die App beim Drücken:

<!-- s:6a70ec16e1 -->
Um es lokal auszuprobieren, führe `text dev --embed` aus. Es liefert `/embed.js` bei jeder Anfrage mit einem frischen ersten Frame aus und stellt unter `/` (mit `standalone` unter `/__textjs/embed`) eine Vorschauseite bereit, die es wie eine andere Website lädt. Eine Website auf einem anderen lokalen Port kann ebenfalls `http://localhost:3000/embed.js` laden.

<!-- s:37f210b46a -->
Konfiguration

<!-- s:aa9630bf92 -->
`text build --embed` entspricht `embed: true` in `text.config.ts`. Übergib ein Objekt, um die Standardwerte zu ändern:

<!-- s:fbe8efc9f4 -->
| Option | Standardwert | Beschreibung |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | Die Route, mit der sich die Konsole öffnet. Muss mit `/` beginnen |
| `globalName` | `"text"` | Der globale Name, unter dem die App beim Start ihre Konsolen-API installiert. `false` installiert keine |
| `initialClear` | `false` | Die Konsole der Seite vor dem ersten Frame leeren. Standardmäßig bleiben frühere Ausgaben der Seite über der App stehen |
| `standalone` | `false` | Auch die eigenen Seiten der App (`index.html`) bauen, wie `text build` ohne `embed` |
| `allowOrigins` | `[]` | Websites, deren Seiten serverseitig gerenderte Routen von diesem Server ausführen dürfen. Siehe [Serverseitig gerenderte Routen](#server-rendered-routes) |
| `credentials` | `false` | Browser-Anmeldedaten für diesen Server bei Anfragen von Live-Sitzungen aus `allowOrigins` mitsenden, statt Cookies und `Authorization` zu verwerfen. Erfordert exakte Origins |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (Standard: 120 × 36) ist die Größe des ersten Frames. `title`, `hints` und `action` sind die Standardwerte für `<text-console>`. Mit `ppr: false` oder wenn `middleware.ts` auf `initialPath` zutreffen könnte, enthält `embed.js` keinen vorgerenderten ersten Frame, da jeder `embed.js` herunterladen kann. Eine Spiegelansicht bleibt leer, bis die App zeichnet.

<!-- s:7ca27066c7 -->
Verhalten

<!-- s:1fe89ec57c -->
- **Bis zur [erkannten Konsolennutzung](/docs/hooks-and-repl#loading-on-console-intent-experimental) wird nichts weiter geladen.** `embed.js` gibt den vorgerenderten ersten Frame aus und wartet dann. Die App lädt, wenn DevTools angedockt ist (beim Laden oder später), wenn der Besucher auf der Seite ein DevTools-Tastenkürzel drückt (F12, Ctrl+Shift+J, I, C oder K oder auf einem Mac ⌘⌥J, I, C oder K) oder wenn er ein `<text-console>`- oder `[data-textjs-engage]`-Element drückt. Danach startet sie beim Neuladen im selben Tab sofort. DevTools in einem eigenen Fenster ändert die Größe der Seite nicht. Besucher, die es über ein Menü geöffnet haben, sehen daher den ersten Frame, bis sie eines dieser Elemente drücken.
- **Auf Touchscreens startet die App nicht.** Auf einem Gerät, das `(hover: none) and (pointer: coarse)` entspricht, gibt `embed.js` nichts aus und fügt keine Listener hinzu. Es lädt nur die Datei von `<text-console>` für eine Spiegelansicht.
- **Tasteneingaben erreichen die App erst, nachdem der Besucher sie aktiviert hat.** Dazu drückt er ein `<text-console>`- oder `[data-textjs-engage]`-Element oder klickt auf die Seite (nicht auf einen Link, eine Schaltfläche oder ein Feld), um den Fokus von DevTools zurückzuholen. Eingaben in den eigenen Feldern der Seite oder in einem `[data-textjs-bypass]`-Element erreichen die App nie, und das Mausrad scrollt immer die Seite.
- **URL, Verlauf und Titel der Seite ändern sich nie.** Routen, `<Link>` und `useRouter()` navigieren innerhalb der Konsole. In clientseitig gerenderten Apps öffnen sich absolute URLs in einem neuen Tab.
- **Eine Text.js-App auf der Seite hat Vorrang.** Wenn sie startet, wird ein laufendes Embed ausgehängt, liest keine Tasteneingaben mehr und entfernt seinen globalen Namen. Ein Embed, das lädt, während eine andere App die Konsole belegt, gibt eine Warnung aus und startet nicht.
- **Das Embed bündelt sein eigenes React 19.** Es enthält weder `react-dom` noch Bare Imports, sodass die React-Version der Seite, eine Import Map für `react` und React DevTools keinen Einfluss darauf haben.

<!-- s:5bd6dcbe49 -->
Ladezeitpunkte

<!-- s:631a37c837 -->
| Datei | Ladezeitpunkt | gzip |
| :-- | :-- | --: |
| `embed.js` | Mit der Seite | 2,9 kB |
| `assets/text-console-[hash].js` | Wenn die Seite ein `<text-console>` enthält | 4,0 kB |
| `assets/embed-client-[hash].js` und `assets/yoga-[hash].wasm` | Bei erkannter Konsolennutzung | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Bei erkannter Konsolennutzung, anstelle des Clients, für eine [serverseitig gerenderte Route](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | Wenn die App erstmals Text von rechts nach links anzeigt (siehe [Die Bidi-Engine laden](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Die Größen gelten für einen umrandeten Statuskasten mit 120 × 36. `text build --embed` gibt die Größen deiner App aus. `assets/embed-[hash].js` ist eine Kopie von `embed.js` unter einem Namen, der sich nie ändert (siehe [Deployments](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` definiert `<text-console>` und lädt dessen Datei nur, wenn die Seite ein solches Element enthält. Es verwendet Shadow DOM, sodass das CSS der Seite nicht ins Innere gelangt und eine `style-src 'self'`-Richtlinie keine Änderungen benötigt.

<!-- s:9ceead3eca -->
Ohne Attribute ist es eine einzeilige Leiste. Sie zeigt das Tastenkürzel des Browsers zum Öffnen der Konsole, fordert dann zum Klicken auf und listet anschließend die Tasten der App auf, die aufleuchten, sobald sie die App erreichen. In Safari fordert der erste Schritt dazu auf, „Funktionen für Web-Entwickler anzeigen“ in den Safari-Einstellungen zu aktivieren.

<!-- s:899e0c7fe3 -->
Mit `mirror` zeigt es den Frame der App auf der Seite: den vorgerenderten ersten Frame, bevor etwas anderes lädt, danach die laufende App. Ein Druck darauf startet die App und sendet ihr die Tasteneingaben des Besuchers, sodass die App bei geschlossenem DevTools funktioniert. `chrome` zeichnet ein DevTools-Fenster um die Spiegelansicht und schließt `mirror` ein.

<!-- s:fefcb3e495 -->
| Attribut | Beschreibung |
| :-- | :-- |
| `mirror` | Die Frames der App anzeigen |
| `chrome` | Die Frames in einem DevTools-Fenster anzeigen |
| `title` | Der Titel der Leiste (Standard: `title` in `text.config.ts`) |
| `hints` | Die aufzulistenden Tasten, etwa `"← →:switch region, Enter:open"` (Standard: `hints` in `text.config.ts`) |
| `action` | Die erste Aktion, angezeigt als „Klicke hier und …“ (Standard: `action` in `text.config.ts` oder die Taste des ersten Hinweises drücken) |

<!-- s:392012169b -->
Auf Touchscreens zeigt eine Spiegelansicht den ersten Frame, ohne die App zu starten, und die Leiste ist ausgeblendet. Der Text des Elements ist auf Englisch.

<!-- s:13ff4ec1f4 -->
Platz reservieren

<!-- s:0f4e2c234d -->
`text build --embed` gibt eine Zeile CSS für das Raster deiner App aus. Füge sie in das Stylesheet der Seite ein. Sie legt die Größe von `<text-console>` fest, bevor die Datei des Elements lädt, sodass sich auf der Seite nichts verschiebt, wenn die Datei ankommt. Für das Standardraster mit 120 × 36 lautet die Zeile:

<!-- s:a2d2741417 -->
Die Leiste ist 58 px hoch. Eine Spiegelansicht behält das Seitenverhältnis des Rasters bis zu seiner natürlichen Breite bei (885 px bei 120 Spalten), und `chrome` fügt 43 px hinzu. Die Größe hängt nicht von Schriftarten ab. `reserveCss(cols, rows)` aus `@textjs/app/experimental` gibt dieselbe Zeile zurück.

<!-- s:a1260c10c3 -->
Eine Spiegelansicht im anfangs sichtbaren Bereich ist meist das größte Element der Seite und bestimmt daher deren Largest Contentful Paint (LCP). Ihr erster Frame wird gezeichnet, nachdem erst `embed.js` und dann die Datei des Elements nacheinander geladen wurden. Der Rest der Seite wird so gezeichnet wie ohne das Embed. Eine Spiegelansicht weiter unten auf der Seite beeinflusst LCP nicht. Auf einer Seite mit eigenen verzögert ausgeführten Skripten, etwa einer React-App, führt `<script type="module" async src="…">` `embed.js` aus, ohne auf sie zu warten, sodass eine Spiegelansicht im anfangs sichtbaren Bereich früher gezeichnet wird.

<!-- s:4206a424a5 -->
Gestaltung

<!-- s:834fbf40e6 -->
Um eine Spiegelansicht zu zentrieren, gib ihr automatische Inline-Außenabstände:

<!-- s:6dde2b2766 -->
Standardmäßig ist sie dunkel. Setze `color-scheme: light` für helle Farben oder lege die beiden Farben fest, aus denen alle anderen Farbtöne gemischt werden. `::part(frame)` gestaltet den Frame selbst. `chrome` behält den eigenen Hintergrund von DevTools bei.

<!-- s:f5e077273b -->
Serverseitig gerenderte Routen

<!-- s:eb293d9fb4 -->
Wenn `initialPath` eine Route mit `export const runtime = "server"` ist, lädt `embed.js` den Frame-Player statt der Client-Laufzeit. Er streamt Frames von dem Server, von dem `embed.js` stammt. Führe daher `text start` oder den `bun`-Adapter aus. Bei anderen Adaptern schlägt der Build fehl. Siehe [Server-Rendering](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Eine Seite auf einer anderen Website kann nur dann eine Live-Sitzung öffnen, wenn ihre Origin in `allowOrigins` steht:

<!-- s:6ec7048857 -->
- Eine Sitzung antwortet nur der Origin, die sie geöffnet hat.
- Standardmäßig verwirft Text.js die Cookies und den `Authorization`-Header von Sitzungen anderer Websites, sodass die [Middleware](/docs/middleware) einen abgemeldeten Besucher sieht. `credentials: true` behält sie bei und erfordert exakte Origins. Der Browser sendet sie, wenn die Seite und der Server eine registrierbare Domain teilen (`www.example.com` und `console.example.com`) und das Cookie für den Server gilt (`Domain=example.com` oder auf `console.example.com` gesetzt). Von anderen Websites sendet er nur Cookies, die mit `SameSite=None; Secure` gesetzt wurden, und Browser, die Drittanbieter-Cookies blockieren, senden keine.
- Eine Live-Sitzung sendet `OPTIONS`-Preflights an `/__textjs/live`, sobald sie sich verbindet und wenn sie sich erneut verbindet. Preflights enthalten keine Cookies und kein `Authorization`, daher muss Middleware, die auf diesen Pfad zutrifft, `OPTIONS`-Anfragen ohne Anmeldung durchlassen.
- Setze hinter einem Reverse Proxy oder CDN `server.trustProxy` (siehe [Hinter einem Proxy](/docs/deploying#behind-a-proxy)). Ohne diese Einstellung hat jeder Besucher die Adresse des Proxys, sodass alle dasselbe Sitzungslimit pro Client teilen.

<!-- s:f739524722 -->
`text dev` akzeptiert Seiten auf `localhost`, `127.0.0.1` und `[::1]` an jedem Port ohne `allowOrigins`, sofern `credentials` nicht gesetzt ist.

<!-- s:d5df7bf60f -->
Hosting

<!-- s:4bef54c1c0 -->
`text start` und die Adapter `bun`, `vercel` und `cloudflare` liefern einen Embed-Build mit diesen Headern aus. Der `static`-Adapter schreibt sie in `_headers`, das Cloudflare Pages und Netlify lesen. Auf jedem anderen Host, etwa einem Storage-Bucket oder im eigenen `public/`-Ordner der Website, musst du sie selbst setzen:

<!-- s:be81a4c5ec -->
| Pfad | Header |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Beide, wenn die Website auf einer anderen Origin liegt | `Access-Control-Allow-Origin: *` und `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Browser rufen Modulskripte und WebAssembly mit CORS ab, daher benötigen Dateien auf einer anderen Origin `Access-Control-Allow-Origin`. Liefere `yoga-[hash].wasm` komprimiert als `application/wasm` aus (siehe [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Deployments

<!-- s:01b888e293 -->
`embed.js` wird bei jedem Laden der Seite erneut validiert, sodass neue Besucher sofort ein neues Deployment erhalten. Ein Tab, der die vorherige `embed.js` geladen hat, importiert weiterhin die Dateien des vorherigen Builds, wenn der Besucher die Konsole öffnet, möglicherweise erst Stunden später. Halte `assets/` des vorherigen Deployments online: Kopiere neue Dateien über alte, statt beim Synchronisieren Dateien zu löschen, und entferne alte Dateien nach einem oder zwei Tagen. Um einen Build festzuschreiben, trage seine `assets/embed-[hash].js` im Tag ein. Auch die Dateien dieses Builds müssen online bleiben.

<!-- s:b748b07652 -->
Wenn die Dateien nicht mehr verfügbar sind, gibt `embed.js` eine Warnung aus, die den Besucher zum Neuladen auffordert, und startet die App nicht und lädt die Seite nicht selbst neu.

<!-- s:fce19037b3 -->
Content Security Policy

<!-- s:de8e30a920 -->
`embed.js` benötigt keine Inline-Skripte oder -Styles. Ergänze die Richtlinie der Host-Seite um diese Einträge und verwende `'self'` anstelle des Ursprungs, wenn `dist/` auf demselben Ursprung liegt:

<!-- s:2da4077ce0 -->
| Direktive | Wert | Für |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` und seine Chunks |
| `script-src` | `'wasm-unsafe-eval'` | Yoga in clientseitig gerenderten Apps |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm` und `/__textjs/live` für serverseitig gerenderte Routen |
| `img-src` | `data:` | Nur ein `<text-console mirror>`, dessen App `<Image>` oder `<Pixels>` zeichnet |

<!-- s:4ce5dcc4cb -->
Die App selbst laden

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` exportiert die Bestandteile von `embed.js` für Seiten, die eine App auf eigene Weise laden:

<!-- s:238cbf53ee -->
| Export | Beschreibung |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Was `embed.js` ausführt: den ersten Frame ausgeben, auf die Absicht warten, die Konsole zu nutzen, dann `boot` aufrufen |
| `bootEmbedClient(options)` | Eine clientseitig gerenderte App mit In-Memory-Routing und für die Seite gesteuerter Tastatureingabe starten |
| `bootEmbedPlayer(options)` | Den Frame-Player für eine serverseitig gerenderte Route starten |
| `createHostInput(options)` | Tastatureingabe, die den obigen Regeln folgt |
| `createTextConsoleMount(config)` | Gibt eine `mount(element, shell?)`-Funktion für `<text-console>` zurück |
| `reserveCss(cols, rows)` | Das CSS, das den Platz für `<text-console>` reserviert |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` und `BYPASS_SELECTOR` sind die Selektoren für Elemente, die die App starten, und Elemente, die ihre Tastatureingaben selbst verarbeiten.
