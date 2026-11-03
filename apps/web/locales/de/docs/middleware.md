<!-- s:88013af27d -->
Middleware führt Code aus, bevor eine Anfrage abgeschlossen ist. Sie kann weiterleiten, umschreiben, Header und Cookies setzen oder selbst eine Antwort zurückgeben.

<!-- s:895d99d1b5 -->
Konvention

<!-- s:9e6d75b727 -->
Erstelle `middleware.ts` im Projektstammverzeichnis (oder in `src/`), neben `app/`. Exportiere eine `middleware`-Funktion (oder einen Standardexport) und optional eine `config`.

<!-- s:a4d39cdaaf -->
Middleware läuft vor [Route-Handlern](/docs/route-handlers), statischen Dateien und Konsolenseiten, unter `text dev`, `text start` und jedem serverseitigen [Deploy-Adapter](/docs/deploying). Sie verwendet die Web-APIs `Request` und `Response`, sodass dieselbe Datei auf Node, Bun, Vercel Edge und Cloudflare Workers läuft.

<!-- s:dda0880da2 -->
Pfade abgleichen

<!-- s:1e1ec8c339 -->
Ohne `config.matcher` läuft Middleware bei jeder Anfrage. Matcher verwenden dieselbe Syntax wie Next.js:

<!-- s:473d472bc8 -->
| Matcher | Treffer |
| :-- | :-- |
| `/about` | `/about` und `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, nicht `/a` |
| `/user/:id(\\d+)` | `/user/42`, nicht `/user/ada` |
| `/((?!api/).*)` | Alles außer `/api/*` |

<!-- s:256aeeefbc -->
Füge mit `has` und `missing` Bedingungen hinzu (Header, Cookie, Abfrage oder Host):

<!-- s:d756420343 -->
Matcher gelten für den Pfadnamen ohne `basePath`. Unter `text dev` lösen Vites eigene Modulanfragen (`/@vite/*`, Quelldateien) niemals Middleware aus.

<!-- s:75cd7297e6 -->
Jeder Host ermittelt vor der Ausführung der Middleware einen kanonischen Pfadnamen und verwendet ihn für den Abgleich, `request.nextUrl` und die Suche nach Routen, Handlern und Dateien. Prozentkodierungen werden dekodiert und der Pfad so neu kodiert, wie `new URL()` ihn schreibt, die Segmente `.` und `..` werden aufgelöst und wiederholte sowie abschließende Schrägstriche entfernt. `/ad%6din//users/` erreicht die Middleware als `/admin/users`, während `/café` als `/caf%C3%A9` erhalten bleibt. Ein Matcher mit abschließendem Schrägstrich, etwa `/admin/`, trifft auf `/admin` zu. Anfragen, deren Pfad einen kodierten Schrägstrich oder Rückstrich (`%2F`, `%5C`), ein Steuerzeichen oder eine ungültige Prozentkodierung enthält, erhalten `400`. Routen unterscheiden Groß- und Kleinschreibung: `/Admin` passt nicht zu `/admin`, und statische Dateien werden nur unter ihrem exakten Namen ausgeliefert.

<!-- s:3f5746eb4e -->
Gleiche die URLs ab, unter denen eine Datei ausgeliefert wird, nicht nur ihren Dateinamen. Cloudflare Pages liefert `report.html` auch unter `/report` aus, daher schützt ein Matcher für `/report.html` nicht `/report`. Führe beide auf, `matcher: ["/report", "/report.html"]`, oder lege geschützte Dateien in einem Verzeichnis ab und gleiche dieses ab, etwa mit `/reports/:path*` für Dateien in `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Wirkung |
| :-- | :-- |
| `NextResponse.next()` | Mit der Route fortfahren |
| `NextResponse.redirect(url, status?)` | Standardmäßig `307`; `url` muss absolut sein |
| `NextResponse.rewrite(url)` | Einen anderen Pfad ausliefern; externe Ursprünge werden über einen Proxy eingebunden |
| `NextResponse.json(body, init?)` | Mit JSON antworten |
| `new Response(...)` | Mit beliebigem Inhalt antworten |

<!-- s:a8292924c3 -->
Gib nichts zurück, um unverändert fortzufahren. `next()` und `rewrite()` akzeptieren `{ status }`, um den Status der endgültigen Antwort zu ändern. Nur Antworten, die mit `NextResponse.next()` / `NextResponse.rewrite()` erstellt wurden, steuern das Routing: Jede andere `Response`, einschließlich einer von `fetch()` zurückgegebenen, wird unverändert an den Client gesendet, wobei ihre `x-middleware-*`-Header entfernt werden.

<!-- s:583e778785 -->
`request.nextUrl` schließt `basePath` aus `pathname` aus, während `href` und `toString()` es enthalten. Um innerhalb der App zu bleiben, klone es: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Header

<!-- s:37748fa2c3 -->
Übergib `request.headers`, um zu ändern, was nachgelagerte Handler empfangen, und `headers`, um Antwort-Header hinzuzufügen:

<!-- s:60bf4677c2 -->
Antwort-Header aus der Middleware werden der endgültigen Antwort hinzugefügt, sofern der Route-Handler nicht denselben Header setzt.

<!-- s:ef657b8fe3 -->
Cookies

<!-- s:5d3635224b -->
`request.cookies` liest den `Cookie`-Header; `response.cookies` schreibt `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Cookies, die in einer `next()`- oder `rewrite()`-Antwort gesetzt werden, sind auch für den Route-Handler innerhalb derselben Anfrage sichtbar.

<!-- s:a65a1ce099 -->
Hintergrundaufgaben

<!-- s:de593dc070 -->
Das zweite Argument bietet `waitUntil()`, das serverlose Laufzeitumgebungen nach dem Senden der Antwort aktiv hält:

<!-- s:63e13e87b3 -->
Hinweise

<!-- s:971c06c875 -->
- Clientseitig gerenderte Seiten rendern im Browser, daher ändert eine Umschreibung auf eine andere Seite, welche Datei ausgeliefert wird, nicht welche Route die Konsolen-App rendert. Umschreibungen auf Route-Handler, statische Dateien und externe Ursprünge verhalten sich wie erwartet.
- Middleware kann den Anfrage-Body lesen; Route-Handler erhalten ihn weiterhin. Der Body von Anfragen, die ein Matcher ausschließt, bleibt unangetastet.
- `request.url` hat immer den Ursprung des Servers: Anfrageziele wie `//other.host/x` werden auf einen einzelnen führenden Schrägstrich normalisiert.
- Der [statische Adapter](/docs/deploying#static) kann keine Middleware ausführen.
