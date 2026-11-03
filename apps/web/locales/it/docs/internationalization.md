<!-- s:43751f7845 -->
Text.js visualizza l’ebraico, l’arabo, il persiano e altre scritture da destra a sinistra nell’ordine corretto, allineati alla griglia di celle, in DevTools, nei terminali e nelle repliche DOM. Implementa l’algoritmo bidirezionale Unicode (UAX #9, Unicode 18.0) e supera le suite ufficiali di conformità: tutti i 770.241 casi di `BidiTest.txt` (ogni input in ogni direzione del paragrafo) e tutti i 91.707 casi di `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Direzione

<!-- s:0c7b144a82 -->
Ogni paragrafo (ciascuna riga di un `<Text>` separata da `\n`) sceglie la propria direzione di base dal primo carattere forte, come fa `dir="auto"` in HTML. I paragrafi da destra a sinistra si allineano a destra per impostazione predefinita.

<!-- s:c17beb4498 -->
| `align` | Paragrafo da sinistra a destra | Paragrafo da destra a sinistra |
| :-- | :-- | :-- |
| `"start"` (predefinito) | sinistra | destra |
| `"end"` | destra | sinistra |
| `"left"` / `"center"` / `"right"` | come specificato | come specificato |

<!-- s:6db8fa68bb -->
Su un `<Text>` annidato, `dir` isola lo span come `<bdi>` in HTML: il contenuto ha un layout indipendente e non può riordinare il testo circostante. Usalo per nomi, titoli e altro testo di direzione sconosciuta forniti dagli utenti.

<!-- s:68088feb2d -->
Il processo di rendering

<!-- s:d401630cda -->
1. **Andare a capo in ordine logico.** Le righe si interrompono esattamente come per il testo da sinistra a destra, in base alla larghezza delle celle.
2. **Riordinare ogni riga.** L’algoritmo risolve i livelli di incorporamento per l’intero paragrafo (incorporamenti espliciti e isolati, tipi deboli e neutri, parentesi accoppiate), poi riordina separatamente ogni riga risultante dal ritorno a capo (regole L1–L2). Le parentesi e gli altri caratteri speculari si invertono ai livelli da destra a sinistra (L4), quindi `(abc)` rimane `(abc)` all’interno dell’ebraico.
3. **Applicare le forme contestuali arabe.** Le lettere assumono le forme contestuali (isolata, iniziale, mediana, finale) dai blocchi Arabic Presentation Forms, calcolate in ordine logico all’interno di ogni sequenza di livello della riga (ZWJ e ZWNJ contano nella posizione in cui si trovano). Una lettera occupa una cella, le forme unite si mantengono attraverso qualsiasi confine di span (un cursore, un cambio di colore) e la console non deve mai applicarle.
4. **Bloccare l’ordine.** Le celle ora contengono i glifi nell’ordine di visualizzazione. I browser e molti terminali applicherebbero bidi una seconda volta, quindi i driver bloccano l’ordine:

<!-- s:153724c967 -->
| Output | Come viene bloccato l’ordine |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Gli span che contengono caratteri da destra a sinistra sono racchiusi in `LRO … PDF` (U+202D / U+202C). Il filtro di sanitizzazione di `%c` di DevTools rimuove `direction` e `unicode-bidi`. |
| Terminali (`AnsiDriver`, `text run`) | Le righe con testo da destra a sinistra sono racchiuse in `LRO … PDF` per i terminali che applicano bidi per riga. `renderToTerminal` passa alla modalità esplicita BDSM di ECMA-48 (`CSI 8 l`, rispettata dai terminali basati su VTE) una volta all’ingresso e torna alla modalità implicita (`CSI 8 h`) all’uscita; i frame singoli di `renderToAnsi` che contengono testo da destra a sinistra iniziano con `CSI 8 l`. Passa `bidi: "none"` per emettere le celle così come sono. |
| Repliche DOM (`<ConsoleMirror>`) | La replica usa `direction: ltr` (così una pagina ospitante RTL non può invertirla) e gli span che contengono testo da destra a sinistra ricevono `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` e `<Divider title>` seguono gli stessi passaggi (`drawLogicalText(buffer, x, y, text, …)` disegna in questo modo qualsiasi riga singola), quindi le loro etichette appaiono in ordine e con le lettere unite.

<!-- s:3b67946601 -->
Il testo senza caratteri da destra a sinistra salta tutti questi passaggi. Un modello di testo interamente da sinistra a destra viene rilevato durante la segmentazione dei grafemi (un confronto per grafema) e disegnato con il percorso invariato; i frame della console sono identici byte per byte.

<!-- s:26ac17c25a -->
Larghezza delle celle

<!-- s:552e751976 -->
La sequenza di font distribuita è `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Nessuno di questi font contiene glifi ebraici o arabi, quindi i browser scelgono un font alternativo per ogni carattere. Su macOS è Courier New, a spaziatura fissa di 0,6 em: 7,2012 px per glifo a 12 px contro i 7,2246 px di Menlo. È più stretto dello 0,3%, abbastanza da far slittare un’intera riga di ebraico di circa mezza cella.

<!-- s:851f84e769 -->
`CssConsoleDriver` misura ogni span da destra a sinistra con un canvas nel font della console (con lo stesso sistema di forme contestuali di Blink e gli stessi font alternativi usati da DevTools), poi aggiunge un padding pari all’esatta differenza in LayoutUnit (1/64 px). Lo span finisce per avere la stessa larghezza delle celle della griglia che occupa (un grafema largo come un’emoji ne conta due). Uno span viene ristretto al massimo di mezza cella, quindi un font alternativo proporzionale (Times New Roman accanto a Cascadia Mono su Windows) deborda invece di lasciare che lo span successivo si sovrapponga ai suoi glifi. Misurato nel frontend reale di DevTools (Chromium 151) su un frame di 64×21 con righe in ebraico, arabo, miste e con emoji nell’ebraico e titoli di box RTL (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Frame | Scostamento del bordo destro tra le righe |
| :-- | --: |
| Celle registrate senza bloccare l’ordine | 14,5 px (DevTools riordina e riapplica le forme contestuali) |
| Ordine bloccato, senza adattamento della larghezza | 2,22 px |
| Driver distribuito | 0,156 px |
| Controllo: stesse celle, ogni glifo RTL sostituito da `x` | 1,67 px |

<!-- s:a7ec844aae -->
Il frame distribuito corrisponde al controllo interamente latino su ogni riga tranne quella con emoji, dove fa meglio: le emoji vengono adattate insieme allo span da destra a sinistra che le circonda (0,03 px), mentre la riga con emoji da sinistra a destra del controllo non viene adattata (1,66 px).

<!-- s:318b8b5f4c -->
DevTools disegna ogni span `%c` con `contain: paint` e allinea ciascuno separatamente ai pixel del dispositivo, quindi dove due sfondi si incontrano in una posizione frazionaria il pixel tra loro può non appartenere a nessuno dei due, lasciando una linea sottile di 1 px. In Chrome e Edge, uno span con uno sfondo lo estende di 1 px sotto il vicino opaco a destra e uno span adattato aggiunge quel pixel al proprio padding. Nessuno dei quattro frame qui sopra mostra una linea sottile.

<!-- s:7deafc8e74 -->
Passa `measureText: false` per disattivare l’adattamento, oppure fornisci una tua funzione di misurazione `(text, bold, italic) => px`.

<!-- s:f088ff48f9 -->
Inserimento e modifica

<!-- s:6aca925fed -->
`<Input>` e `<Textarea>` mantengono un cursore logico. I tasti freccia si spostano nel testo nell’ordine di memorizzazione, quindi nel testo da destra a sinistra ← si sposta visivamente a destra. Il cursore a blocco si trova sul carattere logico che copre, ovunque lo collochi il riordinamento. All’interno di una sequenza da destra a sinistra, è la cella a sinistra del carattere precedente. Anche la selezione è un intervallo logico e la sua evidenziazione può quindi coprire celle non contigue nelle righe a direzione mista. Lo scorrimento orizzontale di un `<Input>` a riga singola segue la colonna logica, quindi un valore lungo da destra a sinistra può far scorrere il cursore fuori dalla vista. Un cursore su uno spazio o alla fine del testo viene disegnato come uno spazio non separabile isolato, così rimane neutro e non si unisce mai ai numeri su entrambi i lati.

<!-- s:68c8d3995f -->
Limiti

<!-- s:fbb8008232 -->
- **Separatori di paragrafo.** Le righe si dividono in corrispondenza di `\n`. U+2029 e gli altri separatori di paragrafo terminano un paragrafo bidi ma non iniziano una nuova riga.
- **Tabulazioni.** Le tabulazioni vengono espanse in spazi prima dell’esecuzione di bidi, quindi agiscono come spazi bianchi (WS), non come separatori di segmento (S).
- **Forme contestuali.** Solo le lettere con forme di presentazione assumono forme contestuali: arabo, persiano, urdu e le altre lettere in U+FB50–U+FDFF e U+FE70–U+FEFF. Lam-alef rimane composto da due lettere unite in due celle, anziché dalla legatura a glifo singolo. Il siriaco, N’Ko e le altre scritture con lettere unite mantengono le forme nominali.
- **Copia.** Il testo copiato dalla console è nell’ordine di visualizzazione (con i marcatori `LRO`/`PDF`), non nell’ordine logico.
- **Terminali.** I terminali che ignorano sia BDSM sia `LRO` e applicano il proprio bidi (per esempio con bidi abilitato in iTerm2) possono riordinare nuovamente le righe da destra a sinistra.
- **Repliche DOM.** `<ConsoleMirror>` non adatta le larghezze, quindi le sequenze da destra a sinistra possono slittare fino allo 0,3% della loro larghezza.

<!-- s:f4d4dadbf6 -->
Tradurre il pannello del focus

<!-- s:7791d4db4e -->
`<FocusPad>` di `@textjs/react/dom` (visualizzato anche da `<TextCanvas>`) indica ai visitatori di aprire la console, fare clic sulla pagina e premere un tasto. Il testo è in inglese per impostazione predefinita. Per tradurlo, passa `messages` con le stringhe che vuoi sostituire. Le chiavi che ometti mantengono il testo inglese, elencato in `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
Una stringa che contiene un valore è una funzione che restituisce l’intera frase, così una traduzione può collocare il valore in qualsiasi punto al suo interno. `step`, `pressShortcut`, `then`, `defaultAction` e `shortcutOpens` sono funzioni. `step` riceve il numero del passaggio e il numero di passaggi. `then` riceve la prop `action`, oppure il testo di `defaultAction` quando non c’è `action`. `defaultAction` riceve i tasti del primo suggerimento, oppure `null` in assenza di suggerimenti. `pressShortcut` riceve i tasti della scorciatoia per gli screen reader e `shortcutOpens` riceve la scorciatoia sotto forma di elementi `<kbd>`.

<!-- s:e9475554da -->
`messages` copre anche le etichette annunciate dagli screen reader e il controllo delle dimensioni della console (`sizeControl`). `<TextCanvas>` accetta la stessa prop `messages`. Anche `<ViewportControl>` la accetta e usa le chiavi del controllo delle dimensioni. Le diciture sui tasti come ⌘⌥J, Ctrl+Shift+J e Enter non vengono tradotte.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` e `reorderIndices` espongono l’algoritmo stesso: le regole P1–I2, L1 e L2.
