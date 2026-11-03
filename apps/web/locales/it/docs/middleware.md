<!-- s:88013af27d -->
Il middleware esegue codice prima che una richiesta sia completata. Può reindirizzare, riscrivere, impostare header e cookie oppure restituire direttamente una risposta.

<!-- s:895d99d1b5 -->
Convenzione

<!-- s:9e6d75b727 -->
Crea `middleware.ts` nella directory radice del progetto (o in `src/`), accanto ad `app/`. Esporta una funzione `middleware` (o un export predefinito) e un `config` facoltativo.

<!-- s:a4d39cdaaf -->
Il middleware viene eseguito prima dei [route handler](/docs/route-handlers), dei file statici e delle pagine della console, con `text dev`, `text start` e ogni [adattatore di deploy](/docs/deploying) server. Usa le API Web `Request` e `Response`, quindi lo stesso file funziona su Node, Bun, Vercel Edge e Cloudflare Workers.

<!-- s:dda0880da2 -->
Corrispondenza dei percorsi

<!-- s:1e1ec8c339 -->
Senza `config.matcher`, il middleware viene eseguito per ogni richiesta. I matcher usano la stessa sintassi di Next.js:

<!-- s:473d472bc8 -->
| Matcher | Corrispondenze |
| :-- | :-- |
| `/about` | `/about` e `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, escluso `/a` |
| `/user/:id(\\d+)` | `/user/42`, escluso `/user/ada` |
| `/((?!api/).*)` | Tutto tranne `/api/*` |

<!-- s:256aeeefbc -->
Aggiungi condizioni con `has` e `missing` (header, cookie, query o host):

<!-- s:d756420343 -->
I matcher si applicano al pathname senza `basePath`. In `text dev`, le richieste dei moduli di Vite (`/@vite/*`, file sorgente) non eseguono mai il middleware.

<!-- s:75cd7297e6 -->
Ogni host determina un unico pathname canonico prima di eseguire il middleware e lo usa per la corrispondenza, per `request.nextUrl` e per la ricerca di route, handler e file. Le sequenze di escape percentuali vengono decodificate e il percorso viene ricodificato come lo scrive `new URL()`, i segmenti `.` e `..` vengono risolti e le barre ripetute e finali vengono rimosse. `/ad%6din//users/` raggiunge il middleware come `/admin/users`, mentre `/café` rimane `/caf%C3%A9`. Un matcher scritto con una barra finale, come `/admin/`, corrisponde a `/admin`. Le richieste il cui percorso contiene una barra o una barra inversa codificata (`%2F`, `%5C`), un carattere di controllo o una codifica percentuale non valida ricevono un `400`. Le route distinguono tra maiuscole e minuscole: `/Admin` non corrisponde a `/admin` e i file statici vengono serviti solo con il loro nome esatto.

<!-- s:3f5746eb4e -->
Fai corrispondere gli URL a cui un file viene servito, non soltanto il suo nome. Cloudflare Pages serve `report.html` anche su `/report`, quindi un matcher per `/report.html` non protegge `/report`. Elencali entrambi, `matcher: ["/report", "/report.html"]`, oppure mantieni i file protetti in una directory e crea un matcher per quella directory, come `/reports/:path*` per i file in `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Effetto |
| :-- | :-- |
| `NextResponse.next()` | Prosegue verso la route |
| `NextResponse.redirect(url, status?)` | `307` per impostazione predefinita; `url` deve essere assoluto |
| `NextResponse.rewrite(url)` | Serve un altro percorso; le origini esterne passano tramite proxy |
| `NextResponse.json(body, init?)` | Risponde con JSON |
| `new Response(...)` | Risponde con qualsiasi contenuto |

<!-- s:a8292924c3 -->
Non restituire nulla per proseguire senza modifiche. `next()` e `rewrite()` accettano `{ status }` per cambiare lo stato della risposta finale. Solo le risposte create da `NextResponse.next()` / `NextResponse.rewrite()` guidano il routing: qualsiasi altra `Response`, inclusa una restituita da `fetch()`, viene inviata al client così com’è, dopo aver rimosso i suoi header `x-middleware-*`.

<!-- s:583e778785 -->
`request.nextUrl` esclude `basePath` da `pathname`, mentre i suoi `href` e `toString()` lo includono. Per rimanere all’interno dell’app, clonalo: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Header

<!-- s:37748fa2c3 -->
Passa `request.headers` per cambiare ciò che ricevono gli handler a valle e `headers` per aggiungere header alla risposta:

<!-- s:60bf4677c2 -->
Gli header di risposta del middleware vengono aggiunti alla risposta finale, a meno che il route handler non imposti lo stesso header.

<!-- s:ef657b8fe3 -->
Cookie

<!-- s:5d3635224b -->
`request.cookies` legge l’header `Cookie`; `response.cookies` scrive `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
I cookie impostati su una risposta `next()` o `rewrite()` sono visibili anche al route handler nella stessa richiesta.

<!-- s:a65a1ce099 -->
Attività in background

<!-- s:de593dc070 -->
Il secondo argomento dispone di `waitUntil()`, che mantiene attivi i runtime serverless dopo l’invio della risposta:

<!-- s:63e13e87b3 -->
Note

<!-- s:971c06c875 -->
- Le pagine renderizzate lato client vengono renderizzate nel browser, quindi una riscrittura verso un’altra pagina cambia il file servito, non la route che l’app della console renderizza. Le riscritture verso route handler, file statici e origini esterne si comportano come previsto.
- Il middleware può leggere il corpo della richiesta; i route handler continuano a riceverlo. Il corpo delle richieste escluse da un matcher non viene mai toccato.
- `request.url` ha sempre l’origine del server: le destinazioni delle richieste come `//other.host/x` vengono normalizzate a una sola barra iniziale.
- L’[adattatore statico](/docs/deploying#static) non può eseguire middleware.
