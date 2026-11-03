<!-- s:710c25737e -->
In un framework DOM, i componenti diventano nodi DOM che il browser dispone e disegna nella pagina. In Text.js, i componenti diventano celle e ogni frame di celle modificato diventa una chiamata a `console.log` in DevTools. La chiamiamo architettura invertita.

<!-- s:d00a01bf6f -->
La pipeline

<!-- s:12c6e8f741 -->
Ogni fase esiste perché la console è uno schermo insolito. È a spaziatura fissa e organizzata per righe, usa `%c` per gli stili e DevTools decide quando ridisegnarla.

<!-- s:db7daa7cf2 -->
Reconciler

<!-- s:f3cdc101e1 -->
`@textjs/react` è un reconciler React 19 (`react-reconciler@0.34.0`) con due elementi host, `tx-box` e `tx-text`, più istanze di testo per i figli di tipo stringa. Tutto ciò che importi, da `<Box>` a `<Markdown>`, si basa su questi elementi. I commit sono pianificati su `requestAnimationFrame` e la pressione di un tasto o un’operazione di incolla esegue il rendering sincrono nello stesso task.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, compilato in WebAssembly, dispone l’albero con `pointScaleFactor = 1`, così ogni box occupa celle intere. Il testo viene misurato con `Intl.Segmenter` e le tabelle di larghezza dei caratteri dell’Asia orientale, quindi `你好` occupa quattro celle e `🚀` ne occupa due. Se una modifica non può cambiare le dimensioni di un nodo di testo, Yoga non viene interrogato di nuovo.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Il frame è una griglia di array tipizzati allocati una sola volta: i caratteri in un `Uint32Array`, i colori di primo piano e di sfondo nel formato compatto `0xRRGGBBAA`, gli attributi come maschera di bit `Uint16Array`. Il disegno scrive in questi array e tiene traccia delle righe toccate.

<!-- s:2a9b8dd7b1 -->
Il filtro

<!-- s:1cdfa61881 -->
Ogni riga ha un hash FNV-1a a 32 bit memorizzato nella cache. L’hash viene ricalcolato solo per le righe scritte dall’ultimo frame. Se nessuna riga è cambiata, il driver termina prima di costruire una stringa e non effettua chiamate alla console. Un indicatore di caricamento in una scheda nascosta non costa nulla perché non avanza.

<!-- s:a36177ad5b -->
Codifica run-length

<!-- s:c372fac68d -->
Le righe modificate vengono analizzate di nuovo per ricavare sequenze con lo stesso stile e ogni sequenza diventa uno span `%c`. Le sequenze continuano oltre le interruzioni di riga. Le stringhe CSS sono memorizzate in un pool e associate a identificatori di stile interi, quindi il percorso critico non costruisce mai due volte la stessa stringa. Una dashboard di 100×32 contiene 3200 celle e 149 span.

<!-- s:922d9e42bd -->
La stringa di formato protegge anche da due comportamenti di DevTools. Un `%` letterale viene scritto come `%%`. Un word joiner viene inserito dopo `://`, all’interno di `www.` e in `path:line`, così DevTools non trasforma il testo in un link e non lo ridisegna con i propri colori.

<!-- s:f55ed8e2b0 -->
Una chiamata

<!-- s:b57bb25475 -->
Ogni frame modificato è una singola chiamata:

<!-- s:e3e37e3616 -->
I frame vengono accodati, cadenzati sul limitatore di DevTools da 50 ms e sostituiti all’interno di un singolo ridisegno. [Turbolog: eliminare il lampeggiamento](/blog/turbolog-eliminating-the-flash) tratta questa parte.

<!-- s:99a3c4d459 -->
Input

<!-- s:e569f67f37 -->
La console non può ricevere la pressione dei tasti, quindi se ne occupa la pagina. Un `<textarea>` nascosto raccoglie i tasti, le operazioni di incolla e la composizione IME, mentre gli eventi `wheel` fanno scorrere i componenti `ScrollBox`. Su textjs.org le pagine Playground e OpenCode sono un unico grande pannello del focus. Apri la console, poi fai clic sulla pagina per digitare.

<!-- s:7db6aa160c -->
Ciò che vede la pagina

<!-- s:03e00f4b44 -->
La pagina non può leggere le dimensioni della console, ma solo quelle della propria finestra, quindi Text.js le deduce: un pannello ancorato riduce `innerWidth` o `innerHeight` mentre `outer*` resta invariato e ogni ipotesi di ancoraggio viene calcolata per i livelli di zoom di Chrome. Vince la corrispondenza migliore. Le costanti (56 px di padding orizzontale, 104 px per l’interfaccia della console, un passo tra le righe di 14 px) sono state misurate nel frontend reale di DevTools.
