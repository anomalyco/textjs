<!-- s:c88a0b9074 -->
Operazione riuscita

<!-- s:232761cbc8 -->
Non si è verificato alcun errore.

<!-- s:0dbfdefc62 -->
Non è necessaria alcuna azione.

<!-- s:5278892fa4 -->
Yoga non inizializzato

<!-- s:3cc543df2e -->
Il layout si basa su Yoga, distribuito come WebAssembly, che deve essere istanziato prima del primo frame. Qualcosa ha creato un nodo della scena o una radice in modo sincrono prima che `initYoga()` si risolvesse.

<!-- s:08db9c8a11 -->
Usa le funzioni asincrone per creare la radice, che inizializzano Yoga per te:

<!-- s:0cc02c96a3 -->
Se ti serve `createConsoleRootSync()` o l’accesso diretto al grafo della scena del core, attendi `initYoga()` una volta all’avvio:

<!-- s:0f5cc351a1 -->
Le app avviate con `text dev` non incontrano mai questo errore.

<!-- s:cebca37b05 -->
Rendering al di fuori di una radice della console

<!-- s:c3b259f977 -->
Un hook o un componente Text.js (`useInput`, `<ScrollBox>`, …) è stato renderizzato sotto una radice React che non è una radice della console, il più delle volte perché `react-dom` renderizza un componente destinato alla console.

<!-- s:6f1ee54e3e -->
Renderizza i componenti della console tramite `renderToConsole` (o `createConsoleRoot`), non tramite `react-dom`:

<!-- s:c7cb019122 -->
Per mostrare la stessa interfaccia sulla pagina, usa `<TextCanvas>` da `@textjs/react/dom`, che crea la propria radice della console.

<!-- s:b657e4704a -->
Elemento host sconosciuto

<!-- s:a8bb5bc9a5 -->
Il reconciler riconosce solo due elementi intrinseci, `tx-box` e `tx-text`. Ha ricevuto un elemento con nome in minuscolo come `<div>` o `<span>`.

<!-- s:407e421c11 -->
Usa invece i componenti esportati:

<!-- s:2381168639 -->
<Box> annidato in <Text>

<!-- s:2e17219271 -->
`<Text>` dispone una sequenza di testo inline; non può contenere un contenitore Flexbox. Un `<Box>` (o un componente che ne renderizza uno, come `<Spacer>` o `<Divider>`) è stato renderizzato dentro un `<Text>`.

<!-- s:cd12727fb7 -->
Sposta il `<Box>` all’esterno e affianca i nodi di testo fratelli in una riga:

<!-- s:0346a73e37 -->
Un `<Text>` annidato è valido; viene renderizzato come uno span inline.

<!-- s:32864d644a -->
Rendering dopo lo smontaggio

<!-- s:c194b81d64 -->
`root.render()` è stato chiamato su una radice della console dopo `root.unmount()`. Una radice smontata ha rilasciato il proprio renderer e i listener di input.

<!-- s:4d43c601c1 -->
Crea una nuova radice, oppure mantieni la radice montata e renderizza un albero diverso:

<!-- s:41d1a6160d -->
Nei test, controlla `root.unmounted` prima di renderizzare da callback asincrone.

<!-- s:c5d7700094 -->
Modificatore sconosciuto nella combinazione di tasti

<!-- s:7729dd7762 -->
Ogni parte di una combinazione prima dell’ultimo `+` deve essere un modificatore: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) o `mod` (`⌘` su Apple, `Ctrl` altrove).

<!-- s:d5ba2b08ed -->
Tasto sconosciuto nella combinazione di tasti

<!-- s:a68eb32bc2 -->
L’ultima parte di una combinazione deve essere un singolo carattere, un tasto con nome (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) o un tasto funzione (`f1`–`f12`).

<!-- s:69f231367c -->
Le sequenze sono pressioni di tasti separate da spazi (`"g g"`). Le alternative sono separate da virgole (`"j, down"`).

<!-- s:92663abe8d -->
Combinazione di tasti vuota

<!-- s:aa16466cb6 -->
Una combinazione è terminata senza un tasto, per esempio `"ctrl+"` o `""`.

<!-- s:13284de673 -->
Specifica il tasto. Per associare il tasto più, scrivi `"ctrl++"`:

<!-- s:f329e5f580 -->
Attesa una singola pressione di tasto

<!-- s:95712ddbf5 -->
Una pressione di tasto è una singola azione concreta. `keyEventFromCombo()` ha ricevuto una sequenza come `"g g"`, oppure lo strumento MCP `press` ha ricevuto alternative come `"a,b"`.

<!-- s:0348879743 -->
Crea un evento per ogni pressione di tasto. `app.press()` nei test e lo strumento MCP `press` suddividono per te le sequenze separate da spazi:

<!-- s:467193a3d5 -->
Nessuno stdout per renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` scrive i frame ANSI su `process.stdout` per impostazione predefinita. È stato eseguito in un ambiente che ne è privo (un browser, un worker) e non è stata passata alcuna opzione `stdout`.

<!-- s:90c3d0ac1f -->
Eseguilo con Bun o Node, oppure passa un flusso scrivibile:

<!-- s:d3a77e5829 -->
Nel browser, usa invece `renderToConsole`.

<!-- s:f201fe8e80 -->
<Image src> senza un DOM

<!-- s:b9f409f560 -->
`<Image src>` decodifica le immagini tramite un `<img>` e un canvas. Qui non è disponibile `document` (terminale, server, test), quindi non è possibile caricare l’URL.

<!-- s:3c284cd278 -->
Decodifica l’immagine e passa i pixel RGBA:

<!-- s:775d3d31e6 -->
Nessun canvas 2D per <Image>

<!-- s:7da15f3e88 -->
Il browser ha rifiutato un contesto canvas `2d`, in genere perché una policy o una protezione dal fingerprinting disabilita il canvas, oppure perché la pagina ha esaurito la memoria GPU.

<!-- s:59ad35999f -->
Passa `pixels` decodificati altrove, oppure renderizza un’alternativa `alt`. `<Image>` mostra già il proprio testo `alt` quando il caricamento fallisce:

<!-- s:ca446b6432 -->
Caricamento di <Image> fallito

<!-- s:f11b7bffe8 -->
La richiesta dell’immagine è fallita: un 404, un errore di rete o un server cross-origin che non invia `Access-Control-Allow-Origin`. I pixel vengono letti da un canvas, quindi le immagini cross-origin richiedono CORS.

<!-- s:5e5daf0ad8 -->
Servi l’immagine dalla tua origine (`public/`), oppure abilita CORS sull’host dell’immagine:

<!-- s:aca80fe237 -->
Utilizzo al di fuori di <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` e `<Link>` leggono lo stato fornito da `<AppRouter>`. Il componente è stato renderizzato al di fuori di esso, in genere in una chiamata autonoma a `renderToConsole` o in un test unitario.

<!-- s:0dd134139b -->
Esegui l’app con `text dev`, `text start` o `text run`, che montano `<AppRouter>` per te. Quando renderizzi manualmente (test, incorporamenti), monta il router al posto della pagina:

<!-- s:f72dd41076 -->
File di route senza componente predefinito

<!-- s:bb105b223b -->
I file `page`, `layout`, `loading`, `error` e `not-found` devono esportare un componente React con `export default`. Questo file non esporta nulla come predefinito, oppure esporta qualcosa che non è una funzione.

<!-- s:737da9f930 -->
Route handler senza Response restituita

<!-- s:cb8f799843 -->
Un handler `route.ts` ha restituito `undefined` (o un altro valore diverso da `Response`), in genere per un `return` mancante in un ramo.

<!-- s:ec7e161fb3 -->
Restituisci una `Response` da ogni ramo:

<!-- s:62e5198b56 -->
Nessuna build di produzione

<!-- s:6668a2f9b4 -->
`text start` serve l’output di `text build`, e la directory di output (`outDir`, predefinita `dist`) non contiene alcuna build.

<!-- s:498f1313ed -->
Se hai modificato `outDir` in `text.config.ts`, esegui entrambi i comandi dalla stessa radice del progetto.

<!-- s:dfda64bc1d -->
Directory app/ assente

<!-- s:38ac920023 -->
`text run` renderizza App Router nel tuo terminale e non ha trovato la directory delle route.

<!-- s:6853e006ef -->
Eseguilo dalla radice del progetto, oppure passa la directory del progetto:

<!-- s:5a6362131f -->
text run / text mcp richiedono Bun

<!-- s:773405124b -->
`text run` e `text mcp` importano direttamente i tuoi file di route `.tsx`, operazione che richiede il loader TypeScript nativo di Bun. Avviata con Node, la CLI si riesegue con Bun quando `bun` è nel `PATH`; questo errore indica che non lo è.

<!-- s:6f7a84fdc6 -->
Installa [Bun](https://bun.sh), oppure esegui il comando direttamente con Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` e `text start` funzionano su Node.

<!-- s:89a2fef8aa -->
Comando CLI sconosciuto

<!-- s:eba41925ed -->
La CLI `text` ha sei comandi: `dev`, `build`, `start`, `run`, `proxy` e `mcp`.

<!-- s:8399f0df32 -->
`text deploy` non esiste. Crea la build per la tua piattaforma con `text build --adapter <name>` ed esegui il deploy dell’output con la CLI della piattaforma. Consulta [Deploy](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL del server OpenCode non valido

<!-- s:486a7eb67b -->
`--target` (o `OPENCODE_SERVER_URL`) deve essere una semplice origine HTTP(S). Conteneva un percorso, una query, un frammento o delle credenziali. Le credenziali negli URL finiscono nei log e nella cronologia del browser.

<!-- s:a2f7bb7ff8 -->
Imposta invece la password del server con `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Porta del bridge in conflitto con OpenCode

<!-- s:8780127b8f -->
Al bridge è stato richiesto di ascoltare sulla stessa porta locale del server OpenCode a cui inoltra le richieste.

<!-- s:0b359d8121 -->
Bridge già in esecuzione

<!-- s:76e9990092 -->
Un altro bridge (`bunx @textjs/opencode@latest proxy` o `text proxy`) è già in ascolto su questa porta. Puoi connetterti a esso invece di avviarne un altro.

<!-- s:d5c7dd3e92 -->
Connettiti al bridge in esecuzione, oppure avviane un secondo su un’altra porta:

<!-- s:20a5f0b929 -->
Porta del bridge in uso

<!-- s:4fb3fcf34c -->
Qualcosa di diverso da un bridge Text.js è in ascolto sulla porta richiesta.

<!-- s:4a35b098e4 -->
Oppure individua l’altro processo: `lsof -i :4096`.

<!-- s:f694899be6 -->
Template sconosciuto

<!-- s:13309ae8df -->
`--template` deve indicare uno dei template inclusi: `starter`, `dashboard` o `opencode`.

<!-- s:162e762178 -->
La directory di destinazione non è vuota

<!-- s:24518256d0 -->
create-text-app genera la struttura del progetto solo in una directory nuova o vuota, quindi non sovrascrive mai i tuoi file. Una directory `.git` e le cartelle degli editor (`.vscode`, `.idea`) sono ammesse.

<!-- s:2d505908ff -->
Scegli un nuovo nome per la directory:

<!-- s:0c1a816fb9 -->
Nome del progetto non valido

<!-- s:46e6e56ab7 -->
Il nome della directory diventa il nome in `package.json`, che deve essere un nome di pacchetto npm valido: in minuscolo, compatibile con gli URL, di massimo 214 caratteri e diverso da `textjs`, `react`, `react-dom`, `node_modules` o `favicon.ico`.

<!-- s:5aa32a2677 -->
Host bloccato

<!-- s:7c7e94bc6b -->
`text dev`, e `text start` quando è associato all’indirizzo di loopback (impostazione predefinita), rispondono solo alle richieste indirizzate a `localhost`, a un nome `*.localhost` o a un indirizzo IP. Questo li protegge dal DNS rebinding. È arrivata una richiesta con un’altra intestazione `Host`, in genere attraverso un tunnel, un reverse proxy o un nome host della LAN.

<!-- s:8caece973a -->
Autorizza l’host in `text.config.ts`. `text dev` legge `vite.server.allowedHosts` di Vite e `text start` legge `server.allowedHosts`. Un `.` iniziale autorizza i sottodomini:

<!-- s:2c7d7369a1 -->
`text start --host` con qualsiasi indirizzo diverso da quello di loopback salta il controllo. Consulta [Dietro un proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Opzione text.config sconosciuta

<!-- s:5117146873 -->
`text.config.ts` ha esportato una chiave che Text.js non legge, in genere un errore di battitura (`basepath` al posto di `basePath`) o un’opzione di Vite al livello principale.

<!-- s:31ae46d91d -->
Correggi il nome o sposta le opzioni di Vite sotto `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` controlla i tipi della configurazione e rileva questi errori nel tuo editor.

<!-- s:d1de5d5931 -->
Le route renderizzate lato server richiedono un server persistente

<!-- s:d06541fc12 -->
Una pagina esporta `runtime = "server"`: esegue il rendering sul server e trasmette i frame a ogni scheda aperta tramite una sessione che dura quanto la scheda. Gli host statici, Vercel Functions e Cloudflare Workers non possono mantenere queste sessioni, quindi `text build --adapter static|vercel|cloudflare` rifiuta l’app anziché distribuire route che non possono essere renderizzate.

<!-- s:27f8e0c99e -->
Esegui il deploy con un server che rimane attivo:

<!-- s:3ba9e63872 -->
Oppure esegui il rendering della route nel browser rimuovendo l’esportazione:

<!-- s:b39194c0e6 -->
Esportazione dynamic non valida

<!-- s:218844a290 -->
Un route handler esporta `dynamic` con un valore che Text.js non supporta. Next.js accetta anche `"error"`, che renderizza la route staticamente e fa fallire la build se legge dati dalla richiesta. Text.js non può rilevare le letture della richiesta, quindi rifiuta `"error"`.

<!-- s:78a6bdcb90 -->
Usa `"force-static"` per memorizzare l’handler nella cache. Un handler memorizzato nella cache riceve una richiesta senza query string, intestazioni, cookie o corpo:

<!-- s:95d0435b57 -->
Usa `"force-dynamic"`, o rimuovi l’esportazione, se l’handler legge la richiesta. Consulta [Cache](/docs/caching).
