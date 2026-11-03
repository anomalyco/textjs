<!-- s:aca2697522 -->
Turbolog trasforma ogni commit di React in una chiamata a `console.log`, o nessuna se non è cambiata alcuna cella.

<!-- s:d01b048a1d -->
Obiettivi

<!-- s:53b8b34f5a -->
1. **Una chiamata per ogni frame modificato.**
2. **Zero chiamate quando inattivo.** Un frame invariato restituisce il controllo prima di costruire una stringa.
3. **Pochi argomenti di stile.** 149 span `%c` per le 3200 celle di una dashboard densa `100×32`.

<!-- s:e284ac0068 -->
Pipeline

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Il frame risiede in array tipizzati monodimensionali per caratteri, colori e attributi, allocati una sola volta.

<!-- s:6215aa69f7 -->
Controllo delle modifiche

<!-- s:617da960c4 -->
Per ogni riga si calcola un hash. Se non è cambiato nulla, il driver restituisce subito il controllo:

<!-- s:524a0717a4 -->
Sostituzione dei frame

<!-- s:3c7194b785 -->
Turbolog accoda i frame e svuota la console solo al primo frame, dopo `invalidate()`, durante l’inattività quando si sono accumulati 100 frame e a 300. DevTools rimuove subito i messaggi cancellati, ma disegna quelli nuovi con un intervallo minimo di 50 ms, quindi svuotare la console a ogni frame la fa apparire vuota per un istante. I frame accodati si sostituiscono in un unico ridisegno e uno span di copertura a larghezza zero nasconde il frame precedente. Scorri verso l’alto per vedere i frame precedenti.

<!-- s:7845be2cbb -->
I frame sono cadenzati a circa 15 fps. I frame più rapidi azzerano l’intervallo di attesa di DevTools e vengono scartati.

<!-- s:a36177ad5b -->
Codifica run-length

<!-- s:d4079278eb -->
Le celle corrispondenti si uniscono in un unico span `%c`. Gli span proseguono oltre gli a capo e le stringhe CSS vengono internate.

<!-- s:7fe20496b0 -->
Dettagli di Chromium

<!-- s:ff8301db1f -->
- Il carattere letterale `%` viene sottoposto a escape come `%%`.
- Agli URL e al testo `path:line` viene aggiunto un word joiner affinché DevTools non ne modifichi lo stile.
- Gli span usano solo proprietà CSS estese. DevTools copia ogni proprietà espansa su ogni riga.
- Gli span sono calibrati affinché gli sfondi si affianchino senza spazi vuoti.

<!-- s:41e36e3179 -->
Firefox e Safari

<!-- s:8b2f3136a1 -->
Chromium dispone ogni riga di uno span `%c` come un blocco inline. Firefox e Safari mantengono gli span inline, quindi ignorano i margini verticali e mandano a capo le righe lunghe. `CssConsoleDriver` rileva il browser verificando il supporto delle funzionalità CSS e, per queste due console, imposta un’altezza di riga di 14 px senza margini, disattiva gli a capo con `text-wrap-mode: nowrap` e spinge i frame precedenti fuori dalla vista con una copertura `line-height: 100vh`. L’adattamento alla console lascia spazio alla colonna dei link al sorgente di Firefox. Safari mette Menlo al primo posto nella lista dei font, perché le sue pagine non possono usare un SF Mono installato dall’utente che Web Inspector potrebbe usare per il rendering. Passa `browser` a `createConsoleRoot` per scegliere tu la console.

<!-- s:66b07a5809 -->
Benchmark

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` su una dashboard densa `100×32`, media di 1000 frame (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Frame | Tempo | Span `%c` |
| :-- | --: | --: |
| Ridisegno completo (layout, disegno, codifica) | **0,163 ms** | 149 |
| Modifica di una riga | **0,011 ms** | 149 |
| Inattivo | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
La pagina [Stato](/status) esegue la stessa pipeline nel tuo browser. Esegui `text.stats()` in DevTools mentre è in esecuzione una demo del [Playground](/playground).
