<!-- s:bd59ce7974 -->
Text.js ora visualizza l’ebraico, l’arabo, il persiano e altre scritture da destra a sinistra nell’ordine corretto, con le lettere arabe unite, sulla stessa griglia di celle usata per tutto il resto.

<!-- s:4673b00c8b -->
Ogni paragrafo ricava la propria direzione di base dal primo carattere forte, come fa `dir="auto"` in HTML, e i paragrafi da destra a sinistra si allineano a destra. Su un `<Text>` annidato, `dir` isola lo span come fa `<bdi>`, così un nome utente dalla direzione sconosciuta non può riordinare il testo circostante.

<!-- s:9026fc3194 -->
L’algoritmo

<!-- s:f13f3bb4af -->
Il supporto per la scrittura da destra a sinistra è un’implementazione dello Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0), scritta da zero in `@textjs/core`. Risolve i livelli di incorporamento per ogni paragrafo, inclusi incorporamenti espliciti e isolamenti, tipi deboli e neutri e coppie di parentesi. Poi ogni riga ottenuta dall’andata a capo viene riordinata separatamente e i caratteri speculari si scambiano ai livelli da destra a sinistra, così `(abc)` resta `(abc)` all’interno dell’ebraico.

<!-- s:82ed91ab82 -->
Unicode pubblica due file di conformità per l’algoritmo. Entrambi sono inclusi nel repository, compressi con gzip, e la suite di test esegue ogni caso:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` elenca gli input come sequenze di classi bidi, ciascuna con le direzioni del paragrafo a cui si applica. Text.js supera tutti i 770.241 casi.
- `BidiCharacterTest.txt` elenca stringhe reali con i livelli e l’ordine attesi. Text.js li supera tutti e 91.707.

<!-- s:3939cd5f43 -->
Dall’ordine logico alle celle

<!-- s:e682972504 -->
Una riga di testo da destra a sinistra attraversa quattro passaggi prima di raggiungere la console:

<!-- s:a497c14c9c -->
1. **Andare a capo in ordine logico.** Le righe si interrompono dove si interromperebbero per il testo da sinistra a destra, in base alla larghezza delle celle.
2. **Riordinare ogni riga.** I livelli risolti determinano l’ordine di visualizzazione dei grafemi della riga.
3. **Applicare le forme arabe.** Le lettere assumono le forme contestuali (isolata, iniziale, mediana, finale) dai blocchi Arabic Presentation Forms. Una lettera occupa una cella e le forme unite restano tali anche con un cursore o un cambio di colore nel mezzo di una parola.
4. **Fissare l’ordine.** Le celle ora contengono i glifi nell’ordine di visualizzazione.

<!-- s:5d1156720d -->
L’ultimo passaggio esiste perché DevTools applicherebbe bidi al testo una seconda volta, invertendolo di nuovo. Uno stile `%c` non può disattivare questo comportamento, perché il filtro di DevTools elimina `direction` e `unicode-bidi`. Il driver quindi racchiude ogni span che contiene caratteri da destra a sinistra in `LRO` e `PDF` (U+202D e U+202C), forzando la visualizzazione da sinistra a destra dell’esatto contenuto delle celle.

<!-- s:aba313fc71 -->
Uno scostamento di mezza cella

<!-- s:1109446b98 -->
Né SF Mono né Menlo contengono glifi ebraici o arabi, quindi il browser usa un font di fallback per ogni carattere. Su macOS è Courier New, anch’esso a spaziatura fissa, con 7,2012 px per glifo a 12 px contro i 7,2246 px di Menlo. È più stretto dello 0,3%, quanto basta per spostare un’intera riga di ebraico di circa mezza cella.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` misura ogni span da destra a sinistra con un canvas nel font della console, che usa lo stesso fallback dei font di Blink usato da DevTools, e aggiunge allo span uno spazio pari alla differenza esatta in LayoutUnits (1/64 px). Ogni span finisce per avere la stessa larghezza delle celle della griglia che occupa. Uno span viene ristretto al massimo di mezza cella, così un font di fallback molto più largo deborda invece di sovrapporsi allo span successivo.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` misura il risultato nel frontend reale di DevTools, su un frame di 64×21 con righe in ebraico, in arabo, miste e con emoji nel testo ebraico:

<!-- s:e6a33dfaa2 -->
| Frame | Scostamento del bordo destro tra le righe |
| :-- | --: |
| Celle stampate senza fissare l’ordine | 14,5 px |
| Ordine fissato, senza adattamento della larghezza | 2,22 px |
| Driver distribuito | 0,156 px |
| Controllo: ogni glifo RTL sostituito da `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
Il controllo è lo stesso frame con testo latino. Il driver distribuito si allinea meglio del controllo perché le emoji all’interno degli span da destra a sinistra vengono adattate insieme a essi.

<!-- s:d37099863b -->
Il testo da sinistra a destra resta invariato

<!-- s:41ce31b66a -->
Il testo senza caratteri da destra a sinistra salta tutti questi passaggi. Il controllo avviene durante la segmentazione dei grafemi, con un confronto per grafema, e il testo interamente da sinistra a destra viene disegnato attraverso lo stesso percorso di prima, quindi i suoi frame nella console sono identici byte per byte.

<!-- s:a8fff567e6 -->
Il testo da destra a sinistra è incluso in Text.js 1.0. [Internazionalizzazione](/docs/internationalization) tratta input, modifica, terminali e API.
