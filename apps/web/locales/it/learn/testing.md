<!-- s:329a4263b5 -->
`@textjs/app/testing` esegue il rendering della tua app fuori schermo, preme i tasti e restituisce il frame come testo semplice. I test vengono eseguiti senza browser o DevTools.

<!-- s:22ea22bed4 -->
Il tuo primo test

<!-- s:79e830f1ed -->
La pagina richiede `/api/deployments`, che non ha un server durante l’esecuzione di `bun test`, quindi `beforeEach` sostituisce `fetch` con uno stub che restituisce gli stessi dati. `render` usa per impostazione predefinita una griglia di 80×24. `lastFrame()` restituisce l’intero frame come testo, `lines()` lo restituisce riga per riga e `cell(x, y)` restituisce il carattere e i colori di una singola cella.

<!-- s:e8fdbe8cac -->
Premere i tasti

<!-- s:8db83c740c -->
`press` accetta le stesse stringhe dei tasti di `useKeymap`. Ogni chiamata viene eseguita all’interno di `act()` ed elabora i frame risultanti, così l’asserzione successiva vede l’aggiornamento.

<!-- s:7c6ee6548f -->
La tabella disegna `›` davanti alla riga evidenziata, quindi il test ↓ trova quella riga e ne verifica il commit. Le cifre ordinano per colonna e la quarta colonna è Build.

<!-- s:5350d592a4 -->
Eseguire i test

<!-- s:88993d5c83 -->
Funziona con qualsiasi runner che supporti i test `async`: Bun, Vitest o Jest. Nella console, premi `Enter` per eseguire la suite e `f` per far fallire un test e vedere come appare un errore.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:b458212c22 -->
`toAnsi()` restituisce il frame in formato ANSI truecolor, creando snapshot che rilevano anche le regressioni dei colori:
