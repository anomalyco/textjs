<!-- s:f70688822a -->
Tutte le modifiche rilevanti a Text.js sono documentate in questo file.

<!-- s:1ab5f276ed -->
Il formato si basa su [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) e questo progetto segue il [versionamento semantico](https://semver.org/spec/v2.0.0.html). Le versioni da 0.1.0 a 0.4.0 sono state contrassegnate con tag in git e non pubblicate su npm.

<!-- s:2e16922cfc -->
Aggiunte

<!-- s:fa15b5f029 -->
- `@textjs/app` (sperimentale): `text build --embed`, oppure `embed` in `text.config.ts`, compila l’app come un unico tag da inserire in un altro sito: `<script type="module" src="https://your-host/embed.js"></script>`. `embed.js` scrive nella console il primo frame della route, generato tramite pre-rendering in fase di build (a meno che `ppr: false` o un middleware possa corrispondere a `embed.initialPath`), e non carica il runtime finché non si attiva `onConsoleIntent`. Poi importa l’app, con la propria copia di React 19 e senza `react-dom`, e scarica contemporaneamente `yoga.wasm`. Quando viene rilevata l’intenzione di usare la console, l’app carica 112,8 KB di JavaScript e 29,0 KB di WebAssembly (gzip). Il motore bidi, altri 10,1 KB, si carica la prima volta che l’app mostra testo da destra a sinistra. Quando `embed.initialPath` è una route con `export const runtime = "server"`, `embed.js` carica invece il riproduttore di frame da 22,7 KB, che riceve lo stream dal server da cui proviene `embed.js`. La navigazione resta nella console e non modifica l’URL, la cronologia o il titolo della pagina ospitante, e nelle app con rendering lato client gli URL assoluti si aprono in una nuova scheda. I tasti raggiungono l’app solo dopo che il visitatore preme un elemento `[data-textjs-engage]`, un elemento `<text-console>` o un `<FocusPad>`, oppure fa clic sulla pagina per riportare il focus da DevTools, e mai mentre digita nei campi della pagina o in un elemento `[data-textjs-bypass]`. `embed.js` carica gli altri file relativamente al proprio URL, quindi l’output funziona da qualsiasi percorso o origine. L’output comprende `embed.js` e `assets/`, senza `index.html` o `404.html`. Una build con una route renderizzata lato server, route handler o middleware mantiene anche `.text/` (i bundle del server) per `text start` o l’adattatore Bun. `assets/embed-[hash].js` è lo stesso script con un nome basato su hash, per la memorizzazione in cache come risorsa immutabile. `embed.standalone` mantiene le pagine dell’app, `embed.initialPath` sceglie la route, `embed.globalName` rinomina o rimuove `window.text` e `embed.initialClear` cancella prima il contenuto della console della pagina. Per un riquadro di stato con bordo a 120×36, `embed.js` pesa 2,9 KB (gzip), oppure 2,2 KB con `ppr: false`. Sugli schermi touch, `embed.js` non scrive nulla nella console e non carica mai il runtime, quindi l’app non si apre. Le pagine di altri siti possono aprire la sua sessione live solo se la loro origine è in `embed.allowOrigins`, e `embed.credentials` invia i loro cookie. `embed.js` e `assets/*` vengono serviti con `Access-Control-Allow-Origin: *` e `Cross-Origin-Resource-Policy: cross-origin`. `text start` e gli adattatori Bun, Cloudflare e Vercel servono una build incorporabile con `embed.js` riconvalidato a ogni richiesta e `assets/*` memorizzato in cache come immutabile, e l’adattatore statico scrive gli stessi header in `_headers`. Consulta [Incorporamento](https://textjs.org/docs/embedding).
- `@textjs/app` (sperimentale): `<text-console>` mostra ai visitatori come raggiungere un’app incorporata dalla pagina ospitante oppure, con `mirror`, mostra l’app stessa. `embed.js` definisce il tag e carica il relativo file da 4,0 KB (gzip) solo quando nella pagina è presente un elemento di questo tipo. Senza attributi è una barra di una riga. Mostra la scorciatoia del browser per aprire la console, poi chiede un clic, quindi elenca gli `hints` dell’app come tasti che si illuminano quando raggiungono l’app. Con `mirror` mostra il primo frame di `embed.js` prima che venga caricato qualsiasi altro elemento, poi i frame dell’app in esecuzione. Con `ppr: false`, il mirror resta vuoto finché l’app non disegna. Un clic sul mirror avvia l’app e le invia i tasti del visitatore, quindi l’app funziona con DevTools chiuso. `chrome` disegna una finestra DevTools intorno al mirror e implica `mirror`. Gli attributi `title`, `hints` (`"← →:switch region, Enter:open"`) e `action` usano i valori di `text.config.ts` se non sono specificati. Usa Shadow DOM e fogli di stile costruiti anziché React, quindi il CSS della pagina non raggiunge l’interno e una policy `style-src 'self'` non richiede modifiche. È scuro per impostazione predefinita. Modificane lo stile con `color-scheme: light`, `--text-console-bg` e `--text-console-fg`, oppure `::part(frame)`. Le sue dimensioni non dipendono dai font o dal contenuto. La barra è alta 58 px e il mirror mantiene le proporzioni della griglia dell’app. `text build --embed` stampa una riga di CSS che riserva quello spazio sulla pagina ospitante prima che l’elemento si carichi, e `reserveCss()` in `@textjs/app/experimental` restituisce la stessa riga. Sugli schermi touch il mirror mostra il primo frame e non avvia l’app, e la barra è nascosta. Consulta [`<text-console>`](https://textjs.org/docs/embedding#text-console).
- `@textjs/app` (sperimentale): `text dev --embed` serve `/embed.js` con un primo frame aggiornato a ogni richiesta e una pagina di anteprima che lo carica come farebbe un altro sito, con un `<text-console mirror>`. L’anteprima si trova su `/`, oppure su `/__textjs/embed` con `embed.standalone`.
- `@textjs/core/experimental`: `onConsoleIntent(onIntent, options)` chiama `onIntent` una volta quando un visitatore vuole usare la console, così la pagina può scaricare la propria app per la console solo in quel momento. Si attiva quando DevTools è agganciato al caricamento o viene agganciato in seguito (`"dock"`), e con le scorciatoie di DevTools F12, Ctrl+Shift+J, I, C o K, e ⌘⌥J, I, C o K su Mac (`"shortcut"`). Si attiva anche con un clic su un elemento `[data-textjs-engage]`, un elemento `<text-console>` o un `<FocusPad>`, con Enter o Space su un pulsante `[data-textjs-engage]`, e quando si sceglie una dimensione in `<ViewportControl>` prima dell’avvio della console (`"engage"`). I ricaricamenti in una scheda in cui si è già verificato uno di questi eventi attivano `"session"`. Sugli schermi touch non si attiva nulla automaticamente. Chiama `trigger()` sull’handle per caricare l’app su questi dispositivi. Il callback `prefetch` viene eseguito una volta quando il puntatore o il focus della tastiera raggiunge una superficie della console, oppure durante l’inattività con `idlePrefetch`, se `canPrefetchConsole()` indica che il dispositivo e la connessione sono adatti. `CONSOLE_INTENT_KEY` è la chiave di `sessionStorage` usata. Quando l’app è in un chunk separato, il chunk che chiama `onConsoleIntent` non include il codice per il dimensionamento del viewport. In una build Vite in cui il punto di ingresso chiama `onConsoleIntent` e importa un `ConsoleRenderer` su richiesta, il chunk di ingresso pesa 2,8 KB (gzip). Consulta [Caricamento all’intenzione di usare la console](https://textjs.org/docs/hooks-and-repl#loading-on-console-intent-experimental).
- `@textjs/core/experimental`: `CONSOLE_OWNER` (`Symbol.for("textjs.consoleOwner")`) registra quale app esegue il rendering nella console della pagina, e `claimConsole()` ne assume il controllo. Un `ConsoleRenderer` sulla console globale e un riproduttore di frame che controlla la propria pagina ne assumono il controllo, così un’app ospitante che si avvia sottrae la console a un’app incorporata, che quindi si smonta, scollega il proprio input e rimuove il proprio `window.text`. Un’app incorporata non si avvia mentre un’altra app controlla la console.
- `@textjs/app/experimental`: esporta `bootEmbedClient`, `bootEmbedPlayer`, `createHostInput`, `startEmbed`, `createTextConsoleMount` e `reserveCss` per le pagine che caricano autonomamente un’app incorporata.
- `@textjs/app`: `<AppRouter openExternal>` decide come aprire gli URL di altre origini (valore predefinito `window.location.assign`). Con la cronologia in memoria, ogni URL assoluto è considerato esterno, poiché l’indirizzo della pagina non è quello dell’app.
- `@textjs/react`: `<ViewportControl>` funziona prima che esista la radice della console. La scelta di una dimensione la salva, attiva `"engage"` per `onConsoleIntent` e applica la dimensione quando viene impostato `root`. Anche `<FocusPad sizeControl>` ottiene questo comportamento, quindi il suo menu delle dimensioni non resta più disabilitato fino all’avvio della console.
- `@textjs/core`: `initYoga({ wasm })` carica Yoga da un URL, dai suoi byte, da una `Response` o da un `WebAssembly.Module` compilato. Il file WebAssembly viene esportato come `@textjs/core/yoga.wasm`. Quando non è possibile caricarlo, `initYoga()` rifiuta la promise con [TX032](https://textjs.org/errors/TX032).
- `@textjs/core`: `loadBidi()` avvia il download del motore bidi prima del rendering di qualsiasi testo da destra a sinistra, così il primo frame di quel testo è in ordine di visualizzazione. Si risolve immediatamente nelle build che includono il motore (rendering lato server, `text run`, test). Consulta [Caricamento del motore bidi](https://textjs.org/docs/internationalization#loading-the-bidi-engine).

<!-- s:5b88618770 -->
Modifiche

<!-- s:4c3f9c7970 -->
- `@textjs/core`, `@textjs/app`: le app Text.js (`text dev`, `text build`) caricano Yoga come file `.wasm` separato anziché come copia base64 all’interno del JavaScript. `text build` genera `assets/yoga-[hash].wasm` e lo precarica dall’HTML. Con gzip su entrambi i file, l’app iniziale scarica 11,4 KB in meno e analizza 95 KB di JavaScript in meno. Gli altri bundler mantengono la copia inline, tranne quelli che risolvono la condizione `workerd` (Wrangler), che importano `yoga.wasm` come modulo. Anche le app che includono `@textjs/core` nel bundle con Vite o webpack possono caricare il file `.wasm` aggiungendo la condizione di risoluzione `@textjs/client`. Consulta [WebAssembly](https://textjs.org/docs/deploying#webassembly).
- `@textjs/app`: con `--adapter cloudflare`, un worker i cui route handler usano Yoga viene scritto come directory `dist/_worker.js/` contenente `index.js` e `yoga.wasm`, che Cloudflare carica come modulo compilato. I worker che non usano Yoga restano un unico file `dist/_worker.js`.
- `@textjs/app`: First Load JS di `text build` include i file `.wasm`.
- `@textjs/core`: dipende esattamente da `yoga-layout` 3.2.1, perché `yoga.wasm` e il suo loader vengono generati da quella versione.
- `@textjs/core`, `@textjs/app`: le app Text.js (`text dev`, `text build`) scaricano il motore bidi e le sue tabelle Unicode, un chunk da 10,1 KB (gzip), la prima volta che una pagina mostra testo da destra a sinistra. Prima le app li caricavano subito. Il template iniziale ora carica 9,3 KB di JavaScript in meno alla prima visita (gzip). Il testo da destra a sinistra che appare prima dell’arrivo del chunk viene disegnato in ordine logico, poi la console lo ridisegna in ordine di visualizzazione. Il rendering lato server, `text run`, i test e i bundle senza la condizione di risoluzione `@textjs/client` mantengono il motore nel bundle, quindi il loro output non cambia. Una shell generata tramite pre-rendering con testo da destra a sinistra fa avviare al client il download del motore all’avvio, insieme a Yoga, così il primo frame del client ridisegna la shell in ordine di visualizzazione. `embed.js` fa lo stesso per il suo primo frame.
- `@textjs/core`: `isRtlCodePoint` e `hasRtl` consultano 59 intervalli da destra a sinistra generati dai dati Unicode 18.0 e non caricano più le tabelle bidi. Restituiscono lo stesso risultato per ogni punto di codice. `<ConsoleMirror>` da solo include nel bundle 2,1 KB di JavaScript in meno (gzip), e il riproduttore di frame per le route renderizzate lato server 1,6 KB in meno.
- `@textjs/react/testing`: `render()` attende il motore bidi durante il download, così i frame sono in ordine di visualizzazione anche con la condizione `@textjs/client`.
- `@textjs/app`: `text build` esclude Dev Overlay e Redbox dalle build di produzione. Appaiono solo in `text dev`, ma prima ogni build li includeva nel bundle. Il JavaScript del client del template iniziale è più piccolo di 4,3 KB (gzip) e quello di `examples/dashboard` di 3,0 KB. Anche un’app che esegue il rendering di `<AppRouter>` autonomamente li esclude quando il bundler imposta `process.env.NODE_ENV` su `"production"` (il valore predefinito in `vite build`, webpack, `esbuild --minify` e `bun build --production`). In queste build, `<AppRouter devOverlay>` non esegue alcun rendering (passa `devOverlay={<TextDevOverlay />}` per mantenerlo), `errorStore` ha come valore predefinito `null` e `bootTextApp` ignora `dev: true`.
- `@textjs/react`: le radici della console caricano il codice che comunica con l’estensione Text.js DevTools solo quando l’hook dell’estensione è presente nella pagina, quindi nelle build con suddivisione del codice come `text build`, i visitatori senza l’estensione non lo scaricano. Con l’estensione, la prima radice di una pagina si registra una volta caricato quel file (circa 5 KB gzip). Le radici successive si registrano quando vengono create. Il JavaScript del client del template iniziale è più piccolo di 4,2 KB (gzip), il client di `text build --embed` di 4,1 KB e l’app per la console di textjs.org di 3,8 KB.
- `@textjs/core`: il driver della console verifica se il font della console supporta un glifo che potrebbe richiedere un sostituto (blocchi da un ottavo, quadranti, braille, ▶, ✓ e simili) la prima volta che quel glifo appare, anziché misurarli tutti al primo frame. I driver che usano la stessa dimensione e famiglia di font condividono i risultati. Un frame senza quei glifi non esegue misurazioni per i sostituti, quindi il primo frame della console della home di textjs.org richiede 1,2 ms anziché 9,2 ms in Chromium headless su un Mac mini M5 Pro, e 4,8 ms anziché 38,4 ms con la CPU rallentata di 4×. Su Windows 10, dove Consolas non dispone di quei glifi, i frame che li usano ottengono gli stessi sostituti di prima, fin dal primo frame.
- `@textjs/react/dom`: le funzioni di supporto per la scelta del viewport (`loadViewportChoice`, `saveViewportChoice`, `parseViewportChoice`, `formatViewportChoice`, `applyViewportChoice`, `VIEWPORT_CHOICE_KEY` e `VIEWPORT_PRESETS`) vengono spostate in un modulo dedicato. Un’app che le importa in un chunk ed esegue il rendering di `<ViewportControl>` o `<FocusPad>` in un altro non include più il codice del controllo nel primo chunk. Le esportazioni restano invariate.
- `@textjs/core`: un `ConsoleRenderer` non sottrae più `window.text` a un renderer attivo in un altro bundle.
- textjs.org: l’app per la console DevTools si carica quando DevTools è agganciato, quando un visitatore preme una scorciatoia di DevTools oppure fa clic su un’anteprima della console, un pad, il pulsante Console o Esegui nella console. Dopo, i ricaricamenti nella stessa scheda la caricano immediatamente. Sugli schermi touch non si carica automaticamente. Finché non si carica, l’anteprima della console nella home mostra il primo frame dell’app, renderizzato in fase di build, quindi il frame è presente prima del primo disegno. La finestra di ricerca, il menu del logo, i quiz di Impara, le cause e le soluzioni nelle pagine di errore e le descrizioni della documentazione, del blog e del negozio non vengono più caricati subito. Con queste modifiche, la home carica inizialmente 116,6 KB di JavaScript anziché 293,7 KB di JavaScript e WebAssembly (gzip), in 10 file anziché 37, e `/docs/routing` carica 116,7 KB anziché 301,4 KB. In Chromium headless con la CPU rallentata di 4× e un viewport desktop, la home esegue script per 177 ms anziché 235 ms e il suo heap JavaScript occupa 2,5 MB anziché 4,2 MB.
- textjs.org: i mirror della console non precaricano più il motore bidi, riducendo di altri 12,9 KB (gzip) il caricamento della home e delle pagine della documentazione oltre ai risparmi indicati sopra. L’app per la console carica Yoga come file `.wasm`, riducendo il download di 9,3 KB, e carica il motore bidi solo quando mostra testo da destra a sinistra, riducendo il caricamento all’avvio di 13,4 KB. L’esempio Testo bidirezionale nella pagina sull’internazionalizzazione carica il motore quando entra nell’area visibile durante lo scorrimento. La Content Security Policy non consente più `data:` in `connect-src`.

<!-- s:afe76b8d59 -->
Correzioni

<!-- s:3892b5eb43 -->
- `@textjs/app`: il riproduttore di frame di una route renderizzata lato server non scrive più nella console un frame in attesa del timer di cadenza dopo `text.pause()`, dopo che la scheda è stata nascosta o dopo che il riproduttore è stato eliminato.
- `@textjs/core`: Safari con lo zoom della pagina al 115% e DevTools chiuso non viene più scambiato per DevTools ancorato lateralmente, quindi il dimensionamento responsivo mantiene la dimensione di ripiego invece di adattarsi a un pannello che non c’è.

<!-- s:b3ea6ef7f1 -->
- `@textjs/react`: `<FocusPad messages>` sostituisce qualsiasi stringa predefinita del pannello, per i siti tradotti. Include ogni riga, le etichette per gli screen reader e il controllo delle dimensioni della console. Anche `<TextCanvas>` e `<ViewportControl>` accettano `messages`. `<ViewportControl>` usa solo le chiavi del controllo delle dimensioni. Le stringhe che contengono un valore, come «Poi fai clic qui e premi ↑ ↓.», sono funzioni che restituiscono l’intera frase. `defaultFocusPadMessages` contiene il testo inglese. Vedi [Tradurre il pannello del focus](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: nelle pagine da destra a sinistra, il pannello del focus mantiene da sinistra a destra i tasti come ⌘ ⌥ J e le dimensioni della console come 120×36, e dispone in modo speculare il controllo delle dimensioni e la barra dei passaggi. Nelle pagine in cinese e giapponese elimina lo spazio tra le sue due frasi; in coreano lo mantiene.
- textjs.org: textjs.org/ja non è più in bozza. Il selettore della lingua nel piè di pagina apre la stessa pagina in inglese o 日本語. Un browser impostato in giapponese mostra il pulsante 日本語で読む, e un browser in inglese su textjs.org/ja mostra Read in English. Il pulsante smette di apparire quando scegli una lingua o lo chiudi. I motori di ricerca indicizzano le pagine tradotte in giapponese e associano ciascuna alla sua versione inglese.
- textjs.org: su textjs.org/ja, il pannello del focus è in giapponese in ogni pagina, comprese le etichette sotto i tasti di ogni demo.
- textjs.org: spagnolo, francese, tedesco, portoghese brasiliano, italiano, russo, turco, polacco, indonesiano, vietnamita, hindi, coreano, cinese semplificato e tradizionale, arabo, ebraico, persiano e urdu non sono più in bozza su textjs.org/es, /fr, /de, /pt-br, /it, /ru, /tr, /pl, /id, /vi, /hi, /ko, /zh-cn, /zh-tw, /ar, /he, /fa e /ur. Il selettore della lingua nel piè di pagina e il pulsante basato sulla lingua del browser li propongono, come già fanno per il giapponese. I motori di ricerca indicizzano le pagine tradotte e associano ciascuna alla sua versione inglese.

<!-- s:cb13a45198 -->
- `@textjs/core`: le console di Chromium e Firefox cancellano l’output degli sprite animati a 16 MB anziché a 4 MB, quindi textjs.org/doom mostra «La console è stata cancellata» circa ogni 19 secondi anziché ogni 4,5. Safari e gli sprite disegnati con mezzi blocchi `▀` mantengono 4 MB. Il picco di memoria heap della pagina su textjs.org/doom passa da 10,8 MB a circa 12–13 MB.
- textjs.org: una pagina della documentazione scarica solo il proprio Markdown anziché tutte le 33 pagine, quindi le pagine della documentazione in inglese caricano 43–47 KB di JavaScript in meno (gzip) e quelle su /ja 60–64 KB in meno. Passare il puntatore su un link a un’altra pagina della documentazione o dargli il focus scarica quella pagina in anticipo, così continua ad aprirsi subito.
- `@textjs/react`: `<FocusPad>` e `<ViewportControl>` usano per le etichette a spaziatura fissa lo stack di font `--mono` della pagina, quando ne definisce uno, e ripiegano su Geist Mono come prima. Una pagina con etichette in arabo o ebraico può aggiungere a `--mono` i font del proprio sistema di scrittura.

<!-- s:965b020b1d -->
- textjs.org/ja: la ricerca ⌘K mostra i titoli della documentazione in giapponese e cerca corrispondenze con le query in giapponese. Prima elencava titoli in inglese sotto i titoli delle pagine in giapponese. I nomi inglesi continuano a trovare le pagine: `routing` trova ルーティング e `open the console` trova コンソールを開く.
- textjs.org: un esempio della documentazione in esecuzione nella tua console mostra di nuovo le modifiche nell’anteprima della pagina su textjs.org/ja, e per l’esempio Testo bidirezionale su textjs.org/docs/internationalization. La riga sopra un esempio nella console ora riporta «▼ Documentazione › Contatore» anziché «▼ Documentazione › Introduzione › Contatore».
- textjs.org: sui telefoni, il codice inline più lungo della riga va a capo anziché allargare la pagina. textjs.org/docs/internationalization era più larga di 92 px su uno schermo da 390 px.

<!-- s:125517f5e0 -->
- textjs.org/doom riproduce gli effetti sonori di Doom, con il panning stereo e l’attenuazione in base alla distanza di Doom. L’audio parte al primo clic o alla prima pressione di un tasto sulla pagina, si mette in pausa con il gioco e segue Sfx Volume nel menu Options → Sound Volume di Doom. Non c’è musica.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: l’avviso del focus («Fai clic sulla pagina per usare la tastiera») è una barra color ambra con testo nero in grassetto in ogni tema. Prima usava i colori del tema invertiti. Ogni volta che appare, lampeggia 4 volte in circa 6 secondi, poi resta color ambra. Non lampeggia quando è attiva la riduzione del movimento. Ogni ciclo di lampeggio registra fino a 8 frame aggiuntivi nella console.
- textjs.org: Doom è stato spostato su textjs.org/doom. textjs.org/playground/doom reindirizza lì.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: il pannello «Problemi» di Chrome non segnala più «Un elemento campo modulo deve avere un attributo id o name» su ogni pagina. Il `<textarea>` nascosto per la tastiera si chiama `textjs-input` e il `<select>` delle dimensioni della console di `ViewportControl` (anche in `sizeControl` di `FocusPad`) ha un `id` e il nome `textjs-console-size`. Il `<textarea>` per la tastiera esclude anche 1Password, LastPass, Bitwarden e Dashlane.
- textjs.org: l’intestazione della console su textjs.org/doom riporta «Text.js / doom» anziché «Text.js / playground / doom».
- textjs.org/doom: una finestra stretta non lascia più un «·» isolato dopo «Visualizza sorgente».
- textjs.org: in una finestra stretta, il selettore delle demo del Playground sfuma sul bordo quando ci sono altre demo da raggiungere scorrendo, anziché troncare l’ultima a metà parola.
- textjs.org/doom gira a 35 tic al secondo, come Doom. In un livello girava 3,8× più veloce su uno schermo a 60 Hz (131 tic al secondo) e 5,5× a 120 Hz (192), perché la pagina scambiava le letture aggiuntive dell’orologio che Doom effettua mentre disegna un livello per un’attesa attiva e spostava l’orologio di Doom avanti di un tic a ogni frame di animazione e callback del timer.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` disegna mezzi blocchi `▀` ovunque, come faceva `<Image>` nella versione 1.3.
- `@textjs/core/experimental`: `drawPixels` accetta `encoding: "rgba"` per uno sprite senza perdita con alfa graduale e più di 256 colori, e una funzione `fallback` che disegna le celle dove lo sprite non può essere mostrato.
- `@textjs/app`: curl, Wget, HTTPie e xh ricevono il primo frame di una pagina come testo ANSI truecolor anziché la pagina HTML, su `text dev`, `text start` e sugli adattatori `bun`, `vercel` e `cloudflare`. `text build` esegue il pre-rendering dei frame per le pagine statiche. `text start` e `bun` renderizzano su richiesta le pagine dinamiche e quelle renderizzate lato server, e rispondono ai percorsi sconosciuti con la pagina not-found dell’app e un `404`. I frame sono 80 × 24 per impostazione predefinita. Cambia le dimensioni o disattiva i frame con `ansi` in `text.config.ts` o `export const ansi` in una pagina. L’adattatore `static` serve a curl la pagina HTML. Vedi [curl e client terminale](https://textjs.org/docs/curl).
- `@textjs/app/ansi` esporta `wantsAnsi` e `ansiResponse` per i server che non usano `text start` o un adattatore, e `@textjs/react` esporta `frameToAnsi`.
- textjs.org: una versione giapponese in bozza su textjs.org/ja, a partire dalla documentazione di Introduzione, Installazione e Routing e dall’interfaccia del sito. I paragrafi non tradotti appaiono in inglese. Non è ancora indicizzata né proposta nel selettore della lingua.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` ora disegna uno sprite di pixel nelle console di Chromium e Firefox, con fino a 8 × 16 pixel per cella per la pixel art e 4 × 8 per le foto. Questo viola deliberatamente la promessa della [politica di supporto](https://textjs.org/docs/support-policy) secondo cui i frame hanno lo stesso aspetto tra versioni minori. Passa `renderMode="halfblock"` per mantenere i mezzi blocchi della versione 1.3. Safari, i terminali (incluso `text run`), l’output ANSI e di testo semplice e le pagine renderizzate lato server (`runtime = "server"`) continuano a disegnare mezzi blocchi.
- `@textjs/app`: gli script e i controlli di disponibilità che recuperano pagine con curl, Wget, HTTPie o xh ora ricevono testo ANSI. Per continuare a ricevere HTML, invia `Accept: text/html` o imposta `ansi: false` in `text.config.ts`.
- `@textjs/app`: i componenti server asincroni non vengono più eseguiti mentre `text build` esegue il pre-rendering della shell di una pagina. Mostrano il loro fallback `<Suspense>`, come prima, senza avviare le richieste di dati durante la build.
- `@textjs/app`: il riproduttore di frame per le pagine renderizzate lato server è più piccolo di 3 KB, 22,4 KB gzip anziché 25,4 KB per `examples/dashboard`. Non include più i metodi di disegno di `CellBuffer`, i bordi dei riquadri o il troncamento del testo.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: grafici e indicatori di caricamento mantengono la griglia su Windows 10. Il font della sua console è Consolas, che non ha blocchi da un ottavo ▁▂▃▅▆▇, quadranti, braille, ▶ o ✓, e i loro glifi di fallback facevano oltrepassare alle righe il bordo destro del frame. `CssConsoleDriver` ora misura, una volta sola, quali di questi glifi il font della console disegna con uno scarto superiore a un quinto di cella, e li disegna usando il glifo più vicino disponibile in Consolas: `_` `▄` `▌` `█` per gli ottavi, mezzi blocchi per quadranti e braille, `►` `◄` `√` `×` per frecce, spunte e croci. I font che li contengono nelle dimensioni corrette, come Cascadia Mono su Windows 11 e Menlo su macOS, disegnano gli originali. `measureText: false` disattiva questo comportamento.
- `@textjs/core`: niente più sottili linee verticali da 1 px tra sfondi adiacenti nei DevTools di Chrome ed Edge, come accanto ad «account» e «qty» su textjs.org/coffee. Chromium allinea ogni span `%c` ai pixel del dispositivo separatamente e poteva non assegnare a nessuno dei due il pixel in cui due span si incontravano. `CssConsoleDriver` ora estende lo sfondo di uno span di 1 px sotto un elemento opaco adiacente a destra (`padding-right:1px;margin-right:-1px`). I frame di Firefox e Safari non cambiano.
- `@textjs/core`: gli sprite `<Image>` in Chrome ed Edge seguono la stessa regola da 1 px del testo. Il testo a sinistra di uno sprite trasparente non disegna più una striscia di 1 px del proprio sfondo sul bordo sinistro dello sprite, e uno sprite aderisce al testo opaco alla sua destra, incluso il testo inverso. Uno sprite da solo nelle sue righe ora raggiunge il bordo destro del frame, come le righe di testo sopra e sotto.
- `@textjs/react`: `<ConsoleMirror>` disegna una foto accanto al testo come mezzi blocchi, come fa la console, anziché come immagine.

<!-- s:757b866128 -->
- `@textjs/react/experimental` esporta `<Pixels>` per framebuffer in tempo reale e `useKeyState` per i tasti tenuti premuti; `@textjs/core/experimental` esporta `drawPixels`. Queste API possono cambiare in una versione minore.
- textjs.org/playground/doom: gioca all’episodio shareware di Doom nella console DevTools.
- `@textjs/react`, `@textjs/app`: quando la pagina non ha il focus, l’ultima riga del frame della console riporta «Fai clic sulla pagina per usare la tastiera», così chi fa clic sull’app nella console sa perché i tasti hanno smesso di funzionare. Appare quando l’app ha un handler `useInput` o `usePaste` o una destinazione del focus, solo nella console del browser, anche sulle route renderizzate lato server. Le repliche inline e l’anteprima di VS Code non lo mostrano. Disattivalo con `focusHint: false` in `text.config.ts` o `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` restituisce se la pagina ha il focus. Per decidere tu quando l’app richiede la tastiera, imposta `focusHint: false` e renderizza `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` contrassegna una scorciatoia sempre attiva che da sola non mostra l’avviso.

<!-- s:c96685f5e0 -->
- `@textjs/core`: mentre uno sprite `<Pixels>` si anima, `ConsoleRenderer` raggruppa i fotogrammi chiave ogni 51 ms in Chromium, distanzia i frame di 33 ms in Safari e cancella l’output accodato in `CssConsoleDriver` a 4 MB (`SPRITE_MAX_BYTES`). Gli sprite statici e le app di solo testo mantengono la cadenza esistente e il limite di cancellazione di 300 frame.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` legge il testo confermato da un IME o da un tasto morto da una textarea o un input nascosto, una volta per conferma e mai durante la composizione. `engine.bindTextSink(element)` collega una textarea che renderizzi tu a un `InputEngine`. Entrambi restituiscono una funzione che rimuove i listener.
- `@textjs/app`: `POST /__textjs/input` accetta `{ type: "text", text }` per il testo di IME e tasti morti. `InputMessage` e `parseInputMessage` in `@textjs/app/frame-protocol` lo includono.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware e route handler ricevono il percorso canonico. `/docs/` e `/docs//intro` arrivano come `/docs` e `/docs/intro`, quindi un middleware che reindirizza per aggiungere una barra finale ora reindirizza all’infinito. Rimuovi quel reindirizzamento. Un segmento dinamico non può contenere una barra codificata: `/files/a%2Fb` restituisce `400`.
- `@textjs/app`: con un middleware, `--adapter cloudflare` invia ogni richiesta al worker, incluse le risorse con hash, e con un `basePath` invia anche le richieste esterne al percorso di base. Ogni richiesta che esegue il worker è un’invocazione Functions e conta nella quota di richieste Workers. Nel piano Workers Free, imposta il progetto Pages su fail closed (Settings → Runtime → Fail open / closed), altrimenti Pages serve i tuoi file senza middleware una volta esaurita la quota giornaliera.

<!-- s:cb257a7494 -->
- Gli IME cinesi, giapponesi e coreani e i tasti morti funzionano nelle console inline di textjs.org. Le console svuotavano la textarea durante la composizione, quindi l’app riceveva le lettere grezze o il carattere sbagliato.
- `<FocusPad>` mantiene il focus della tastiera sull’app dopo un clic. Prima perdeva subito il focus, quindi gli IME cinesi, giapponesi e coreani non potevano comporre testo.
- I tasti morti che non compongono (Windows e Linux senza un IME) raggiungono l’app con la textarea nascosta che ha il focus. Su US-International, `'` seguito da `e` produce `é` e `'` seguito da `t` produce `'t`. `InputEngine` bloccava il keydown che completa un tasto morto, quindi il browser non inseriva nulla. `DeadKeyTracker` in `@textjs/core` lascia passare quel keydown e anche l’anteprima di VS Code lo usa.
- L’anteprima di VS Code trasmette il testo di IME e tasti morti, che prima scartava, e non inoltra più all’app i tasti morti o le pressioni dei tasti durante la composizione IME. Con un server `text dev` di `@textjs/app` 1.1.0 o precedente, invia il testo come pressioni di tasti o come testo incollato.
- `@textjs/core`: `InputEngine.handleTextInput` ignora il testo mentre `shouldCapture` restituisce `false`, come già accadeva per l’input da tastiera e il testo incollato.
- `text dev` esegue il pre-bundling di `@textjs/app/live-stub` e `@textjs/app/live-player`. Un’app con una pagina `runtime = "server"` li trovava solo dopo il primo caricamento della pagina, quindi Vite li includeva di nuovo nel bundle durante il caricamento, causando errori 404 per i chunk obsoleti e un errore «Chiamata hook non valida» dovuto a due copie di React.
- Grafici e indicatori di caricamento rientrano nel frame su Windows. Consolas non ha blocchi ▁▂▃▅▆▇, quadranti, braille, ▶ o ✓, quindi Windows li disegnava con font di fallback larghi fino a 1,8 celle e le righe dei grafici oltrepassavano il bordo destro del frame. Lo stack di font della console ora è `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace` e Windows 11 disegna l’intero frame in Cascadia Mono. Anche `<ConsoleMirror>`, l’anteprima di VS Code e la vista dei frame dell’estensione DevTools mettono Cascadia Mono prima di Consolas.
- `@textjs/opencode`: con Node su Windows, il bridge trova un OpenCode installato con `npm i -g opencode-ai`. Node non può avviare per nome lo shim `opencode.cmd` di npm, quindi il bridge si comportava come se OpenCode non fosse installato. Ora cerca in `PATH` con ogni estensione di `PATHEXT` ed esegue gli shim `.cmd` tramite `cmd.exe`. Con Bun (`bunx`) funzionava già.
- `text build` funziona su Windows. Falliva per ogni template, con `Could not resolve entry module "virtual:textjs/api"` o senza messaggi di errore.
- `text build` stampa l’errore quando il pre-rendering delle shell della console o la build delle route renderizzate lato server fallisce. Prima terminava con codice 1 dopo la riga «Build non riuscita» di Vite, senza indicarne il motivo.
- `text dev` su Windows renderizza di nuovo le route renderizzate lato server quando modifichi un file e ricarica il browser quando una pagina cambia il proprio export `runtime`.
- `text dev` su Windows non esegue più `middleware.ts` per i file sorgente che Vite serve come moduli, come `/app/page.tsx`, quindi un reindirizzamento di autenticazione non interrompe più il client di sviluppo.
- `text run` e `text mcp` funzionano quando il percorso del progetto contiene un nome breve Windows 8.3, come `C:\Users\RUNNER~1`. Mostravano «Errore dell’applicazione» perché la CLI e l’app caricavano `@textjs/app` due volte.
- Una `dist/` compilata su Windows serve le sue pagine con pre-rendering su Linux e macOS. Il manifest delle route live memorizzava i percorsi con barre rovesciate.
- `text build` funziona quando l’opzione `vite` in `text.config.ts` imposta `build.rollupOptions.input`. L’input sostituiva i punti di ingresso dei bundle dell’API, delle route renderizzate lato server e degli adattatori, e la build falliva.
- `text dev` termina quando lo interrompi nei primi secondi dopo il caricamento di una pagina e `server.close()` si risolve. La chiusura di Vite mentre ottimizzava dipendenze appena scoperte non terminava mai (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Sicurezza

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 e precedenti consentivano a una richiesta di saltare `middleware.ts` scrivendo un percorso protetto in un altro modo, come `/ad%6din`, `/api//admin` o `/admin%2Fx`. Il middleware confrontava il percorso così come inviato, mentre pagine, route handler e file statici venivano cercati dopo averlo decodificato (due volte per i route handler). Il problema riguardava `text dev`, `text start` e le build `--adapter bun`, `vercel` e `cloudflare`. Le build statiche non possono usare middleware e non sono interessate. Aggiorna alla versione 1.2.0, poi ripeti la build e il deploy: `.vercel/output` per Vercel, `dist/` per Cloudflare Pages e l’intera `dist/` per Bun (riavvia il server). Elimina i vecchi deploy ancora raggiungibili ai propri URL o proteggili.
- Ogni host ora calcola un unico pathname canonico per richiesta e lo usa per il matcher, `request.nextUrl` e ogni ricerca. Decodifica le sequenze di escape percentuali e ricodifica il percorso come lo scrive `new URL()`, risolve i segmenti `.` e `..` e rimuove le barre ripetute e finali. I percorsi con `%2F`, `%5C` o una codifica percentuale non valida ricevono un `400`. `text dev`, `text start` e l’adattatore Bun servono i file statici solo con il loro nome esatto, quindi su macOS e Windows `/ADMIN/report.txt` non serve più `public/admin/report.txt`.
- Matcher, sorgenti di riscrittura, segmenti di route e `basePath` vengono confrontati nella stessa forma codificata dei percorsi delle richieste, quindi `matcher: "/café/:path*"` e `"/caf%c3%a9/:path*"` proteggono `/caf%C3%A9` e `"/ops%40corp/:path*"` protegge `/ops@corp`. Un middleware senza matcher non viene eseguito fuori da `basePath`. Un matcher con una barra finale, come `/admin/`, corrisponde a `/admin`, e una condizione `host` ignora un punto finale nel nome dell’host.
- Una sessione live per una route `runtime = "server"` non renderizza una pagina che il middleware ha riscritto verso un altro percorso o un’altra query, come una riscrittura da `/restricted` a `/login`, o a cui ha risposto con uno stato di errore come `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: la funzione del route handler riceve il percorso in un header della richiesta che solo le route generate impostano, quindi `/api/x/%252e%252e/admin` non raggiunge più `/api/admin` e nessuna variante di `/_textjs/*` esegue la funzione. Le route generate distinguono maiuscole e minuscole, quindi `/LEGACY/x` non attiva più una riscrittura per `/legacy/:path*` che il middleware non aveva mai controllato. Ogni percorso che potrebbe non essere canonico, inclusi caratteri grezzi come `{`, passa attraverso il middleware edge, ora incluso in ogni build Vercel, che riscrive la richiesta nel percorso canonico.
- `--adapter cloudflare`: i file statici vengono cercati con il percorso codificato, quindi `/x/%252e%252e/admin/report.txt` non serve più `/admin/report.txt`. Con un `basePath`, i file esterni non vengono più serviti senza il worker.
- `text dev` non serve file di `public/` sotto `/public/…` o `/@fs/…`, sorgenti riservati al server come `middleware.ts` e `text.config.ts` con maiuscole e minuscole diverse, sotto un percorso `/@fs/` codificato, come richieste di moduli senza estensione (`/text.config?import`) o attraverso una riscrittura della configurazione, né route handler fuori da `basePath`.

<!-- s:a0125c854e -->
- Text.js renderizza nelle console di Firefox e Safari. `CssConsoleDriver` rileva il browser verificando le funzionalità CSS. Dove gli span `%c` restano inline, scrive altezze di riga di 14 px senza margini, disattiva l’andata a capo automatica e usa una cortina `line-height: 100vh`.
- Il dimensionamento responsive lascia spazio alla colonna dei link al sorgente di Firefox. Safari mette Menlo al primo posto nello stack di font: le sue pagine non possono usare un SF Mono installato dall’utente, che Web Inspector può usare per disegnare.
- Passa `browser: "chromium" | "firefox" | "safari"` a `createConsoleRoot`, `ConsoleRenderer` o `CssConsoleDriver` per scegliere una console.
- Le shell con pre-rendering includono il CSS per entrambi i tipi di console.
- `<FocusPad>` mostra la scorciatoia della console per il browser del visitatore: ⌘⌥K o Ctrl+Shift+K in Firefox e ⌘⌥C in Safari con una nota per attivare «Mostra funzionalità per sviluppatori web».
- Un `<FocusPad>` con pre-rendering renderizza la scorciatoia di ogni browser. Imposta `data-browser` (`firefox` o `safari`) e `data-os` (`mac`) su `<html>` prima del primo disegno per mostrare solo quella del visitatore; senza questi attributi mostra la scorciatoia di Chrome per Windows e Linux fino all’idratazione.

<!-- s:74de7c87f7 -->
- ⌘⌥K e Ctrl+Shift+K (la scorciatoia della console di Firefox) passano al browser anziché raggiungere l’app.
- Il dimensionamento responsive apprende le barre degli strumenti del browser alte meno di 60 px (quelle di Safari e Firefox) mentre DevTools è chiuso, così una console ancorata in basso ottiene tutte le righe che può contenere. `<FocusPad>` usa l’altezza appresa per capire se DevTools è ancorato.
- `<FocusPad>` scrive le scorciatoie di Windows e Linux nello stato di clic come `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: il bridge stampa un codice di abbinamento all’avvio e textjs.org/opencode lo richiede alla prima connessione. Finché una pagina non invia il codice, il bridge risponde `428` e non inoltra nulla a OpenCode, anche per le origini consentite. Ogni codice vale per una sola esecuzione del bridge, il token restituito funziona solo dall’origine che ha effettuato l’abbinamento e dieci codici errati bloccano l’abbinamento fino al riavvio del bridge.
- `@textjs/opencode`: i deploy di anteprima Cloudflare Pages di textjs.org non sono più consentiti per impostazione predefinita. Passa `--allow-origin` per usarne uno.
- textjs.org/opencode rifiuta i bridge di `@textjs/opencode` 1.0.x. Esegui `bunx @textjs/opencode@latest proxy`.
- textjs.org invia una Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` e `Cross-Origin-Resource-Policy`. La pagina OpenCode si connette solo ai server su `127.0.0.1` o `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: esamina le differenze per file, sfoglia la cronologia dei prompt, configura le scorciatoie leader e gestisci gli account dei provider e i server MCP. La sandbox include un pannello terminale con script.
- OpenCode Lite: digita `/` per cercare comandi o `@` per allegare un file del progetto. Tab apre una directory nel menu dei file. Le sessioni connesse cercano nel progetto del server; la sandbox cerca nel suo repository di esempio.
- textjs.org/coffee: la demo terminal.shop segue le dimensioni della console come l’app SSH, con i suoi layout piccolo, medio e grande e «il tuo terminale è troppo piccolo» sotto 20 × 10. L’account aggiunge metodi di pagamento, un profilo con un nome modificabile e modifiche alla programmazione settimanale degli abbonamenti. Senza autenticazione, il carrello e le sezioni faq, informazioni e informazioni di debug dell’account si aprono senza accedere.

<!-- s:d106fb27b3 -->
Prestazioni

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` e `Text` passano al reconciler le prop della scena già ripulite anziché copiare gli oggetti delle prop al montaggio e all’aggiornamento.
- `@textjs/core`: `SceneNode.getTextModel()` salta le visite dell’albero inline sulle foglie `<Text>` con una sola stringa e riutilizza i buffer `Uint16Array` `runOf` azzerati in cache. `CssConsoleDriver` scansiona le celle BMP consecutive con lo stesso stile in un ciclo interno e `ConsoleRenderer` salta `countYogaNodes()` sui frame invariati.
- textjs.org: le route e le schede dell’assistente della console sono suddivise in chunk JS e CSS per route. Le foto del negozio sono ricodificate dagli originali in `photos/final` e le immagini secondarie dei prodotti si caricano al passaggio del puntatore o al cambio di diapositiva.

<!-- s:6909c337fb -->
- `<ViewportControl>` usa un `minWidth` in pixel anziché `20ch` ed elenca i font di fallback con metriche corrispondenti insieme a `<FocusPad>`, così il selettore delle dimensioni mantiene la larghezza quando si carica `Geist Mono`.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: il bridge di textjs.org/opencode come pacchetto autonomo senza dipendenze. Esegui `bunx @textjs/opencode proxy` (o `npx`) per avviarlo senza installare Vite, React e l’SDK MCP. `text proxy` continua a funzionare ed esegue lo stesso bridge.

<!-- s:884a8abcf6 -->
- Il pacchetto del framework e della CLI ora è `@textjs/app`, rinominato da `@textjs/next` affinché il nome non suggerisca un’integrazione ufficiale con Next.js. `@textjs/next` è deprecato a favore di `@textjs/app` e non riceve nuove versioni. Per passare al nuovo pacchetto, esegui `bun remove @textjs/next && bun add @textjs/app` e sostituisci `@textjs/next` con `@textjs/app` negli import, inclusi i sottopercorsi come `@textjs/app/link`. La CLI resta `text` e i template di create-text-app dipendono da `@textjs/app`.
- Il pulsante `[▼]` nella console e l’ispettore si chiamano Dev Overlay e il titolo dell’ispettore riporta `▼ Dev Overlay · Turbolog`. Text.js DevTools è solo il nome dell’estensione Chrome. `<TextDevOverlay>` e le sue prop restano invariati.
- I route handler che esportano `dynamic = "error"` falliscono con `TX031`. Text.js lo trattava come `"force-static"` senza verificare se l’handler legge la richiesta, che è ciò che il valore significa in Next.js. Usa `"force-static"`.

<!-- s:e21d3058df -->
- `text start` risponde a un `Host` bloccato con `TX028`, come `text dev`. Ogni server indica l’impostazione che legge: `vite.server.allowedHosts` per `text dev` e `server.allowedHosts` per `text start`.
- textjs.org: il capitolo Pubblicazione di Impara non indica più di aggiungere una riscrittura `vercel.json`. Su Vercel e Cloudflare Pages, `text build` scrive da sé il fallback `index.html`. L’esempio di riscrittura ora usa `_redirects` di Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` consente gli export `dynamic` e `revalidate` in `route.ts` e `valid-route-module` verifica lì i valori di `dynamic`.

<!-- s:9fc693fec9 -->
- textjs.org: un video di un capitolo di Impara in riproduzione si sposta in un mini player nell’angolo quando scorri oltre. Il pulsante Sottotitoli sotto ogni video attiva o disattiva i sottotitoli e ricorda la scelta.
- `<TextDevOverlay>` accetta le prop `pill`, `shortcut` e `shell`, così le app senza App Router possono montare l’ispettore con i propri tasti e controlli del tema.
- `<FocusPad>` accetta un `banner`, mostrato come prima riga del messaggio (per esempio il logotipo di un’app) e sopra l’avviso sui dispositivi touch.

<!-- s:45920d8903 -->
- textjs.org: il selettore del Playground elenca Dashboard, Streaming, Snake, OpenCode e Coffee (terminal.shop). Ogni demo ha il proprio URL: OpenCode è su `/opencode` e terminal.shop su `/coffee`, e i loro logotipi aprono il messaggio. Contatore e Modulo sono stati spostati fuori dal Playground; la documentazione continua a eseguirli entrambi come esempi live.
- `<FocusPad>` ha un nuovo layout. Ogni stato mostra una barra di avanzamento in tre parti, un titolo, un elemento grande e una riga di testo. Prima dell’apertura della console, l’elemento grande è la scorciatoia DevTools. In attesa di un clic, è un puntatore. Una volta attivo, mostra gli `hints` dell’app come tasti che si illuminano alla pressione, mentre i tasti senza suggerimento vengono riprodotti sotto. Le etichette dei passaggi, il badge separato «Live» e la riga «Guarda la console.» sono stati rimossi. Le righe appaiono in dissolvenza ai cambiamenti di stato, mai al primo disegno, e il movimento è disattivato con `prefers-reduced-motion`. Il testo secondario soddisfa il contrasto WCAG AA in entrambi gli aspetti e il selettore delle dimensioni della console mostra un anello di focus quando lo raggiungi con la tastiera.
- textjs.org: il Playground usa il nuovo layout di `<FocusPad>`. La demo corrente nel selettore ha la superficie dei tasti, il campo dei comandi OpenCode ha gli stessi angoli e la stessa dimensione del testo del campo URL, la nota terminal.shop occupa due righe anziché tre, «Visualizza sorgente» si trova sulla linea di base del controllo delle dimensioni e il testo discreto nel pannello soddisfa il contrasto AA.

<!-- s:01075dcc87 -->
- `text dev` serve i percorsi `proxy` tramite il proxy per ogni richiesta. `fetch()` invia `Accept: */*`, quindi il server di sviluppo rispondeva prima con l’HTML dell’app e il template opencode falliva alla prima esecuzione con «Token inatteso '<'».
- `text dev` non carica più una seconda copia di React quando la scansione delle dipendenze di Vite legge un file riservato al server. La scansione attivava il controllo degli import riservati al server, che stampava uno stack trace, poi «Chiamata hook non valida» nella console, e interrompeva Fast Refresh.
- `text dev` gestisce gli URL delle pagine con una stringa di query, come `/?demo`. Vite li trattava come la cartella del progetto e monitorava l’intero disco, quindi su Linux la pagina non si caricava mai.
- create-text-app: il pulsante di sviluppo non copre più il primo suggerimento dei tasti nella prima schermata di alcun template, il nome predefinito del progetto è `my-app` per corrispondere alla documentazione, i template superano i controlli della configurazione consigliata di `eslint-plugin-textjs` e il README della dashboard spiega la build `--adapter static`.
- `<FocusPad>` e `<ViewportControl>` impostano i bordi solo con proprietà estese. React mostrava l’avviso «Aggiornamento di una proprietà di stile durante il nuovo rendering (border)» in sviluppo ogni volta che un suggerimento dei tasti lampeggiava.
- Il testo che è l’ultimo elemento di una riga ora mantiene la propria posizione quando si accorcia. Dopo uno `<Spacer>`, restava dove lo aveva lasciato il testo più lungo e gli elementi fratelli ridotti per rientrare in una riga che traboccava restavano ridotti.
- `<FocusPad>` sostituisce i passaggi, il sottotitolo e le righe dei tasti quando cambiano `action` o `hints`, così il cambio di demo in un pannello non viene segnalato come uno spostamento del layout.
- `@textjs/react/testing` carica Yoga quando viene importato, così un test può creare uno stub di `fetch` prima del primo `render()`.

<!-- s:64f8dbac91 -->
La prima versione stabile. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Modifica incompatibile:** il pacchetto del framework e della CLI ora è `@textjs/next` (`textjs` è già occupato su npm). Aggiorna gli import da `textjs` a `@textjs/next`.
- Il bridge OpenCode è `bunx @textjs/app proxy` e funziona da qualsiasi directory.
- La console si adatta per impostazione predefinita al pannello DevTools ancorato (in basso, a sinistra o a destra, zoom della pagina, barra degli strumenti su più righe). DevTools non ancorato usa il fallback `120×36`. I pannelli hanno acquisito un controllo delle dimensioni.

<!-- s:dd18fee429 -->
- `useKeymap` con una schermata di aiuto `?` automatica, suggerimenti dei tasti e una palette dei comandi `Ctrl+K`.
- Componenti per i dati: `List` (virtualizzato), `Table`, `Tree`.
- Grafici: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, più `Gradient` e `Image`.
- Controlli: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` e notifiche toast.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hook per timer, animazione, misurazione, breakpoint, archiviazione e appunti.
- Testo da destra a sinistra. Text.js implementa l’algoritmo bidirezionale Unicode (UAX #9, Unicode 18.0) e supera tutti i 770.241 casi di `BidiTest.txt` e i 91.707 casi di `BidiCharacterTest.txt`. All’arabo viene applicata la sagomatura e `<Text dir>` isola uno span.
- Codici di errore `TX###` stabili. Gli errori del framework includono un codice e un link a `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` per renderizzare componenti come testo nei test.
- `@textjs/react/terminal` e `text run`, che renderizza un’app App Router in un vero terminale.
- `text mcp`, che serve un’app tramite il Model Context Protocol affinché gli agenti di programmazione possano navigarla, premere tasti e leggere frame senza un browser.
- L’estensione Text.js DevTools, un pannello accanto a «Console» con l’albero dei componenti, un ispettore dei frame e una sequenza temporale.
- `eslint-plugin-textjs` e un’estensione VS Code con anteprime live.
- `apps/terminal-shop`: il negozio terminal.shop nella console, con l’API reale (sandbox di sviluppo predefinita, produzione con doppio blocco).
- textjs.org: Impara, un corso di 10 capitoli che gira nella console. Pre-rendering durante la build con idratazione, font ospitati sul proprio server con metriche corrispondenti, route `.html` senza barra finale e nuove pagine di documentazione con anteprime live.

<!-- s:25c8658848 -->
- Eliminato il blocco di fase della limitazione DevTools dopo la cancellazione. Dopo un frame che cancella la console, il renderer attende 110 ms una sola volta affinché i frame successivi seguano il percorso immediato di DevTools. La latenza di visualizzazione p50 è passata da 63 ms a 10 ms.
- Disegno parziale per fasce danneggiate: vengono ridisegnate solo le fasce di righe interessate da una modifica.
- Hash per riga in cache, ID di stile interi e frame inattivi senza allocazioni.
- Nessun timer inattivo mentre la pagina è nascosta o senza focus.

<!-- s:2f477ecf74 -->
- Nessuno span fantasma vuoto del livello di disegno alle interruzioni di riga e nessuna cortina duplicata.
- La cortina occupa una riga dedicata, così il link al sorgente di DevTools (`VM12:1`) non manda mai a capo la riga 0.
- L’indicatore di caricamento predefinito rispetta esattamente le celle (Menlo non ha glifi braille). La variante `braille` è facoltativa.
- `text build` su Node non include più nel bundle le build di sviluppo di React.
- textjs.org: lo spostamento cumulativo del layout è 0 su ogni route. Playground e OpenCode condividono un unico layout del pannello.
- textjs.org: le barre laterali della documentazione e di Impara restano fissate in fondo alle pagine lunghe.
- textjs.org: le schede dei file, i blocchi di codice e le tabelle nel testo scorrono solo in orizzontale, così iOS Safari non intercetta mai gli scorrimenti verticali della pagina.
- textjs.org: `scrollbar-gutter: stable` si applica solo ai dispositivi con mouse. Su iOS Safari faceva saltare il primo scorrimento.
- textjs.org: l’ancoraggio dello scorrimento è disattivato. Su iOS Safari bloccava la sezione principale sotto l’intestazione fissa.

<!-- s:986367c89f -->
Frame senza sfarfallii e rendering lato server.

<!-- s:f92fe85dce -->
- I frame vengono accodati invece di eseguire `console.clear()` + `console.log()` per ogni frame. DevTools applica la cancellazione in modo sincrono ma disegna i nuovi messaggi con un intervallo minimo di 50 ms, quindi la cancellazione lasciava la console vuota nel 70,6% dei ridisegni di DevTools a 15 fps e nell’81,1% a 60 fps. Uno span iniziale a larghezza zero fa da cortina e nasconde i frame precedenti. La console viene cancellata solo al primo frame, dopo `invalidate()`, in inattività quando si sono accumulati 100 frame, oppure a 300.
- I frame emessi vengono distanziati di almeno 66 ms (circa 15 fps). I frame più rapidi riavviano l’intervallo di attesa di DevTools e vengono scartati: a 60 fps DevTools ha disegnato 67 dei 295 frame emessi.
- Playground e OpenCode sono pannelli del focus a schermo intero.

<!-- s:79bc055b31 -->
- CSS degli span con sole proprietà estese, che riduce le proprietà copiate da DevTools su ogni riga da circa 33 a circa 7. Colori esadecimali e sequenze vuote identificate solo dallo sfondo.
- Parsing incrementale di Markdown e righe `Markdown`, `Code` e `Diff` memorizzate.
- Prop degli elementi host elaborate in un solo passaggio, aggiornamenti selettivi delle prop e nessun ricalcolo del layout Yoga quando le dimensioni del testo non possono cambiare.
- Un frame in streaming è passato da 0,79 ms a 0,14 ms, un aggiornamento dello spinner da 0,90 ms a 0,056 ms. L’output è identico bit per bit.

<!-- s:52e989e27d -->
- Rendering lato server. Una pagina che esporta `runtime = "server"` esegue il rendering sul server, inclusi i componenti `async function`, e trasmette in streaming le differenze delle celle a livello di riga tramite server-sent events a un riproduttore di frame di circa 19 kB gzip.
- Pre-rendering parziale. `text build` incorpora il primo frame di ogni route statica nel relativo HTML, così la console disegna prima che venga caricato qualsiasi modulo.
- `middleware.ts`, configurazione dei segmenti di route (`dynamic`, `revalidate`) e `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: un ambiente di test che pilota il vero frontend di DevTools e misura ridisegni vuoti, frame scartati, ritardo di visualizzazione e uso della CPU di DevTools.

<!-- s:7932537f20 -->
- DevTools non trasforma più il testo `path:line`, `//host:port` e `data:` in link.
- Il bridge OpenCode trova il daemon gestito (porta effimera, autenticazione di base), invia l’header CSRF nelle scritture e segnala gli errori su una sola riga.

<!-- s:6dddbd2f6c -->
- L’input discreto (la pressione di un tasto, un incollaggio) produce un rendering sincrono nello stesso task invece di attendere il frame di animazione successivo.
- Una TUI OpenCode ridotta che corrisponde a quella reale.
- Una revisione completa di textjs.org per dispositivi mobili e layout responsive.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: un parser e un renderer di font FIGlet con 17 font inclusi, per `<FigletText>` e `<AsciiFont>`. L’output corrisponde a 273 riferimenti registrati dal binario `figlet` 2.2.5.
- `text proxy`: un bridge CORS locale per consentire a textjs.org di comunicare con il tuo server OpenCode.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: un client OpenCode connesso renderizzato in `console.log`, con una demo di ripiego quando nessun server è in esecuzione.
- Un template `opencode` per `create-text-app`.
- textjs.org: una nuova pagina iniziale, il pannello di supporto alla console dal vivo, Playground, la pagina OpenCode e la documentazione.
- Un workflow di deploy su GitHub Pages con generazione di route statiche.

<!-- s:a1b0bb2bf5 -->
Il primo traguardo.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` su array tipizzati piatti, layout Yoga WASM, misurazione del testo con `Intl.Segmenter` e driver di codifica run-length `%c`. Un `console.log` per ogni frame modificato e nessuno in inattività.
- `@textjs/react`: un reconciler React 19, componenti PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` e altri), utilità `className` in stile Tailwind a livello di cella, temi e il `FocusPad` nel DOM.
- `textjs`: App Router basato sul file system (`layout`, `page`, `loading`, `error`, `not-found`, segmenti dinamici, route handler), `text dev`, `text build`, `text start` e l’ispettore `[▼]` nella console.
- `create-text-app` con i template `starter` e `dashboard`.
