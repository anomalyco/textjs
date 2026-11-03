<!-- s:f0ba49aa8c -->
Text.js 0.4 ha aggiunto un secondo ambiente per il rendering di una pagina. Per impostazione predefinita, l’albero React di una pagina viene eseguito nella scheda del browser. Una pagina che esporta `runtime = "server"` viene invece eseguita sul server, e il browser ne riceve i frame.

<!-- s:1a12ccffbb -->
`Load` è un componente `async function`. Sul server sospende l’esecuzione fino al più vicino `<Suspense>` o `loading.tsx` finché la sua promise non si risolve, e può leggere direttamente file, database e moduli `node:*`. I componenti asincroni caricano dati e non possono usare gli hook. I componenti regolari che li circondano mantengono gli hook, il focus, `useInput`, `<Link>` e `useRouter()`, che si comportano allo stesso modo in entrambi i runtime.

<!-- s:f6c454b214 -->
Cosa scarica il browser

<!-- s:6764f4bb25 -->
Una pagina renderizzata lato server non distribuisce React, Yoga o le tue route. Il browser carica un riproduttore di frame di circa 21 kB gzip, che contiene un `CellBuffer` e lo stesso `CssConsoleDriver` usato dal renderer client. Scandisce i frame agli stessi 15 fps, quindi un frame renderizzato lato server produce la stessa chiamata a `console.log` che produrrebbe il client.

<!-- s:c1c4090983 -->
Il protocollo

<!-- s:20c7e299b3 -->
Ogni scheda apre una propria sessione sul server: una radice React, una cronologia del router in memoria e un buffer di celle. Un endpoint gestisce entrambe le direzioni:

<!-- s:0cce1c98cc -->
Il server invia solo le righe il cui hash è cambiato dall’ultimo frame ricevuto da quella connessione. Ogni riga viene inviata come sequenze di testo riferite a una tabella di stili che accetta solo aggiunte. Grafemi larghi, gruppi di emoji e colori traslucidi arrivano intatti.

<!-- s:bff22f361e -->
I frame distano almeno 66 ms l’uno dall’altro, e ciascuno viene confrontato con l’ultimo stato accettato dal socket. Quando una connessione lenta smette di smaltire i dati, gli stati intermedi vengono saltati e il frame successivo passa direttamente allo stato più recente.

<!-- s:f0809ea8c7 -->
Se il flusso si interrompe, il riproduttore si riconnette con l’ID della sessione nell’header `x-textjs-live` e riprende la stessa sessione da un nuovo keyframe, mantenendone intatto lo stato. Gli ID di sessione sono valori casuali a 192 bit conservati in memoria, mai nell’URL. Una sessione senza connessione interrompe il rendering e viene smontata dopo 30 secondi.

<!-- s:2c75bd5d29 -->
Entrambi gli endpoint rifiutano le richieste cross-site, e ogni evento di input viene convalidato rispetto a uno schema fisso. Una sessione accetta al massimo 64 eventi per POST e circa 240 al secondo.

<!-- s:a36b73dab0 -->
Componenti asincroni e dati

<!-- s:2620366315 -->
La promise di ogni componente asincrono viene memorizzata nella cache della sessione, usando come chiave il componente e le sue prop, così un nuovo tentativo di rendering riutilizza la richiesta già in corso. La cache viene svuotata quando cambia la route e quando chiami `router.refresh()`:

<!-- s:64ce138e40 -->
I moduli riservati al server hanno nomi nel formato `*.server.ts`. La build fallisce se il codice distribuito al browser ne importa uno, oppure importa un modulo integrato `node:*`, e indica il modulo che esegue l’importazione.

<!-- s:981308ad14 -->
Pre-rendering parziale

<!-- s:9142a7d770 -->
Il pre-rendering parziale funziona senza un server. `text build` ora esegue il rendering di ogni route statica una volta e ne incorpora il primo frame nell’HTML della route come un piccolo `<script>` classico, così la console disegna prima che venga caricato qualsiasi modulo.

<!-- s:d51b081ec7 -->
La shell comprende tutto ciò che viene renderizzato in modo sincrono. Un confine `<Suspense>` ancora in attesa mostra il proprio fallback, componenti asincroni inclusi, e `fetch()` non si risolve mai durante il rendering della shell.

<!-- s:33ba4145a3 -->
All’avvio di JavaScript, il renderer client o il riproduttore di frame trasmette il frame effettivo. Poiché la versione 0.4 accoda anche i frame invece di cancellarli, il renderer che esegue l’idratazione parte con `initialClear: false` e scrive sotto la shell, e la sua tendina sposta la shell fuori dalla vista nello stesso ridisegno di DevTools. La console viene cancellata esattamente una volta, dalla shell.

<!-- s:f6986897ee -->
La shell viene renderizzata alle dimensioni configurate in `viewport`, `120 × 36` per impostazione predefinita, perché la build non può conoscere le dimensioni della console del visitatore. Con `viewport.responsive` attivo, il primo frame live si adatta alle dimensioni della console ancorata. Le route dinamiche non renderizzano alcuna shell, e `ppr: false` in `text.config.ts` disattiva il pre-rendering.

<!-- s:c61865edfd -->
Scegliere un runtime

<!-- s:aa5baec7ef -->
Il runtime client resta quello predefinito. Le pressioni dei tasti vengono disegnate nello stesso task, e puoi fare il deploy dell’app su qualsiasi hosting statico. Il runtime server è adatto a dashboard e viste di amministrazione che leggono dati privati, e alle route le cui dipendenze non vuoi includere nel bundle del browser. Un’app può combinare entrambi, e la navigazione tra i due carica l’URL di destinazione come nuovo documento.

<!-- s:68f8c75df7 -->
Il riferimento completo è in [Rendering lato server](/docs/server-rendering).
