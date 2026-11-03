<!-- s:04615ef523 -->
`text build` produce una `dist/` portabile. Un adattatore la converte nell’output previsto da una piattaforma.

<!-- s:087f8d3137 -->
Adattatori

<!-- s:04908c6c09 -->
| Adattatore | Output | Esecuzione |
| :-- | :-- | :-- |
| *(nessuno)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Qualsiasi host statico |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
L’adattatore può anche essere specificato tramite `TEXTJS_ADAPTER`. Quando `text build` viene eseguito su Vercel (`VERCEL=1`) o Cloudflare Pages (`CF_PAGES=1`), l’adattatore corrispondente viene selezionato automaticamente.

<!-- s:9d8df946e5 -->
Gli adattatori server (`bun`, `vercel` e `cloudflare`) eseguono la stessa pipeline di `text start`: [middleware](/docs/middleware), `rewrites`, [route handler](/docs/route-handlers) con la [cache delle route](/docs/caching), risorse statiche, poi il documento della console per gli URL delle pagine. I client da terminale come curl ricevono invece il primo frame della pagina come testo ANSI. Su `vercel` e `cloudflare` questo vale solo per le pagine statiche (vedi [curl e client da terminale](/docs/curl)). Gli adattatori server servono i file con hash sotto `/assets/` con `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Statico

<!-- s:9ebd0d2866 -->
Usalo per host senza server, come GitHub Pages, S3 o una CDN. I route handler `GET` con `dynamic = "force-static"` o `revalidate` vengono sottoposti a pre-rendering in file: `app/api/feed.json/route.ts` diventa `dist/api/feed.json`. Una copia di `index.html` viene scritta in `404.html` affinché i deep link aprano l’app nella console. Gli host statici non distinguono curl da un browser, quindi curl riceve la pagina HTML.

<!-- s:1e90536a2a -->
La build fallisce, elencando ogni motivo, se l’app richiede un server: `middleware.ts`, [route renderizzate lato server](/docs/server-rendering), route handler dinamici, route handler con segmenti dinamici o metodi diversi da `GET`. Configura invece `rewrites` sull’host.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
L’adattatore `bun` scrive un unico server autonomo che non richiede `node_modules` in fase di esecuzione. Legge `PORT` (valore predefinito `3000`) e `HOSTNAME` (valore predefinito `0.0.0.0`) e non serve mai `server.js` o `.text/`. È un processo di lunga durata, quindi ospita anche le [route renderizzate lato server](/docs/server-rendering) (`export const runtime = "server"`) e le loro sessioni attive, come `text start`. Usalo in un container:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Oppure esegui un push su un repository Git collegato a Vercel: la build esegue `text build`, rileva Vercel e scrive `.vercel/output`.

<!-- s:3ee6894582 -->
| Output | Contenuto |
| :-- | :-- |
| `static/` | La build client (sotto `basePath`) |
| `functions/_textjs/server.func` | Una funzione Node.js 22 che serve ogni route handler, con streaming |
| `functions/_middleware.func` | Middleware di routing Edge: `middleware.ts` e percorsi canonici per ogni app |
| `config.json` | Header delle risorse, matcher del middleware, riscritture, route degli handler e documento della console |

<!-- s:3f3ba93b7d -->
Il middleware edge usa il protocollo `x-middleware-next` / `x-middleware-rewrite`, quindi le sovrascritture degli header e le riscritture avvengono nel router di Vercel prima di raggiungere la funzione o la CDN. Tutti i matcher condividono un unico pattern `src` di route. Le richieste non coperte da alcun matcher saltano il middleware, a meno che il loro percorso possa non essere in forma canonica (escape percentuali, caratteri codificati da un parser URL, `//`, segmenti `.` o `..`, una barra finale). Il middleware confronta quindi il percorso canonico, verifica `has` / `missing` e riscrive la richiesta verso quel percorso affinché Vercel la instradi allo stesso modo. Le app senza `middleware.ts` ricevono la stessa edge function, che esegue solo la riscrittura. Poiché ogni build include una funzione Edge, esegui il deploy da un account Vercel autenticato: i deploy anonimi (`vercel deploy --temporary`) non accettano funzioni Edge.

<!-- s:b5af065e25 -->
La funzione handler è interna. Ogni route handler le passa il percorso corrispondente nell’header di richiesta `x-textjs-path`. Questo header viene rimosso da ogni richiesta prima e dopo il middleware, e il middleware edge non ne inoltra mai uno (dal client o da `middleware.ts`), quindi solo le route degli handler possono impostarlo. Le richieste per `/_textjs/*` restituiscono `404` senza eseguire la funzione, prima e dopo il middleware e le riscritture. Le route generate distinguono tra maiuscole e minuscole, come i matcher e le riscritture su ogni altro host.

<!-- s:5e18b8a450 -->
I test dell’adattatore eseguono questo output su un’emulazione locale del router di Vercel. Il comportamento per la corrispondenza di `src`, le catture di `dest`, le trasformazioni degli header e le route `status` è stato verificato su deploy reali; il middleware Edge no, perché non può essere distribuito in modo anonimo.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
L’output usa la modalità avanzata di Pages:

<!-- s:9f0923168f -->
| File | Scopo |
| :-- | :-- |
| `_worker.js` | Middleware, riscritture, route handler e documento della console |
| `_routes.json` | Invia ogni richiesta al worker. Senza middleware o un `basePath`, `/assets/*` resta sulla CDN statica di Pages |
| `_headers` | Cache immutabile per `/assets/*` (accodata ai tuoi header) |
| `404.html` | Fa rispondere Pages con `404` per i file mancanti invece che con l’app (mantenuto se ne hai uno) |

<!-- s:9bc2b010d1 -->
`.text/` (bundle server e manifest della build) viene rimosso da `dist/`, poiché Pages pubblica la directory così com’è.

<!-- s:1200dbc88d -->
Abilita il flag di compatibilità `nodejs_compat` nel progetto Pages (Settings → Runtime) o in `wrangler.toml`; la cache dei dati usa `AsyncLocalStorage`. I file statici vengono serviti tramite il binding `ASSETS` e la riconvalida in background usa `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Con il middleware, ogni richiesta esegue il worker, incluse le risorse con hash, affinché il middleware veda ogni percorso attraverso cui un file è raggiungibile. Ogni richiesta che esegue il worker è un’invocazione di Functions e viene conteggiata nella tua quota di richieste Workers. Per il caricamento di una pagina, si tratta del documento più ogni file che recupera (2 per una piccola app di test con un bundle JavaScript; di più per app con più file). Nel piano Workers Free, Pages serve i file statici senza il worker una volta esaurita la quota giornaliera, saltando il middleware. Se il middleware protegge qualcosa in `dist/`, imposta Settings → Runtime → Fail open / closed su **Fail closed**.

<!-- s:600050383d -->
Aggiornamento

<!-- s:e8733a2bfb -->
Le correzioni di sicurezza in `@textjs/app` raggiungono un deploy solo dopo che hai ricompilato l’app ed eseguito nuovamente il deploy:

<!-- s:c74adc728a -->
- Vercel: esegui il deploy del nuovo `.vercel/output`.
- Cloudflare Pages: esegui il deploy della nuova `dist/`, con `_worker.js` e `_routes.json`.
- Bun: esegui il deploy dell’intera nuova `dist/` (`server.js`, risorse e bundle live) e riavvia il server.
- `text start`: esegui `text build` e riavvia.

<!-- s:8047727085 -->
I deploy precedenti restano raggiungibili ai rispettivi URL (per esempio gli URL di anteprima di Vercel e Cloudflare Pages). Eliminali o proteggili con i controlli di accesso della piattaforma.

<!-- s:f5e077273b -->
Route renderizzate lato server

<!-- s:049ef31493 -->
Le [route renderizzate lato server](/docs/server-rendering) mantengono una sessione per ogni scheda aperta, quindi richiedono un server di lunga durata: `text start` o l’adattatore `bun`. Gli adattatori `static`, `vercel` e `cloudflare` fanno fallire la build con `TX030` quando una pagina esporta `runtime = "server"`.

<!-- s:eb19728e6b -->
Dietro un proxy

<!-- s:21a17d0b45 -->
`text start` si associa a `127.0.0.1` e, mentre è associato al loopback, risponde solo a `localhost`, `*.localhost` e host con indirizzo IP (protezione dal DNS rebinding). Gli altri host ricevono un `403` con `TX028`. Inserisci le impostazioni pubbliche in `text.config.ts`:

<!-- s:43bd5471c8 -->
Senza `origin` o `trustProxy`, `request.url` viene costruito dall’header `Host` convalidato usando `http`.

<!-- s:689cebe287 -->
Avvertenze

<!-- s:f45e3fb003 -->
- `proxy` in `text.config.ts` viene eseguito solo in `text dev` e `text start`; gli adattatori non lo includono. Usa `rewrites`, supportato da ogni adattatore server.
- Ogni istanza serverless ha la propria cache in memoria. Vedi [Cache](/docs/caching#platform-notes).
- Le `rewrites` che usano gruppi grezzi di espressioni regolari vengono convertite in route Vercel nei limiti del possibile; i parametri con nome (`:slug`, `:path*`) hanno una corrispondenza esatta.
