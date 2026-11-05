<!-- s:7e7d3cb07e -->
`text build --embed` compila la tua app in modo che un altro sito possa aggiungerla con un solo tag script, per esempio una pagina di marketing, un sito di documentazione, una pagina WordPress o Webflow oppure un’app React 18. I visitatori che aprono DevTools trovano la tua app nella console. Gli altri visitatori scaricano `embed.js` (circa 3 kB con gzip) e nient’altro, a meno che la pagina non contenga un `<text-console>`.

<!-- s:2aa1d07d89 -->
Gli embed sono sperimentali. `text build --embed`, l’opzione `embed`, `<text-console>` e le esportazioni di `@textjs/app/experimental` possono cambiare in una versione minore. Consulta [Modifiche incompatibili](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Aggiungere un’app a un sito

<!-- s:f296ccaeef -->
Compila l’app:

<!-- s:2198c52791 -->
Carica `dist/` su un qualsiasi host statico o CDN, oppure copiala nella cartella `public/` del sito, poi aggiungi un tag alle pagine del sito:

<!-- s:aa94ef1985 -->
`embed.js` carica gli altri file in relazione al proprio URL, quindi `dist/` funziona da qualsiasi percorso o origine. Contiene solo `embed.js` e `assets/`, senza `index.html` o `404.html` che potrebbero sostituire quelli del sito. Un’app con [route renderizzate lato server](#server-rendered-routes), route handler o middleware richiede un server anziché un semplice caricamento statico. Gli adapter `vercel` e `cloudflare` eseguono route handler e middleware, mentre le route renderizzate lato server richiedono `text start` o l’adapter `bun`.

<!-- s:5c139759a2 -->
Per mostrare ai visitatori dove si trova l’app, aggiungi [`<text-console>`](#text-console) in un punto qualsiasi della pagina. Anche qualsiasi elemento con `data-textjs-engage` avvia l’app quando viene premuto:

<!-- s:6a70ec16e1 -->
Per provarla in locale, esegui `text dev --embed`. Serve `/embed.js` con un primo frame nuovo a ogni richiesta e una pagina di anteprima su `/` (`/__textjs/embed` con `standalone`) che lo carica come farebbe un altro sito. Anche un sito su un’altra porta locale può caricare `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Configurazione

<!-- s:aa9630bf92 -->
`text build --embed` equivale a `embed: true` in `text.config.ts`. Passa un oggetto per modificare i valori predefiniti:

<!-- s:fbe8efc9f4 -->
| Opzione | Valore predefinito | Descrizione |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | La route su cui si apre la console. Deve iniziare con `/` |
| `globalName` | `"text"` | Il nome globale con cui l’app installa la propria API della console all’avvio. `false` non ne installa nessuno |
| `initialClear` | `false` | Cancella la console della pagina prima del primo frame. Per impostazione predefinita, ciò che la pagina ha registrato prima resta sopra l’app |
| `standalone` | `false` | Compila anche le pagine dell’app (`index.html`), come fa `text build` senza `embed` |
| `allowOrigins` | `[]` | Siti le cui pagine possono eseguire route renderizzate lato server da questo server. Consulta [Route renderizzate lato server](#server-rendered-routes) |
| `credentials` | `false` | Invia le credenziali del browser per questo server con le richieste delle sessioni live da `allowOrigins`, anziché scartare cookie e `Authorization`. Richiede origini esatte |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (valore predefinito 120 × 36) è la dimensione del primo frame. `title`, `hints` e `action` sono i valori predefiniti di `<text-console>`. `embed.js` non contiene un primo frame generato con pre-rendering con `ppr: false`, o quando `middleware.ts` potrebbe corrispondere a `initialPath`, poiché chiunque può scaricare `embed.js`. Un mirror resta vuoto finché l’app non disegna.

<!-- s:7ca27066c7 -->
Comportamento

<!-- s:1fe89ec57c -->
- **Nient’altro viene caricato fino al [segnale di utilizzo della console](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` registra il primo frame generato con pre-rendering, poi attende. L’app si carica quando DevTools è agganciato alla finestra (al caricamento o in seguito), quando il visitatore preme una scorciatoia di DevTools nella pagina (F12, Ctrl+Shift+J, I, C o K, oppure ⌘⌥J, I, C o K su Mac) o quando preme un `<text-console>` o un elemento `[data-textjs-engage]`. Da quel momento, i ricaricamenti nella stessa scheda la avviano subito. DevTools in una finestra separata non modifica le dimensioni della pagina, quindi i visitatori che lo hanno aperto da un menu vedono il primo frame finché non premono uno di quegli elementi.
- **Sugli schermi touch, l’app non si avvia.** Su un dispositivo che corrisponde a `(hover: none) and (pointer: coarse)`, `embed.js` non registra nulla e non aggiunge listener. L’unico file che carica è quello di `<text-console>`, per un mirror.
- **I tasti raggiungono l’app solo dopo che il visitatore l’ha attivata.** Per attivarla, preme un `<text-console>` o un elemento `[data-textjs-engage]`, oppure fa clic sulla pagina (non su un link, un pulsante o un campo) per riportare il focus da DevTools. La digitazione nei campi della pagina o in un elemento `[data-textjs-bypass]` non raggiunge mai l’app, e la rotellina fa sempre scorrere la pagina.
- **L’URL, la cronologia e il titolo della pagina non cambiano mai.** Le route, `<Link>` e `useRouter()` navigano all’interno della console. Nelle app renderizzate lato client, gli URL assoluti si aprono in una nuova scheda.
- **Un’app Text.js sulla pagina ha la priorità.** Quando si avvia, un embed in esecuzione si smonta, smette di leggere i tasti e rimuove il proprio nome globale. Un embed che si carica mentre un’altra app occupa la console registra un avviso e non si avvia.
- **L’embed include il proprio React 19.** Non contiene `react-dom` né import senza percorso, quindi la versione di React della pagina, una import map per `react` e React DevTools non lo influenzano.

<!-- s:5bd6dcbe49 -->
Cosa si carica e quando

<!-- s:631a37c837 -->
| File | Caricamento | gzip |
| :-- | :-- | --: |
| `embed.js` | Con la pagina | 2,9 kB |
| `assets/text-console-[hash].js` | Quando la pagina contiene un `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` e `assets/yoga-[hash].wasm` | Al segnale di utilizzo della console | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Al segnale di utilizzo della console, al posto del client, per una [route renderizzata lato server](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | La prima volta che l’app mostra testo da destra a sinistra (consulta [Caricamento del motore bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Le dimensioni si riferiscono a un riquadro di stato con bordo a 120 × 36. `text build --embed` stampa quelle della tua app. `assets/embed-[hash].js` è una copia di `embed.js` con un nome che non cambia mai (consulta [Deploy](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` definisce `<text-console>` e carica il suo file solo quando la pagina ne contiene uno. Usa Shadow DOM, quindi il CSS della pagina non raggiunge il suo interno e una policy `style-src 'self'` non richiede modifiche.

<!-- s:9ceead3eca -->
Senza attributi è una barra di una riga. Mostra la scorciatoia del browser per aprire la console, poi chiede un clic, quindi elenca i tasti dell’app, che si illuminano quando la raggiungono. In Safari, il primo passaggio indica di attivare «Mostra funzionalità per sviluppatori web» nelle impostazioni di Safari.

<!-- s:899e0c7fe3 -->
Con `mirror`, mostra il frame dell’app sulla pagina: il primo frame generato con pre-rendering prima che si carichi qualsiasi altra cosa, poi l’app in esecuzione. Premerlo avvia l’app e le invia i tasti del visitatore, quindi l’app funziona con DevTools chiuso. `chrome` disegna una finestra DevTools intorno al mirror e implica `mirror`.

<!-- s:fefcb3e495 -->
| Attributo | Descrizione |
| :-- | :-- |
| `mirror` | Mostra i frame dell’app |
| `chrome` | Mostra i frame in una finestra DevTools |
| `title` | Il titolo della barra (valore predefinito: `title` in `text.config.ts`) |
| `hints` | I tasti da elencare, come `"← →:switch region, Enter:open"` (valore predefinito: `hints` in `text.config.ts`) |
| `action` | Cosa fare per prima cosa, mostrato come «Fai clic qui e …» (valore predefinito: `action` in `text.config.ts`, oppure premi il primo tasto suggerito) |

<!-- s:392012169b -->
Sugli schermi touch, un mirror mostra il primo frame senza avviare l’app e la barra è nascosta. Il testo dell’elemento è in inglese.

<!-- s:13ff4ec1f4 -->
Riservare lo spazio

<!-- s:0f4e2c234d -->
`text build --embed` stampa una riga di CSS per la griglia della tua app. Incollala nel foglio di stile della pagina. Dimensiona `<text-console>` prima che il file dell’elemento si carichi, così nulla nella pagina si sposta quando il file arriva. Per la griglia predefinita 120 × 36, la riga è:

<!-- s:a2d2741417 -->
La barra è alta 58 px. Un mirror mantiene le proporzioni della griglia, fino alla sua larghezza naturale (885 px a 120 colonne), e `chrome` aggiunge 43 px. La dimensione non dipende dai font. `reserveCss(cols, rows)` di `@textjs/app/experimental` restituisce la stessa riga.

<!-- s:a1260c10c3 -->
Un mirror nella parte inizialmente visibile della pagina è di solito l’elemento più grande, quindi determina il Largest Contentful Paint (LCP) della pagina. Il suo primo frame viene disegnato dopo il caricamento di `embed.js` e poi del file dell’elemento, uno dopo l’altro. Il resto della pagina viene disegnato come senza l’embed. Un mirror più in basso nella pagina non influisce sul LCP. Su una pagina con propri script differiti, come un’app React, `<script type="module" async src="…">` esegue `embed.js` senza attenderli, quindi un mirror nella parte inizialmente visibile viene disegnato prima.

<!-- s:4206a424a5 -->
Stile

<!-- s:834fbf40e6 -->
Per centrare un mirror, assegnagli margini inline automatici:

<!-- s:6dde2b2766 -->
È scuro per impostazione predefinita. Imposta `color-scheme: light` per colori chiari, oppure imposta i due colori dalla cui miscela derivano tutte le altre tonalità. `::part(frame)` applica lo stile al frame stesso. `chrome` mantiene lo sfondo di DevTools.

<!-- s:f5e077273b -->
Route renderizzate lato server

<!-- s:eb293d9fb4 -->
Quando `initialPath` è una route con `export const runtime = "server"`, `embed.js` carica il riproduttore di frame al posto del runtime client. Riceve i frame in streaming dal server da cui proviene `embed.js`, quindi esegui `text start` o l’adapter `bun`. Gli altri adapter fanno fallire la build. Consulta [Rendering lato server](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Una pagina su un altro sito può aprire una sessione live solo quando la sua origine è in `allowOrigins`:

<!-- s:6ec7048857 -->
- Una sessione risponde solo all’origine che l’ha aperta.
- Per impostazione predefinita, Text.js scarta i cookie e l’header `Authorization` delle sessioni da altri siti, quindi il [middleware](/docs/middleware) vede un visitatore non autenticato. `credentials: true` li mantiene e richiede origini esatte. Il browser li invia quando la pagina e il server condividono un dominio registrabile (`www.example.com` e `console.example.com`) e il cookie copre il server (`Domain=example.com`, o impostato su `console.example.com`). Da altri siti invia solo cookie impostati con `SameSite=None; Secure`, e i browser che bloccano i cookie di terze parti non ne inviano nessuno.
- Una sessione live invia richieste preliminari `OPTIONS` a `/__textjs/live` appena si connette e quando si riconnette. Le richieste preliminari non contengono cookie né `Authorization`, quindi il middleware che corrisponde a quel percorso deve lasciar passare le richieste `OPTIONS` senza autenticazione.
- Dietro un reverse proxy o una CDN, imposta `server.trustProxy` (consulta [Dietro un proxy](/docs/deploying#behind-a-proxy)). Senza questa impostazione, ogni visitatore ha l’indirizzo del proxy, quindi tutti condividono un unico limite di sessioni per client.

<!-- s:f739524722 -->
`text dev` accetta pagine su `localhost`, `127.0.0.1` e `[::1]` su qualsiasi porta senza `allowOrigins`, a meno che non sia impostato `credentials`.

<!-- s:d5df7bf60f -->
Hosting

<!-- s:4bef54c1c0 -->
`text start` e gli adapter `bun`, `vercel` e `cloudflare` servono una build embed con questi header. L’adapter `static` li scrive in `_headers`, che Cloudflare Pages e Netlify leggono. Su qualsiasi altro host, come un bucket di archiviazione o la cartella `public/` del sito, impostali tu:

<!-- s:be81a4c5ec -->
| Percorso | Header |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Entrambi, quando il sito è su un’altra origine | `Access-Control-Allow-Origin: *` e `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
I browser recuperano gli script modulo e WebAssembly con CORS, quindi i file su un’altra origine richiedono `Access-Control-Allow-Origin`. Servi `yoga-[hash].wasm` come `application/wasm`, compresso (consulta [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Deploy

<!-- s:01b888e293 -->
`embed.js` viene riconvalidato a ogni caricamento della pagina, quindi i nuovi visitatori ricevono subito il nuovo deploy. Una scheda che ha caricato il precedente `embed.js` importa ancora i file della build precedente quando il visitatore apre la console, anche ore dopo. Mantieni online gli `assets/` del deploy precedente: copia i nuovi file sopra quelli vecchi invece di sincronizzarli con eliminazione, e rimuovi i vecchi file dopo un giorno o due. Per fissare una build, inserisci il suo `assets/embed-[hash].js` nel tag. Anche i file di quella build devono restare online.

<!-- s:b748b07652 -->
Quando i file non sono più disponibili, `embed.js` registra un avviso che chiede al visitatore di ricaricare la pagina, e non si avvia né ricarica la pagina autonomamente.

<!-- s:fce19037b3 -->
Content Security Policy

<!-- s:de8e30a920 -->
`embed.js` non richiede script o stili inline. Aggiungi queste direttive alla policy della pagina ospitante, con `'self'` al posto dell’origine quando `dist/` si trova sulla stessa origine:

<!-- s:2da4077ce0 -->
| Direttiva | Valore | Utilizzo |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` e i suoi chunk |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, nelle app renderizzate lato client |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm` e `/__textjs/live` per le route renderizzate lato server |
| `img-src` | `data:` | Solo un `<text-console mirror>` la cui app disegna `<Image>` o `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Caricare l’app autonomamente

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` esporta le parti che compongono `embed.js`, per le pagine che caricano un’app a modo proprio:

<!-- s:238cbf53ee -->
| Esportazione | Descrizione |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Ciò che esegue `embed.js`: registra il primo frame, attende l’intenzione di usare la console, poi chiama `boot` |
| `bootEmbedClient(options)` | Avvia un’app renderizzata lato client con routing in memoria e input da tastiera filtrato per la pagina |
| `bootEmbedPlayer(options)` | Avvia il riproduttore di frame per una route renderizzata lato server |
| `createHostInput(options)` | Input da tastiera che segue le regole indicate sopra |
| `createTextConsoleMount(config)` | Restituisce una funzione `mount(element, shell?)` per `<text-console>` |
| `reserveCss(cols, rows)` | Il CSS che riserva lo spazio di `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` e `BYPASS_SELECTOR` sono i selettori per gli elementi che avviano l’app e per quelli che mantengono la gestione dei propri tasti.
