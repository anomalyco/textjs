<!-- s:fe58dc6ae4 -->
Ogni frame di Text.js è una chiamata a `console.log`. Fino alla versione 0.4, ogni frame era anche preceduto da `console.clear()`. Sotto carico, la console lampeggiava mostrando il vuoto tra un frame e l’altro.

<!-- s:7a82fe5fe2 -->
Misurare il lampeggio

<!-- s:1d16f5a106 -->
Per misurarlo, abbiamo creato `bench/devtools`. Avvia Chrome for Testing, apre il vero frontend di DevTools come pagina e lo strumenta:

<!-- s:4da6ef7009 -->
- A ogni `requestAnimationFrame` nel frontend di DevTools, controlla se nel viewport della console è presente un frame completo di 32 righe. Le ridipinture che ne sono prive sono considerate vuote.
- Decodifica poi i frame di `Page.startScreencast` per confermare il risultato in pixel.
- Ogni frame riporta `FRAME:<id> · T:<epochMs>` nella riga 0, così il frontend può determinare quale frame sta mostrando e con quanto ritardo.

<!-- s:cb3c553c37 -->
Con `console.clear()` prima di ogni frame, una dashboard 100×32 a 15 fps risultava vuota nel **70,6%** delle ridipinture di DevTools. A 60 fps, nell’**81,1%**.

<!-- s:7076ddd27d -->
Il motivo

<!-- s:1e65554dc0 -->
`ConsoleView` di DevTools gestisce le due chiamate in modo diverso:

<!-- s:56484b5ac3 -->
1. `console.clear()` chiama `consoleCleared()`, che invalida il viewport **in modo sincrono**. Ogni messaggio scompare nello stesso task.
2. `console.log()` chiama `addConsoleMessage()`, che si limita a pianificare un aggiornamento tramite `viewportThrottler`, un `Throttler` con un timeout di **50 ms**.

<!-- s:8a656fe37a -->
Quindi ogni frame rimuove subito il vecchio frame e disegna quello nuovo più tardi. A 15 fps, per circa 50 ms ogni 66 ms non si vede nulla.

<!-- s:8bb24ac9a4 -->
Accodare i frame

<!-- s:1092cc0920 -->
Dalla versione 0.4, Turbolog accoda i frame. DevTools resta in fondo alla console, quindi il nuovo frame sostituisce quello vecchio in una sola ridipintura. Uno span iniziale di larghezza zero con `margin-top:100vh` (la tenda) spinge i frame precedenti fuori dalla vista e termina la propria riga, così il link al sorgente di DevTools non restringe mai la riga 0.

<!-- s:6e8cb684de -->
Prima o poi la console deve comunque essere svuotata. Lo svuotamento avviene solo al primo frame, dopo `invalidate()`, durante l’inattività una volta accumulati 100 frame e al limite massimo di 300.

<!-- s:58637d56ab -->
Adeguare il ritmo al throttler

<!-- s:14c65af87d -->
Inviare frame più velocemente di quanto DevTools riesca a disegnarli non accelera nulla. Un log che arriva mentre il throttler è in attesa lo riavvia, quindi alcuni frame vengono scartati: a 60 fps DevTools ha disegnato 67 dei 295 frame emessi. Turbolog distanzia i frame di almeno **66 ms**, circa 15 fps, e continua a renderizzare gli input discreti in modo sincrono quando l’intervallo lo consente.

<!-- s:8a90fd55c3 -->
Interrompere l’aggancio di fase

<!-- s:e96505e7a5 -->
Gli svuotamenti aggiungevano anche circa 50 ms di ritardo a ogni frame successivo. Dopo uno svuotamento, DevTools inserisce una riga sintetica `Console was cleared`. Questa occupa lo slot immediato del throttler e sposta il frame successivo sul timer da 50 ms, e con una cadenza costante di 66 ms ogni frame successivo resta agganciato a quel timer.

<!-- s:57527b9818 -->
Il renderer ora attende **110 ms** una sola volta dopo ogni svuotamento. Da quel momento, ogni frame arriva più di 50 ms dopo il completamento dell’aggiornamento precedente e segue il percorso immediato di DevTools. Il ritardo mediano di visualizzazione è passato **da 63 ms a 10,4 ms**.

<!-- s:003645d0bf -->
Risultati

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, dashboard 100×32, vero frontend di DevTools:

<!-- s:9ee75054af -->
| Driver | FPS | Ridipinture vuote | Disegnati / emessi | Ritardo p50 |
| :-- | --: | --: | --: | --: |
| Svuotamento a ogni frame | 15 | 70,6% | 70 / 75 | 60,4 ms |
| **Accodamento (1.0)** | **15** | **1,0%** | **74 / 75** | **10,4 ms** |
| Svuotamento a ogni frame | 60 | 81,1% | 45 / 300 | 9,8 ms |
| Accodamento, senza cadenza | 60 | 0,8% | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Il restante 1% è il primo frame, che svuota la console di proposito. Le sue ridipinture vuote sono la riga `Console was cleared`, non una console vuota.

<!-- s:315471c65a -->
Meno proprietà per span

<!-- s:e210e7e85d -->
Il sorgente di DevTools ha rivelato un altro costo. Copia ogni *proprietà estesa* di uno stile `%c` su ogni contenitore di riga, quindi le proprietà abbreviate `font:` e `margin:` si espandevano in circa 33 proprietà per span. Ora gli span usano solo proprietà estese, circa 7 ciascuno, con colori esadecimali.

<!-- s:5b341c4930 -->
La modalità di accodamento è stata introdotta in Text.js 0.4 e la correzione dell’aggancio di fase arriva nella versione 1.0. Nessuna delle due richiede modifiche al codice dell’applicazione.
