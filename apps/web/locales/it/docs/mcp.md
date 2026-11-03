<!-- s:c351b288ae -->
`text mcp` esegue la tua directory `app/` in modalità headless, nello stesso processo, e la espone tramite il [Model Context Protocol](https://modelcontextprotocol.io), così gli agenti di programmazione possono usarla senza DevTools. L’agente naviga, preme tasti, legge i frame come testo semplice e chiama i route handler.

<!-- s:c66b3eaae7 -->
`text mcp` richiede Bun. Se avviato con Node, si riesegue con Bun quando `bun` è nel tuo `PATH`, altrimenti fallisce con `TX019`. I client MCP lo avviano per te, quindi raramente lo esegui a mano.

<!-- s:0ecddf15e1 -->
Configurazione

<!-- s:91bda9ef42 -->
Ogni client avvia `text mcp` dalla directory del tuo progetto. Usa `bunx --bun` per eseguire i file delle route come TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Oppure includilo in un commit per il team:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Per un progetto in una sottodirectory, accoda il percorso: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Strumenti

<!-- s:93ae76f73d -->
| Strumento | Descrizione |
| :-- | :-- |
| `list_routes` | Pagine e route handler in `app/`, e posizione corrente |
| `navigate` | Aggiunta o sostituzione di un percorso, o navigazione `back` / `forward` |
| `read_frame` | Frame come testo, con route, dimensioni, focus e cursore. `styles: true` aggiunge colori e attributi per ogni span |
| `press` | Combinazioni di tasti: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Digitazione del testo, un tasto per carattere (fino a 2000; usa `paste` per quantità maggiori). `submit: true` preme Enter al termine |
| `paste` | Un evento di incolla, come `⌘V` |
| `scroll` | Scorrimento con la rotellina del mouse di `rows` (e `cols`). Un `<ScrollBox>` scorre con la rotellina senza focus da tastiera |
| `resize` | Impostazione delle dimensioni della griglia in colonne e righe |
| `inspect_tree` | Albero dei componenti con limiti sullo schermo e ogni id che può ricevere il focus |
| `find` | Limiti di ogni corrispondenza e componente sottostante |
| `wait_for` | Attesa della comparsa o scomparsa di testo, o dell’inattività dell’app |
| `logs` | Output `console.*` acquisito ed errori React |
| `fetch` | Chiamata di un handler `route.ts` nello stesso processo. I corpi vengono letti fino a `maxBytes`; i flussi di eventi per `streamMs`, poi annullati |
| `reload` | Reimportazione dell’app dopo la modifica dei file |

<!-- s:526235e5c5 -->
Gli strumenti di input restituiscono il nuovo frame, quindi l’agente non ha bisogno di un `read_frame` separato dopo ogni tasto. Il frame corrente e l’elenco delle route sono disponibili anche come risorse `text://frame` e `text://routes`.

<!-- s:c30236f97d -->
Uno scambio tipico:

<!-- s:45e18bfa25 -->
Frame e inattività

<!-- s:f2e8fe0f06 -->
Prima di leggere un frame, ogni strumento attende che l’app sia inattiva: nessun frame pianificato, nessun `fetch` in corso e nessun commit o frame da 50 ms. Così l’agente vede il risultato del proprio input, non un frame a metà aggiornamento.

<!-- s:fbad6f5c1a -->
Un `<Spinner>` o un grafico che si aggiorna una volta al secondo conta comunque come inattivo tra gli aggiornamenti, quindi le pagine con animazioni restano leggibili. Un’app che esegue il rendering più spesso di ogni 50 ms non diventa mai inattiva. Le letture smettono di attendere dopo 1,5 secondi (`settleMs` modifica questo valore), emettono l’ultimo frame e lo contrassegnano come `busy`. `wait_for` senza testo attende l’inattività, con il proprio `quietMs`, e restituisce un errore se l’inattività non arriva mai.

<!-- s:c5250c2f7a -->
Le coordinate sono celle con indice a base zero: `x` è la colonna, `y` la riga. I caratteri larghi, come CJK ed emoji, occupano due colonne.

<!-- s:7ff82431c5 -->
Errori e log

<!-- s:6e07cf8702 -->
stdout trasporta il protocollo. L’output `console.*` della tua app, le chiamate isolate a `process.stdout.write` e gli errori React finiscono invece in `logs`, numerati in modo che un agente possa richiedere solo le nuove voci con `since`. Quando sono stati registrati errori dall’ultima lettura, l’intestazione del frame successivo lo segnala.

<!-- s:9102068439 -->
I fallimenti vengono restituiti come errori degli strumenti, mai come arresti anomali. Uno strumento che supera il tempo limite viene annullato prima dell’esecuzione della chiamata successiva, quindi una chiamata lenta non digita mai nel frame della chiamata successiva. Gli errori con un codice Text.js lo mantengono, per esempio `TX007` per un tasto sconosciuto. Se l’app non si carica, ogni strumento spiega perché. Correggi il file e chiama `reload`.

<!-- s:d3ad6f781e -->
Opzioni

<!-- s:c9c30c0da4 -->
| Opzione | Descrizione |
| :-- | :-- |
| `--path <pathname>` | Prima route (predefinita `/`) |
| `--cols` / `--rows` | Dimensioni della griglia (predefinite: `viewport` in `text.config.ts`, altrimenti 100×32) |
| `--theme <name>` | Preimpostazione del tema |
| `--no-config` | Ignora `text.config.ts` |
| `--verbose` | Scrive i log acquisiti anche su stderr |

<!-- s:5ae438610c -->
Funzionamento

<!-- s:7c71219a13 -->
`text mcp` esegue la tua app come [`text run`](/docs/terminal): ogni modulo di route viene importato in anticipo, l’App Router usa una cronologia in memoria e le chiamate `fetch("/api/…")` alla stessa origine eseguono i tuoi handler nello stesso processo. I frame finiscono in una griglia di celle fuori schermo invece che in un terminale. Le pagine renderizzate lato server (`export const runtime = "server"`) e i loro componenti `async function` eseguono il rendering nello stesso processo, come in `text dev`, e il frame viene letto una volta completate le operazioni asincrone.

<!-- s:c965dcc0e4 -->
`reload` smonta l’app, rimuove ogni modulo del progetto dalla cache dei moduli di Bun (inclusi i file esterni ad `app/`), scansiona di nuovo `app/` e rimonta l’app nella posizione corrente.

<!-- s:19d6f0da69 -->
Per incorporare il server nel tuo processo o usare un altro trasporto:

<!-- s:68c8d3995f -->
Limiti

<!-- s:910af21777 -->
- L’app viene eseguita in Bun, non in un browser. `window` e `document` non sono definiti, come in `text run`.
- Ogni server esegue un’app con una griglia. Ogni client MCP avvia il proprio server.
- `text mcp` esegue una propria copia headless dell’app. Non può collegarsi a una scheda del browser aperta con `text dev`.
