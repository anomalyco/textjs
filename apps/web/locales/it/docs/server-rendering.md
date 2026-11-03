<!-- s:5c794493de -->
Renderizza l’albero React di una route sul server e trasmetti i suoi frame in streaming alla console. Esegui il pre-rendering del primo frame di ogni route statica nel suo HTML.

<!-- s:f5f9690d9e -->
Due runtime

<!-- s:26b5b0c1e5 -->
Ogni pagina viene renderizzata in uno di due ambienti:

<!-- s:2b217df435 -->
| | Client (predefinito) | Server (`runtime = "server"`) |
| --- | --- | --- |
| L’albero React viene eseguito in | La scheda del browser | `text dev` / `text start` / l’adattatore `bun` (Bun o Node) |
| Il browser scarica | L’app completa: React, Yoga WASM, le tue route | Il riproduttore di frame, circa 21 kB gzip |
| Accesso ai dati | `fetch()` verso i route handler | Diretto: database, file, `node:*`, segreti |
| Componenti asincroni | Usa `use()` o gli effetti | I componenti `async function` sono supportati |
| Latenza dei tasti | Stesso task, sincrona | Un’andata e ritorno al server |
| Funziona su un hosting statico | Sì | No, richiede `text start` o `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Entrambi i runtime producono gli stessi frame. Il riproduttore di frame codifica le celle con lo stesso `CssConsoleDriver` e mantiene la stessa cadenza di circa 15 fps, quindi un frame renderizzato lato server corrisponde byte per byte alla chiamata `console.log` del client.

<!-- s:70a0b18bdd -->
Attivazione

<!-- s:660b2936b0 -->
Esporta `runtime` da una pagina:

<!-- s:567f4b3d2b -->
`runtime` viene letto per ogni pagina, come stringa statica esportata (un’annotazione di tipo, `as const` o una riesportazione vanno bene; un valore calcolato no). I layout, `loading.tsx`, `error.tsx` e `not-found.tsx` vengono renderizzati dove viene renderizzata la loro pagina: un layout condiviso da pagine client e server viene eseguito in entrambi gli ambienti e inviato al browser, mentre i layout e i boundary di un segmento che contiene solo pagine server restano sul server. Gli hook, il focus, `useInput`, `<Link>` e `useRouter()` si comportano come sul client.

<!-- s:43c4fa1dac -->
Quando usare ciascun runtime

<!-- s:ac38ce3c55 -->
Usa il runtime **client** (quello predefinito) per:

<!-- s:ced9e65891 -->
- Interfacce con molta digitazione in cui ogni pressione di un tasto deve essere disegnata nello stesso task, come editor e filtri.
- App di cui fai il deploy su un hosting statico o una CDN.
- Strumenti che funzionano offline.

<!-- s:54292284aa -->
Usa il runtime **server** per:

<!-- s:bb8a20e6e2 -->
- Dashboard e viste di amministrazione che leggono database, file, code o API private. Le credenziali restano sul server.
- Route con dipendenze pesanti (SDK, parser, tabelle di sintassi) che non vuoi nel bundle del browser.
- Pagine che devono caricarsi rapidamente su reti lente. Il browser scarica il riproduttore da 21 kB (gzip) anziché l’app completa.

<!-- s:920f4ad7e8 -->
Puoi combinare runtime nella stessa app. La navigazione tra runtime carica l’URL di destinazione come nuovo documento. Il bundle del browser sostituisce ogni pagina server con uno stub, quindi i moduli server e tutto ciò che importano non vengono mai inviati al client.

<!-- s:2de98cc507 -->
Assegna ai moduli riservati al server il nome `*.server.ts`. La build fallisce se il codice inviato al browser (una pagina client o un layout usato da una pagina client) importa un modulo `*.server.*` o un modulo integrato `node:*`, indicando il modulo che esegue l’importazione.

<!-- s:1c109f371d -->
Il [middleware](/docs/middleware) protegge le route server come protegge i documenti: viene eseguito per la route di destinazione prima che si apra una sessione, prima di ogni navigazione nella sessione (`router.push`, Indietro e Avanti) e di nuovo ogni volta che cambiano i cookie della sessione o `Authorization`. Quando dovrebbe reindirizzare, rifiutare o riscrivere, il browser carica invece l’URL come documento e il middleware risponde a quella richiesta.

<!-- s:44ec23073a -->
Componenti server asincroni

<!-- s:491e80d70d -->
Sul server, ogni componente `async function` sospende il rendering fino al più vicino `<Suspense>` o `loading.tsx` finché la sua promise non si risolve:

<!-- s:155b6ae10f -->
Ogni promise viene memorizzata nella cache per sessione, con una chiave basata sul componente e sulle prop, così un nuovo tentativo di rendering riutilizza la richiesta già in corso. La cache viene svuotata quando cambia la route e quando viene chiamato `router.refresh()`. Per ripetere l’accesso ai dati dopo un input, chiama `router.refresh()`:

<!-- s:abfa753a7c -->
Le prop passate ai componenti asincroni dovrebbero essere serializzabili: stringhe, numeri, oggetti semplici, array, `Date`, `URL`, `Map`, `Set` ed elementi. Le prop di tipo funzione non fanno parte della chiave (passa dati, non callback). Ogni sessione memorizza nella cache al massimo 256 promise. Puoi anche avvolgere manualmente un componente con `serverComponent(fn)` da `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Gli hook (`useState`, `useInput`, …) non funzionano all’interno di un componente `async function`. Per gestire l’interazione, renderizza un componente normale intorno a esso o al suo interno.

<!-- s:5ae438610c -->
Funzionamento

<!-- s:ec3e56dbc6 -->
- **Una sessione per scheda.** Ogni caricamento di pagina apre una propria sessione: una radice React, una cronologia del router in memoria e un buffer di celle sul server. Gli ID di sessione sono valori casuali a 192 bit che il browser conserva solo in memoria.
- **Delta delle celle.** Il server invia solo le righe il cui hash è cambiato rispetto all’ultimo frame ricevuto da quella connessione. Ogni riga viene inviata come sequenze di testo riferite a una tabella di stili che accetta solo aggiunte, e grafemi larghi, gruppi di emoji e colori traslucidi vengono preservati esattamente.
- **Backpressure.** I frame sono distanziati di almeno 66 ms e ciascuno viene confrontato con l’ultimo contenuto accettato dal socket. Quando una connessione lenta smette di smaltire i dati, gli stati intermedi vengono saltati e il frame successivo passa direttamente a quello più recente.
- **Riconnessioni.** Se lo stream si interrompe, il riproduttore si riconnette con il proprio ID di sessione nell’header `x-textjs-live` (mai nell’URL) e riprende la stessa sessione, con lo stato intatto, da un nuovo keyframe. Gli aggiornamenti della barra degli indirizzi persi vengono riprodotti. Una sessione senza connessione interrompe il rendering e viene smontata dopo 30 secondi; se il server l’ha dimenticata, il riproduttore ne apre una nuova.
- **Cronologia.** Indietro e Avanti spostano entrambe le cronologie dello stesso numero di voci, e `router.back()` sul server sposta anche la cronologia del browser.
- **Sicurezza.** Entrambi gli endpoint rifiutano le richieste tra siti (`Sec-Fetch-Site` e `Origin`; `X-Forwarded-Host` conta solo con `server.trustProxy`). Le richieste POST di input richiedono un corpo JSON e l’header `x-textjs-live`. Ogni evento viene validato rispetto a uno schema fisso e le destinazioni di navigazione devono essere percorsi sulla tua origine. Solo le pagine nel tuo manifest `app/` possono essere renderizzate. Le sessioni sono legate ai cookie con cui sono state aperte.
- **Limiti.** Al massimo 64 eventi per POST e circa 240 al secondo per sessione (`429` oltre il limite), un timeout del corpo di 5 secondi, 32 sessioni per indirizzo client e `maxSessions` per processo (la sessione disconnessa da più tempo viene rimossa per prima).

<!-- s:981308ad14 -->
Pre-rendering parziale

<!-- s:294fed5642 -->
`text build` renderizza ogni route statica una volta, alle dimensioni `viewport` configurate, e inserisce quel primo frame nell’HTML della route come piccolo `<script>` classico inline. La console disegna prima che venga caricato qualsiasi modulo:

<!-- s:7eb15c9cc8 -->
1. **La shell statica.** Tutto ciò che viene renderizzato in modo sincrono. Ogni boundary `<Suspense>` ancora in attesa mostra il proprio fallback, inclusi i componenti server asincroni (che non vengono eseguiti durante il rendering della shell), `use()` e i moduli lazy. `fetch()` non si risolve mai durante il rendering della shell, quindi anche i dati caricati negli effetti restano nello stato di caricamento.
2. **Le parti dinamiche.** All’avvio di JavaScript, il renderer client o il riproduttore di frame trasmette in streaming il frame reale. Questo viene accodato sotto la shell e la cortina del frame in fase di idratazione sposta la shell fuori dalla vista nello stesso disegno di DevTools. La shell registra quando ha disegnato, così il primo frame in fase di idratazione attende che termini la finestra di DevTools successiva alla pulizia anziché incorrere nel suo percorso lento.

<!-- s:94c6827f2c -->
Durante il caricamento, solo la shell pulisce la console. Il renderer in fase di idratazione si avvia in modalità di accodamento (`initialClear: false`), quindi nulla lampeggia e la shell disegna solo sul percorso per cui è stata renderizzata. Le route dinamiche (`[id]`, `force-dynamic`) non renderizzano alcuna shell.

<!-- s:1eef464bae -->
Disattivalo con `ppr: false` in `text.config.ts`. Il pre-rendering esegue i tuoi componenti durante la build, quindi evita le variabili globali riservate al browser nel codice al livello principale dei moduli. Una route che genera un’eccezione, chiama `redirect()` / `notFound()` o esegue una navigazione durante il pre-rendering non riceve alcuna shell (una schermata di errore non viene mai incorporata nell’HTML), e la build ti indica il motivo.

<!-- s:c50a022df3 -->
La shell viene renderizzata a `viewport.width × viewport.height` (valore predefinito `120 × 36`) perché la build non può conoscere le dimensioni della console del visitatore; il frame in fase di idratazione si ridimensiona poi in base alla console reale. La shell è uno `<script>` inline: con una Content Security Policy che vieta gli script inline, autorizzalo tramite hash oppure imposta `ppr: false`.

<!-- s:ff96d35008 -->
Deploy

<!-- s:e8a05a5448 -->
`text build` scrive i seguenti file:

<!-- s:8e75669ec0 -->
| File | Scopo |
| --- | --- |
| `index.html`, `<route>/index.html` | Route client con le rispettive shell. Funziona su qualsiasi hosting statico. |
| `assets/player-[hash].js` | Il riproduttore di frame. |
| `.text/server/live.mjs` | Le route server, l’App Router e il renderer della console. |
| `.text/pages/…`, `.text/live.html` | Documenti delle route server. |
| `.text/ansi/…` | Primi frame per [curl e altri client da terminale](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` e l’[adattatore `bun`](/docs/deploying#bun) li servono tutti. Le route server richiedono un processo di lunga durata: gli adattatori `static`, `vercel` e `cloudflare` fanno fallire la build (`TX030`).
