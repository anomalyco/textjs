<!-- s:3c9b7877c3 -->
Text.js 0.3 ha aggiunto `@textjs/font`, un parser e un renderer per i font FIGlet. Include i 17 font della distribuzione FIGlet 2.2.5, ciascuno in un modulo ES, e il suo output corrisponde esattamente a quello del binario `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Perché FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` include due stili di caratteri, `block` e `compact`, dalla versione 0.1. FIGlet è lo standard per questo tipo di scrittura dal 1991 ed esistono centinaia di font `.flf`. Il supporto del formato permette di usare ognuno di questi font in un’app per la console.

<!-- s:7fdbff5714 -->
Un font FIGlet è un file di testo semplice. Una riga di intestazione definisce l’altezza, il carattere hardblank e le regole di layout, poi ogni carattere è disegnato come un blocco di righe con un marcatore alla fine di ciascuna riga. Nei layout predefiniti, FIGlet sposta ogni carattere verso sinistra finché non tocca il precedente, poi usa le regole di fusione del font per decidere se i due sottocaratteri a contatto si fondono in uno.

<!-- s:4c761bba4d -->
Modalità di layout

<!-- s:3f1c38cf92 -->
`figlet` ha cinque layout orizzontali e `renderFiglet` accetta gli stessi cinque tramite `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Effetto |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout del font, di solito con fusione |
| `"full"` | `-W` | Larghezza piena; i caratteri non si toccano mai |
| `"fitted"` | `-k` | Avvicinamento dei caratteri fino al contatto |
| `"smushed"` | `-S` | Fusione secondo le regole del font |
| `"universal"` | `-o` | Sovrapposizione dei caratteri successivi ai precedenti |

<!-- s:7a1307992e -->
Un numero da -1 a 63 è una modalità di layout `-m` grezza: `-1` indica la larghezza piena, `0` l’avvicinamento fino al contatto e da `1` a `63` si selezionano le regole di fusione. Sono implementate tutte e sei le regole di fusione orizzontale: carattere uguale, trattino basso, gerarchia, coppia opposta, X grande e hardblank. Il parser gestisce anche il resto del formato: righe di commento, caratteri contrassegnati da codici decimali, ottali ed esadecimali, il glifo per i caratteri mancanti e i font da destra a sinistra come `ivrit`.

<!-- s:0c920c94d3 -->
Anche il ritorno a capo segue FIGlet. `width` manda a capo tra le parole e all’interno di una parola quando questa è più larga della riga, negli stessi punti di `figlet -w`. `figlet -w 80` stampa al massimo 79 colonne, quindi `-w N` corrisponde a `width: N - 1`.

<!-- s:729dda48fc -->
Corrispondenza con il binario

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` contiene 273 output generati eseguendo il vero `figlet` 2.2.5 su ogni font incluso in ogni modalità di layout, con ritorno a capo, giustificazione, testo da destra a sinistra, modalità paragrafo e l’input di regressione di FIGlet con i flag del suo `run-tests.sh`. Ogni caso memorizza gli argomenti, l’input e l’output esatto, e il test riconverte la riga di comando in opzioni:

<!-- s:d31215cb4b -->
Tutti e 273 corrispondono. Per rigenerare le fixture, inserisci `figlet` 2.2.5 nel tuo `PATH` ed esegui `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Font sulla griglia di celle

<!-- s:ede6764977 -->
Ogni font incluso disegna con caratteri ASCII stampabili o Latin-1, quindi ogni sottocarattere occupa esattamente una cella in Menlo e si allinea alla griglia. `<FigletText>` misura le proprie righe in celle, quindi il testo si dispone in un layout flexbox come qualsiasi altro `<Text>`, mentre `columns` e `align` gestiscono il ritorno a capo e la giustificazione all’interno del suo riquadro.

<!-- s:3cedd51e92 -->
Ogni font ha un modulo dedicato, quindi un’app include solo i font che importa, e il parsing di un font avviene al primo rendering anziché all’importazione. `@textjs/font/all` esporta tutti i font per le gallerie.

<!-- s:9d54eeef4f -->
Qualsiasi altro FIGfont può essere recuperato e analizzato a runtime:

<!-- s:f64649f401 -->
Licenze

<!-- s:67e882f6b4 -->
I font inclusi sono identici byte per byte a quelli in `figlet-2.2.5.tar.gz` e sono distribuiti con la licenza BSD a 3 clausole di FIGlet. Ciascuno conserva i propri crediti nelle righe di commento, disponibili come `font.comment`. I font popolari senza un’autorizzazione alla ridistribuzione, come Doom, Larry 3D, ANSI Shadow e Calvin S, non sono inclusi.

<!-- s:ee98166722 -->
Il riferimento completo si trova in [Font](/docs/fonts).
