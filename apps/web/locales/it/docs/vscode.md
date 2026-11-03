<!-- s:8f3fd7167d -->
L’estensione Text.js per VS Code mostra il frame della console accanto al codice. Rispecchia l’app in esecuzione con `text dev`, oppure renderizza il file aperto quando non c’è nulla in esecuzione. Aggiunge anche la generazione di file per App Router, snippet e link per i codici di errore `TX###`.

<!-- s:98304b8243 -->
Installazione

<!-- s:80e247d2f7 -->
Installa [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) dal Visual Studio Marketplace. In VS Code, apri la vista Estensioni (`⌘⇧X`) e cerca `textjs.vscode-textjs`, oppure esegui:

<!-- s:fd2344ec36 -->
Si attiva in qualsiasi cartella che contiene un’app Text.js: un `text.config.ts`, oppure un pacchetto che dipende da `@textjs/app` e ha una directory `app/`. Funziona anche nei monorepo con più app.

<!-- s:74f1530aa8 -->
Anteprima dal vivo

<!-- s:d9807ea49d -->
Apri un `page.tsx`, un `layout.tsx` o un componente ed esegui **Text.js: Open Preview** (`⌘K V`), oppure fai clic sul pulsante di anteprima nella barra del titolo dell’editor. Il pannello disegna il frame con la stessa cornice DevTools e le stesse celle Menlo della console del browser.

<!-- s:2f69f76b80 -->
L’anteprima riceve i frame da una di due sorgenti. Il badge nella barra degli strumenti mostra quale è attiva:

<!-- s:f81cef21bf -->
| Sorgente | Quando | Cosa vedi |
| :-- | :-- | :-- |
| **Live** | `text dev` è in esecuzione e una scheda del browser ha l’app aperta | L’app reale, con il suo stato, i dati e le dimensioni della griglia |
| **Headless** | Nessun server di sviluppo o nessuna scheda aperta | Il file aperto, renderizzato dall’estensione alle dimensioni del pannello |

<!-- s:f40888c2bb -->
`auto` (il valore predefinito) usa Live quando può e Headless altrimenti. Fissa una delle due modalità dal badge o con `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Tastiera

<!-- s:9ce66a1aa7 -->
Fai clic sulla console per inviare i tasti all’app: frecce, `Tab`, scorciatoie, digitazione e incolla funzionano come nel browser. Fai clic fuori dalla console per smettere. Le scorciatoie dell’editor come `⌘P` e `⌘⇧P` continuano a essere inviate a VS Code. Lo scorrimento sopra la console invia eventi della rotellina.

<!-- s:0910b5fd48 -->
Nel campo dell’indirizzo puoi digitare una route, come `/deployments/dpl_a1`, per navigare in entrambe le sorgenti.

<!-- s:4507d73bb4 -->
Modalità Live

<!-- s:787b87d328 -->
Mentre un’anteprima è aperta, il server di sviluppo chiede alle schede connesse di trasmettere i propri frame. Le schede inviano solo le righe modificate e smettono di inviarle quando l’anteprima si chiude, quindi un’app senza anteprime aperte non sostiene alcun costo. Il salvataggio di un file passa attraverso Fast Refresh e l’anteprima si aggiorna insieme alla scheda.

<!-- s:86ae14b746 -->
Attiva **Follow** (`textjs.preview.followEditor`) per spostare la scheda del browser sulla route del `page.tsx` che stai modificando.

<!-- s:68839106d6 -->
Le schede in background non ricevono frame di animazione, quindi normalmente trattengono i propri frame finché non tornano visibili. Mentre un’anteprima le osserva, una scheda in background disegna un frame non appena arriva un input, quindi la digitazione nell’anteprima continua a produrre aggiornamenti. Le animazioni in una scheda in background si aggiornano circa una volta al secondo. Metti l’app in una finestra dedicata per mantenerle regolari.

<!-- s:1ae6e7077f -->
Modalità Headless

<!-- s:1cddf967be -->
L’estensione avvia un piccolo runner nel tuo progetto. Carica i file delle route tramite Vite e `@textjs/app` del progetto stesso, quindi alias, TypeScript e JSX si comportano come in `text dev`. Monta l’App Router sulla route del file aperto, con i suoi layout, usando una cronologia in memoria:

<!-- s:23d9451fef -->
| File | Anteprima |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (i segmenti dinamici usano il proprio nome) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | L’export predefinito, o il primo export PascalCase, senza prop |

<!-- s:f111cbfc61 -->
Le chiamate `fetch("/api/...")` della stessa origine eseguono gli handler `route.ts` nello stesso processo, come con [`text run`](/docs/terminal). La griglia segue le dimensioni del pannello e il salvataggio di qualsiasi file nell’app la renderizza di nuovo. Gli errori appaiono sopra il frame, con link alle rispettive pagine `TX###`.

<!-- s:36cd3f2bb4 -->
Comandi

<!-- s:d542a683ff -->
| Comando | Descrizione |
| :-- | :-- |
| Text.js: Start Dev Server | Esegue lo script `dev` (o `text dev`) in un terminale |
| Text.js: Stop Dev Server | Arresta un server di sviluppo avviato da VS Code |
| Text.js: Open Preview | Apre l’anteprima dal vivo per il file attivo |
| Text.js: Open in Browser Console | Apre la route corrente sul server di sviluppo. Poi [apri la console del browser](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` con metadati e `params` tipizzati |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` con `GET` e `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
I comandi di generazione dei file si trovano anche nel menu contestuale delle cartelle in Esplora risorse. Accettano segmenti di [App Router](/docs/routing) come `settings`, `blog/[slug]`, `docs/[...path]` e `(marketing)/about`, e rifiutano di inserire un `page` e un `route.ts` nello stesso segmento. I progetti JavaScript (senza `tsconfig.json`) ricevono file `.jsx` e `.js`.

<!-- s:9ba0c1b237 -->
Snippet

<!-- s:193db2a68e -->
| Prefisso | Inserisce |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | File delle route, con il nome della cartella |
| `txc` | Un componente della console con il nome del file |
| `txroute`, `txroutep` | Route handler, con o senza parametri |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Componenti |
| `input`, `select`, `tabs` | Componenti interattivi |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook |
| `metadata`, `txconfig` | Metadati della route e `text.config.ts` |

<!-- s:a6e574a6aa -->
Codici di errore

<!-- s:5e9e2a4649 -->
Passa il puntatore su un codice `TX###` ovunque si trovi: nel sorgente, nei log, nel pannello Output o in uno stack trace incollato. Il riquadro al passaggio del puntatore mostra titolo, messaggio e pacchetto, con un link alla relativa pagina su textjs.org. Ogni codice è anche un link (`⌘`-clic).

<!-- s:b67d013d7e -->
Barra di stato

<!-- s:be63ef7ae2 -->
L’elemento `▼` mostra lo stato del server di sviluppo e le dimensioni della griglia della console, per esempio `▼ :3000  120×36`. Le schede comunicano le proprie dimensioni al server di sviluppo ogni volta che cambiano, anche senza anteprime aperte. Fai clic sull’elemento per accedere ai comandi principali.

<!-- s:5b827aed4d -->
Impostazioni

<!-- s:457ec968c0 -->
| Impostazione | Valore predefinito | Descrizione |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` o `headless` |
| `textjs.preview.followEditor` | `false` | Modalità Live: segue la route modificata |
| `textjs.preview.fontSize` | `12` | Dimensione del carattere delle celle (DevTools usa 12) |
| `textjs.preview.runtime` | | Binario Node.js per le anteprime headless (predefinito: quello incluso in VS Code) |
| `textjs.devServer.url` | | URL del server di sviluppo (predefinito: rilevamento sulle porte 3000–3010). Vengono usati solo indirizzi di loopback `http://` |
| `textjs.devServer.command` | | Comando per Start Dev Server |

<!-- s:ea5e740ef1 -->
Attendibilità dell’area di lavoro

<!-- s:ddcdd0b053 -->
L’anteprima e il server di sviluppo eseguono il codice del progetto (la configurazione Vite, `text.config.*` e i componenti). In modalità con restrizioni l’estensione offre solo snippet, generazione di file e link agli errori, e ignora `textjs.preview.runtime`, `textjs.devServer.command` e `textjs.devServer.url` nelle impostazioni dell’area di lavoro. Contrassegna l’area di lavoro come attendibile per attivare l’anteprima. I file esterni alle cartelle dell’area di lavoro non vengono mai mostrati in anteprima.

<!-- s:5ae438610c -->
Funzionamento

<!-- s:857bac4692 -->
`text dev` espone tre endpoint per gli editor. Rispondono solo a connessioni di loopback indirizzate a un host di loopback (`localhost`, `127.0.0.1`, `[::1]`) e solo a richieste senza `Origin` o con la stessa origine del server di sviluppo. Le richieste cross-site e `no-cors` dei browser vengono rifiutate:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Radice del progetto, schede connesse, dimensioni della griglia e route corrente |
| `GET /__textjs/frames` | Eventi inviati dal server: un evento `frame` per modifica, codificato come differenze tra righe |
| `POST /__textjs/input` | Un tasto, un’operazione di incolla, testo da IME o tasti morti (`text`), rotellina o navigazione per la scheda. Richiede JSON e l’header `x-textjs-mirror: 1`, quindi altri siti non possono inviare pressioni di tasti |

<!-- s:6693972af6 -->
Le schede inviano i frame al server di sviluppo tramite il socket HMR di Vite, che richiede un token per ogni server. Il formato di trasmissione è esportato da `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) se vuoi creare un tuo visualizzatore. Nulla di tutto questo è presente nell’output di `text build`.
