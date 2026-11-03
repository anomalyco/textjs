<!-- s:5f3abb073d -->
I client HTTP da terminale ricevono il primo frame di una pagina come testo ANSI truecolor invece del documento HTML. Non devi configurare nulla.

<!-- s:f501ff55e0 -->
Richieste che ricevono un frame

<!-- s:3384141bb9 -->
Una richiesta riceve un frame quando tutte queste condizioni sono soddisfatte:

<!-- s:05a334e510 -->
- il metodo è `GET` o `HEAD`;
- lo `User-Agent` inizia con `curl/`, `Wget/`, `wget2/`, `HTTPie/` o `xh/`;
- l’header `Accept` è assente o non menziona `text/html`.

<!-- s:4af297e372 -->
Browser, crawler e anteprime dei link ricevono la pagina HTML. Per ottenere l’HTML da curl, richiedilo:

<!-- s:03dba887a9 -->
Il frame viene scelto nel punto in cui la pagina sarebbe servita: dopo [middleware](/docs/middleware), `rewrites` e [route handler](/docs/route-handlers), e mai per file o percorsi il cui ultimo segmento contiene un punto. Reindirizzamenti del middleware, `401`, header e riscritture si applicano a curl come ai browser. `/api/health` esegue comunque il proprio handler e `/robots.txt` serve comunque il file.

<!-- s:e0c4f5f416 -->
Contenuto del frame

<!-- s:50fa4581ec -->
Il frame è il primo rendering della pagina, come in una [shell con pre-rendering](/docs/server-rendering#partial-prerendering): ogni boundary `<Suspense>` ancora in attesa mostra il proprio fallback. I componenti server asincroni non vengono eseguiti e `fetch()` non si risolve mai, quindi i dati caricati negli effetti restano nello stato di caricamento.

<!-- s:08efeec61a -->
- **Dimensioni:** 80 × 24 celle. Un’app con viewport fisso (`viewport.responsive: false`) usa invece `viewport.width × viewport.height`.
- **Colori:** codici di escape SGR a 24 bit nel `viewport.theme` dell’app. Ogni riga termina con un reset e il frame termina con un carattere di nuova riga.
- **Stato:** `200`, oppure `404` con la pagina non trovata dell’app quando nessuna pagina corrisponde o la pagina chiama `notFound()`. Una pagina che chiama `redirect()` durante il rendering serve HTML.

<!-- s:1125803eb1 -->
Le risposte sono `text/plain; charset=utf-8` con `Vary: User-Agent, Accept` e `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, quindi le cache condivise non memorizzano mai un frame per poi servirlo a un browser. La pagina HTML a un percorso in cui curl riceve un frame include lo stesso header `Vary`.

<!-- s:0e2aba0a67 -->
Ambienti supportati

<!-- s:d40234848f -->
| Host | Pagine statiche | Pagine dinamiche, percorsi sconosciuti |
| :-- | :-- | :-- |
| `text dev` | Rendering su richiesta | Rendering su richiesta |
| `text start`, `bun` | Pre-rendering con `text build` | Rendering su richiesta |
| `vercel`, `cloudflare` | Pre-rendering con `text build` | Pagina HTML |
| `static` | Pagina HTML | Pagina HTML |

<!-- s:11c905d6a6 -->
Le pagine renderizzate lato server richiedono `text start` o `bun` (vedi [Deploy](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Gli host statici non possono rispondere a un client in modo diverso da un altro, quindi l’adapter `static` non supporta i frame. Su Vercel e Cloudflare, i frame delle pagine statiche sono inclusi nella build. Lì le pagine dinamiche (`[id]`, `force-dynamic`) servono HTML, perché gli adapter `vercel` e `cloudflare` non eseguono il deploy di un renderer.

<!-- s:022d3d5541 -->
`text start` e `bun dist/server.js` eseguono il rendering delle pagine rimanenti su richiesta con `.text/server/live.mjs` e conservano gli ultimi 128 frame per 10 secondi. Ogni server esegue il rendering di un massimo di 20 pagine non in cache ogni 10 secondi. Oltre questo limite, curl riceve la pagina HTML finché il budget non si ripristina. Se non è possibile caricare `live.mjs` sul server, per esempio perché un modulo di pagina legge `window` al livello principale, quelle pagine servono HTML.

<!-- s:2500855fbd -->
`text build` riporta i frame generati dal pre-rendering:

<!-- s:37f210b46a -->
Configurazione

<!-- s:ac46338e16 -->
Modifica le dimensioni per l’intera app o disattiva i frame:

<!-- s:36fb2e113c -->
Una pagina può modificare le proprie dimensioni o servire HTML anche ai terminali:

<!-- s:11c75396f6 -->
Le dimensioni sono limitate a 1–500 celle. Con `ansi: false` in `text.config.ts`, le esportazioni delle pagine vengono ignorate.

<!-- s:17ae9b44af -->
HTTP non cifrato

<!-- s:e9b0dd23eb -->
curl non segue i reindirizzamenti a meno che tu non passi `-L`. Vercel reindirizza le richieste `http://` a `https://`, e lo stesso fa Cloudflare con **Always Use HTTPS** attivo, quindi `curl http://…` stampa il reindirizzamento invece del frame. Condividi URL `https://`.

<!-- s:740b32f53f -->
Server personalizzati

<!-- s:144c78c64b -->
`@textjs/app/ansi` esporta le funzioni di supporto per il rilevamento e la risposta, per server e funzioni che non eseguono `text start` o un adapter:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` accetta anche `(method, headers)` con `Headers` Web o `IncomingHttpHeaders` di Node. `frameToAnsi(buffer, { theme })` codifica un `CellBuffer` renderizzato nello stesso modo del framework.
