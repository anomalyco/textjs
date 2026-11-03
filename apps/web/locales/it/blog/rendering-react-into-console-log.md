<!-- s:16c98cd381 -->
Text.js renderizza app React nella console di Chrome DevTools. A parte un campo di input nascosto, la pagina non ha un’interfaccia utente. Ogni frame dell’app è una singola chiamata a `console.log`.

<!-- s:fe9cd991d4 -->
La console come display

<!-- s:5ae20a07fc -->
`console.log` accetta una stringa di formato. Ogni `%c` applica il CSS dell’argomento successivo al testo che lo segue, fino al prossimo `%c`:

<!-- s:2822a0243c -->
Questi stili possono impostare colori, sfondi, grassetto, corsivo e sottolineatura, e il font della console è a spaziatura fissa (Menlo su macOS). Con un font a spaziatura fissa e colori che possono cambiare per ogni sequenza di caratteri, la console funziona come una griglia di celle di caratteri con stili. Su questa griglia si possono disegnare bordi, pannelli, campi di input e grafici.

<!-- s:585742694b -->
Un frame è una griglia di celle

<!-- s:04a12244bc -->
Il renderer conserva ogni frame in un `CellBuffer`. I caratteri risiedono in un array tipizzato, i colori di primo piano e di sfondo in altri due, e gli attributi come grassetto e sottolineatura in un quarto. Gli array vengono allocati una sola volta per una data dimensione e riutilizzati per ogni frame.

<!-- s:2ff86351b3 -->
Per scrivere un frame nella console, il driver percorre ogni riga e raggruppa in sequenze le celle adiacenti che condividono uno stile. Ogni sequenza diventa uno span `%c` e le righe vengono unite con `\n`. La nostra dashboard di test da 100×32, 3200 celle, viene codificata in circa 200 span.

<!-- s:48a9b4f008 -->
Una chiamata per frame

<!-- s:aa2cafe395 -->
Scrivere ogni riga come messaggio separato non funziona. Ogni messaggio ha un proprio bordo e un link al codice sorgente in DevTools, e DevTools comprime i messaggi consecutivi identici dietro un contatore di ripetizioni, quindi due righe identiche di una tabella si fonderebbero in una sola. Un frame scritto come singolo messaggio rimane integro.

<!-- s:ea38228d16 -->
Prima occorre applicare l’escape a due elementi del testo. Un `%` letterale viene scritto come `%%`, così un testo come `100%` non può consumare un argomento di stile. DevTools trasforma anche gli URL in link e li ridisegna con i propri colori, quindi a `://` e `www.` viene aggiunto un word joiner (U+2060), che non occupa larghezza:

<!-- s:ec8783435a -->
I frame inattivi non scrivono nulla nella console

<!-- s:8b7f1f9d06 -->
Per ogni riga del buffer viene calcolato un hash. Se nessun hash è cambiato dall’ultimo frame, il driver termina prima di costruire una stringa e non tocca la console. Un’app in attesa di input non effettua chiamate.

<!-- s:43c3523265 -->
Quando una riga è cambiata, il driver svuota la console e scrive il nuovo frame:

<!-- s:5b584e930a -->
Solo le righe il cui hash è cambiato vengono ricodificate. Le altre riutilizzano gli span del frame precedente.

<!-- s:99a3c4d459 -->
Input

<!-- s:e95aae4719 -->
La console non riceve le pressioni dei tasti, quindi le raccoglie la pagina. Un `<textarea>` nascosto riceve pressioni dei tasti, operazioni di incolla e composizione IME e le trasforma in eventi di tastiera per l’app. Un clic sulla pagina gli assegna il focus.

<!-- s:88cae4fc43 -->
Prossimi passi

<!-- s:cb5f6bd294 -->
I prototipi `@textjs/core` 0.0.x su npm contengono tutto in un unico pacchetto. Text.js 0.1 sposta il renderer descritto qui in `@textjs/core`, il reconciler di React in `@textjs/react` e aggiunge un App Router.
