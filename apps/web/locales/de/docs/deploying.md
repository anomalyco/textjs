<!-- s:04615ef523 -->
`text build` erzeugt ein portables `dist/`. Ein Adapter wandelt es in die Ausgabe um, die eine Plattform erwartet.

<!-- s:087f8d3137 -->
Adapter

<!-- s:04908c6c09 -->
| Adapter | Ausgabe | Ausführung |
| :-- | :-- | :-- |
| *(keiner)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Jeder statische Host |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
Der Adapter kann auch über `TEXTJS_ADAPTER` festgelegt werden. Wenn `text build` auf Vercel (`VERCEL=1`) oder Cloudflare Pages (`CF_PAGES=1`) läuft, wird automatisch der passende Adapter ausgewählt.

<!-- s:d671e1ae31 -->
Um die App mit einem Script-Tag in eine andere Website einzubinden, baue sie mit `--embed`. Jeder Adapter unterstützt das (siehe [Einbetten](/docs/embedding)).

<!-- s:9d8df946e5 -->
Die Server-Adapter (`bun`, `vercel` und `cloudflare`) führen dieselbe Pipeline wie `text start` aus: [Middleware](/docs/middleware), `rewrites`, [Route-Handler](/docs/route-handlers) mit dem [Route-Cache](/docs/caching), statische Assets und dann das Konsolendokument für Seiten-URLs. Terminal-Clients wie curl erhalten stattdessen den ersten Frame der Seite als ANSI-Text. Auf `vercel` und `cloudflare` gilt das nur für statische Seiten (siehe [curl und Terminal-Clients](/docs/curl)). Die Server-Adapter liefern Dateien mit Hash im Namen unter `/assets/` mit `Cache-Control: public, max-age=31536000, immutable` aus.

<!-- s:1a5ee098c6 -->
Statisch

<!-- s:9ebd0d2866 -->
Verwende diesen Adapter für Hosts ohne Server, etwa GitHub Pages, S3 oder ein CDN. `GET`-Route-Handler mit `dynamic = "force-static"` oder `revalidate` werden per Prerendering in Dateien umgewandelt: Aus `app/api/feed.json/route.ts` wird `dist/api/feed.json`. Eine Kopie von `index.html` wird in `404.html` geschrieben, damit Deep-Links die Konsolen-App öffnen. Statische Hosts können curl nicht von einem Browser unterscheiden, daher erhält curl die HTML-Seite.

<!-- s:1e90536a2a -->
Der Build schlägt fehl und listet alle Gründe auf, wenn die App einen Server benötigt: `middleware.ts`, [serverseitig gerenderte Routen](/docs/server-rendering), dynamische Route-Handler, Route-Handler mit dynamischen Segmenten oder andere Methoden als `GET`. Konfiguriere `rewrites` stattdessen auf dem Host.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
Der `bun`-Adapter schreibt einen einzelnen, eigenständigen Server, der zur Laufzeit keine `node_modules` benötigt. Er liest `PORT` (Standard `3000`) und `HOSTNAME` (Standard `0.0.0.0`) und liefert niemals `server.js` oder `.text/` aus. Er läuft als langlebiger Prozess und hostet daher wie `text start` auch [serverseitig gerenderte Routen](/docs/server-rendering) (`export const runtime = "server"`) und deren Live-Sitzungen. Verwende ihn in einem Container:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Oder pushe in ein mit Vercel verbundenes Git-Repository: Der Build führt `text build` aus, erkennt Vercel und schreibt `.vercel/output`.

<!-- s:3ee6894582 -->
| Ausgabe | Inhalt |
| :-- | :-- |
| `static/` | Der Client-Build (unter `basePath`) |
| `functions/_textjs/server.func` | Eine Node.js 22-Funktion, die alle Route-Handler bedient, mit Streaming |
| `functions/_middleware.func` | Edge-Routing-Middleware: `middleware.ts` und kanonische Pfade für jede App |
| `config.json` | Asset-Header, Middleware-Matcher, Rewrites, Handler-Routen und das Konsolendokument |

<!-- s:3f3ba93b7d -->
Die Edge-Middleware verwendet das Protokoll `x-middleware-next` / `x-middleware-rewrite`, sodass Header-Überschreibungen und Rewrites im Router von Vercel stattfinden, bevor die Funktion oder das CDN erreicht wird. Alle Matcher teilen sich ein `src`-Muster für Routen. Anfragen, die kein Matcher abdeckt, überspringen die Middleware, es sei denn, ihr Pfad liegt möglicherweise nicht in kanonischer Form vor (Prozentkodierungen, Zeichen, die ein URL-Parser kodiert, `//`, `.`- oder `..`-Segmente, ein abschließender Schrägstrich). Die Middleware gleicht dann den kanonischen Pfad ab, prüft `has` / `missing` und schreibt die Anfrage auf diesen Pfad um, damit Vercel sie genauso routet. Apps ohne `middleware.ts` erhalten dieselbe Edge-Funktion, die nur das Rewrite ausführt. Da jeder Build eine Edge-Funktion enthält, deploye über ein angemeldetes Vercel-Konto: Anonyme Deployments (`vercel deploy --temporary`) akzeptieren keine Edge-Funktionen.

<!-- s:b5af065e25 -->
Die Handler-Funktion ist intern. Jede Handler-Route übergibt ihr den übereinstimmenden Pfad im Anfrage-Header `x-textjs-path`. Dieser Header wird vor und nach der Middleware aus jeder Anfrage entfernt, und die Edge-Middleware leitet ihn niemals weiter (weder vom Client noch aus `middleware.ts`), sodass ihn nur die Handler-Routen setzen können. Anfragen an `/_textjs/*` geben vor und nach Middleware und Rewrites `404` zurück, ohne die Funktion auszuführen. Generierte Routen beachten die Groß- und Kleinschreibung, ebenso wie die Matcher und Rewrites auf jedem anderen Host.

<!-- s:5e18b8a450 -->
Die Tests des Adapters prüfen diese Ausgabe gegen eine lokale Emulation des Vercel-Routers. Dessen Verhalten beim `src`-Abgleich, bei `dest`-Erfassungsgruppen, Header-Transformationen und `status`-Routen wurde anhand echter Deployments geprüft; die Edge-Middleware nicht, da sie sich nicht anonym deployen lässt.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
Die Ausgabe verwendet den erweiterten Modus von Pages:

<!-- s:f72ec91f11 -->
| Datei | Zweck |
| :-- | :-- |
| `_worker.js` | Middleware, Rewrites, Route-Handler und das Konsolendokument. Ein Verzeichnis (`index.js` und `yoga.wasm`), wenn ein Route-Handler Yoga verwendet |
| `_routes.json` | Sendet jede Anfrage an den Worker. Ohne Middleware oder `basePath` bleibt `/assets/*` auf dem statischen CDN von Pages |
| `_headers` | Unveränderliches Caching für `/assets/*` (an deine Header angehängt) |
| `404.html` | Lässt Pages bei fehlenden Dateien mit `404` statt mit der App antworten (bleibt erhalten, falls vorhanden) |

<!-- s:9bc2b010d1 -->
`.text/` (Server-Bundles und Build-Manifeste) wird aus `dist/` entfernt, da Pages das Verzeichnis unverändert veröffentlicht.

<!-- s:1200dbc88d -->
Aktiviere das Kompatibilitätsflag `nodejs_compat` im Pages-Projekt (Settings → Runtime) oder in `wrangler.toml`; der Datencache verwendet `AsyncLocalStorage`. Statische Dateien werden über das `ASSETS`-Binding ausgeliefert, und die Revalidierung im Hintergrund verwendet `ctx.waitUntil()`.

<!-- s:398bcc3496 -->
Mit Middleware führt jede Anfrage den Worker aus, auch bei Assets mit Hash, damit die Middleware jeden Pfad sieht, über den eine Datei erreichbar ist. Jede Anfrage, die den Worker ausführt, ist ein Functions-Aufruf und zählt zu deinem Workers-Anfragekontingent. Beim Laden einer Seite sind das das Dokument und jede davon abgerufene Datei (3 bei einer kleinen Test-App: das Dokument, ein JavaScript-Bundle und `yoga-[hash].wasm`; mehr bei Apps mit mehr Dateien). Im Workers Free-Tarif liefert Pages statische Dateien ohne den Worker aus, sobald das tägliche Kontingent aufgebraucht ist, und überspringt damit die Middleware. Wenn Middleware etwas in `dist/` schützt, setze Settings → Runtime → Fail open / closed auf **Fail closed**.

<!-- s:24c3dfe433 -->
WebAssembly

<!-- s:72ec3f110c -->
Text.js-Apps laden Yoga, die Layout-Engine, aus `assets/yoga-[hash].wasm` (72 kB, 29 kB mit gzip). `text build` lädt sie auf jeder Seite vorab. Server-Bundles und `text run` verwenden die Inline-Kopie aus `yoga-layout`. Der Cloudflare-Worker ist die Ausnahme: Wenn ein Route-Handler Yoga verwendet, enthält `dist/_worker.js/` die Datei `yoga.wasm` neben `index.js`.

<!-- s:0ca00aa2eb -->
- Liefere `.wasm`-Dateien wie JavaScript komprimiert aus. Vercel komprimiert `application/wasm` standardmäßig; nginx benötigt `application/wasm` in `gzip_types`. Wenn dein Host JavaScript komprimiert, aber nicht `.wasm`, laden Seiten etwa 32 kB mehr herunter als mit der Inline-Kopie.
- Sende `Content-Type: application/wasm`, damit der Browser die Datei während des Downloads kompiliert. Bei einem anderen Typ kompiliert er sie nach dem Download.
- Cache sie wie die anderen Dateien mit Hash in `assets/` (`Cache-Control: public, max-age=31536000, immutable`). Das ist sicher, weil sich der Name mit dem Inhalt ändert. Verwende `immutable` nicht für Pfade ohne Hash.
- Wenn du eine Content Security Policy festlegst, füge `'wasm-unsafe-eval'` zu `script-src` und den Ursprung der Datei (meist `'self'`) zu `connect-src` hinzu.
- Wenn unbekannte Pfade auf `index.html` zurückfallen, schließe `/assets/` von diesem Rewrite aus. Andernfalls liefert eine fehlende Datei HTML zurück und `initYoga()` schlägt mit `TX032` fehl.

<!-- s:55fb3b1d03 -->
Eigener Vite- oder webpack-Build

<!-- s:df66a10103 -->
Wenn du `@textjs/core` und `@textjs/react` selbst bündelst, bleibt Yoga inline und benötigt keine Bundler-Konfiguration. Bundles, die die Bedingung `workerd` auflösen, etwa Wrangler, importieren stattdessen `@textjs/core/yoga.wasm` als Modul. Um die `.wasm`-Datei in einem Browser-Build zu laden, füge die Auflösungsbedingung `@textjs/client` zu deinem Client-Build hinzu. In Vite 6, das `defaultClientConditions` exportiert, benötigt auch der Entwicklungs-Pre-Bundler diese Bedingung:

<!-- s:8f580efda1 -->
Die Bedingung trennt außerdem die Bidi-Engine in einen eigenen Chunk ab, der heruntergeladen wird, sobald eine Seite zum ersten Mal Text von rechts nach links anzeigt (siehe [Die Bidi-Engine laden](/docs/internationalization#loading-the-bidi-engine)).

<!-- s:c2349d8226 -->
Lasse die Bedingung in Server-, Prerendering- und Test-Builds (Vitest, jsdom) weg, die mit der Inline-Kopie funktionieren.

<!-- s:600050383d -->
Aktualisieren

<!-- s:e8733a2bfb -->
Sicherheitskorrekturen in `@textjs/app` erreichen ein Deployment erst, nachdem du es neu gebaut und erneut deployt hast:

<!-- s:c74adc728a -->
- Vercel: Deploye das neue `.vercel/output`.
- Cloudflare Pages: Deploye das neue `dist/` mit `_worker.js` und `_routes.json`.
- Bun: Deploye das gesamte neue `dist/` (`server.js`, Assets und Live-Bundles) und starte den Server neu.
- `text start`: Führe `text build` aus und starte neu.

<!-- s:8047727085 -->
Ältere Deployments bleiben unter ihren eigenen URLs erreichbar (zum Beispiel Vorschau-URLs von Vercel und Cloudflare Pages). Lösche sie oder sichere sie mit dem Zugriffsschutz der Plattform ab.

<!-- s:f5e077273b -->
Serverseitig gerenderte Routen

<!-- s:049ef31493 -->
[Serverseitig gerenderte Routen](/docs/server-rendering) halten für jeden offenen Tab eine Sitzung vor und benötigen daher einen langlebigen Server: `text start` oder den `bun`-Adapter. Die Adapter `static`, `vercel` und `cloudflare` brechen den Build mit `TX030` ab, wenn eine Seite `runtime = "server"` exportiert.

<!-- s:eb19728e6b -->
Hinter einem Proxy

<!-- s:21a17d0b45 -->
`text start` bindet sich an `127.0.0.1` und beantwortet bei dieser Loopback-Bindung nur Anfragen an `localhost`, `*.localhost` und Hosts mit IP-Adressen (Schutz vor DNS-Rebinding). Andere Hosts erhalten `403` mit `TX028`. Trage die öffentlichen Einstellungen in `text.config.ts` ein:

<!-- s:43bd5471c8 -->
Ohne `origin` oder `trustProxy` wird `request.url` aus dem validierten `Host`-Header mit `http` gebildet.

<!-- s:689cebe287 -->
Einschränkungen

<!-- s:f45e3fb003 -->
- `proxy` in `text.config.ts` läuft nur in `text dev` und `text start`; Adapter enthalten es nicht. Verwende `rewrites`, das jeder Server-Adapter unterstützt.
- Serverless-Instanzen haben jeweils ihren eigenen In-Memory-Cache. Siehe [Caching](/docs/caching#platform-notes).
- `rewrites`, die rohe Gruppen regulärer Ausdrücke verwenden, werden nach bestem Bemühen in Vercel-Routen übersetzt; benannte Parameter (`:slug`, `:path*`) sind exakt.
