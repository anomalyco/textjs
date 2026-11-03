<!-- s:263d7e4a86 -->
L’estensione Text.js per DevTools aggiunge un pannello **Text.js** accanto a «Console». Ispeziona l’app che esegue il rendering nella console.

<!-- s:becd3b25ff -->
- **Componenti:** l’albero React di ogni radice della console, con prop, hook, chiavi e i nodi di scena `tx-box` / `tx-text` sottostanti, disposti in celle.
- **Frame:** il frame corrente come griglia di celle. Passa il puntatore su una cella per vedere quale componente l’ha disegnata. Fai clic per selezionare il nodo. Il nodo viene evidenziato nella console in tempo reale.
- **Sequenza temporale:** tempi di React, layout, disegno e codifica per frame, frame saltati ed emessi a confronto, cadenza dei frame e span `%c`.
- **Controlli:** pausa e ripresa dell’output, attivazione del wireframe del layout, dimensioni della griglia fisse o adattive, copia del frame come testo.

<!-- s:98304b8243 -->
Installazione

<!-- s:2452819f12 -->
L’estensione viene compilata da `packages/devtools-extension` e caricata come estensione non pacchettizzata:

<!-- s:3754c750b3 -->
1. Apri `chrome://extensions` e attiva **«Modalità sviluppatore»**.
2. Fai clic su **«Carica estensione non pacchettizzata»** e scegli `packages/devtools-extension/dist`.
3. Ricarica la tua app e apri DevTools. Il pannello **Text.js** appare quando la pagina crea una radice della console.

<!-- s:e0c59fa53a -->
La compilazione genera anche `release/textjs-devtools-<version>.zip`, pronto per il Chrome Web Store.

<!-- s:364bc3ef6f -->
Componenti

<!-- s:e1204a3559 -->
Seleziona un componente per vedere le sue prop, i suoi hook nell’ordine di chiamata (`State`, `Ref`, `Memo`, `Effect` e così via, con i valori correnti) e il nodo di scena che renderizza, con posizione, dimensioni e rientri del box in celle. Passando il puntatore su una riga, il nodo viene evidenziato nella console. **Nodi host** mostra o nasconde gli elementi `tx-box` e `tx-text` tra i componenti.

<!-- s:77b62adc9c -->
L’albero si aggiorna dopo i commit mentre il pannello è aperto. I valori sono riepiloghi da visualizzare, non oggetti aggiornati in tempo reale.

<!-- s:a0d819048c -->
Frame

<!-- s:2cceea6000 -->
L’ispettore dei frame disegna il buffer di celle del renderer: ogni glifo, colore di primo piano, sfondo e attributo. Passando il puntatore su una cella, vengono mostrati il carattere e i colori, il nodo di scena che la ricopre nell’ordine di disegno (rispettando `overflow`, gli offset di scorrimento e `zIndex`) e i componenti che hanno renderizzato quel nodo. Un clic seleziona il nodo in **Componenti** e lo evidenzia nella console in tempo reale con il livello di evidenziazione del renderer stesso.

<!-- s:57a8990372 -->
Sequenza temporale

<!-- s:2187cf7a17 -->
Ogni barra corrisponde a un frame del renderer:

<!-- s:f53def4922 -->
| Fase | Misure |
| --- | --- |
| React | Lavoro sincrono di React completato all’inizio del frame |
| Layout | Layout Yoga |
| Disegno | Rasterizzazione della scena nel buffer di celle |
| Codifica | Creazione della stringa di formato `%c` e chiamata a `console.log()` |

<!-- s:9b988f3cfb -->
I frame saltati appaiono sbiaditi: nulla è cambiato, quindi nulla è stato scritto nella console. Il grafico della cadenza mostra l’intervallo tra i frame emessi rispetto all’intervallo minimo di 66 ms.

<!-- s:8abccb04ec -->
I tempi si fermano a `console.log()`. La formattazione e il disegno del messaggio avvengono all’interno di DevTools e non sono osservabili dalla pagina, quindi la sequenza temporale non li mostra. I rendering concorrenti che eseguono il commit tra un frame e l’altro vengono contati come commit, senza misurarne la durata.

<!-- s:5ae438610c -->
Funzionamento

<!-- s:1dda342130 -->
Come React DevTools, l’estensione installa un hook globale prima che la pagina venga eseguita:

<!-- s:5a865fb9ae -->
Ogni radice della console si registra nell’hook alla creazione. Senza l’estensione, l’hook non esiste e una radice ne verifica la presenza una sola volta, senza eseguire lavoro per ogni frame. Con l’estensione installata ma il pannello chiuso, ogni frame costa una lettura di proprietà. Alberi e frame vengono calcolati solo quando il pannello li richiede.

<!-- s:843fc9a8ad -->
I messaggi seguono il percorso pagina → script di contenuto → service worker → pannello. Gli script di contenuto vengono eseguiti su ogni pagina, così l’hook esiste prima dell’avvio della tua app. Questo è l’unico accesso richiesto dall’estensione. Non carica codice remoto e non invia nulla al di fuori del computer.

<!-- s:e425f181df -->
Privacy

<!-- s:f2cd52a110 -->
L’estensione non raccoglie dati. Non effettua richieste di rete, non memorizza nulla e non usa strumenti di analisi. Gli alberi dei componenti, i frame e i tempi viaggiano solo tra la pagina e il pannello DevTools nello stesso browser e vengono eliminati quando chiudi DevTools. **Copia frame** scrive il testo del frame negli appunti quando fai clic.

<!-- s:639d5ea4c0 -->
Limitazioni

<!-- s:153a772b79 -->
- Chrome e browser basati su Chromium, versione 111 o successiva.
- Le app avviate prima dell’installazione dell’estensione richiedono una ricarica.
- Viene ispezionato solo il frame principale di una scheda.
- I tempi provengono da `performance.now()`, la cui precisione viene ridotta dai browser a circa 0,1 ms.
