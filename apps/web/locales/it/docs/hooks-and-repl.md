<!-- s:674f346b70 -->
Gli hook collegano i componenti all’input, al focus e al viewport.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Campo | Descrizione |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Testo prodotto dal tasto |
| `ctrl` `meta` `shift` `alt` | Modificatori |
| `stopPropagation()` | Interrompere gli handler con priorità inferiore |

<!-- s:0764796164 -->
Le scorciatoie del browser come `⌘⌥J` e `⌘R` passano sempre.

<!-- s:550c6a7dd5 -->
`usePaste` e `useWheel` accettano le stesse opzioni. `ambient` non ha effetto su `useWheel`.

<!-- s:9248f9b147 -->
| Opzione | Descrizione |
| :-- | :-- |
| `isActive` | `false` disattiva l’handler senza smontare il componente (valore predefinito `true`) |
| `priority` | Le priorità più alte vengono eseguite per prime (valore predefinito `0`). I componenti con il focus usano `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Continuare a ricevere input mentre è aperto un `<Modal>` esterno a questo componente (valore predefinito `false`) |
| `ambient` | Escludere questo handler dal conteggio per il [suggerimento sul focus](#usepagefocus) (valore predefinito `false`) |

<!-- s:e4e842287a -->
La scorciatoia del Dev Overlay (`F2` o `` Ctrl+` ``) è ambient, quindi una pagina senza altri input da tastiera non mostra il suggerimento.

<!-- s:617ae1bfe8 -->
`usePaste` e `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (sperimentale)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` esporta `useKeyState` per tenere traccia dei tasti fisici tenuti premuti tramite `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Interrogare `keys.isDown(code)` o leggere `keys.pressed` non attiva nuovi rendering di React. Passa una callback per reagire alla pressione e al rilascio dei tasti nel momento in cui avvengono.

<!-- s:d9e1465ae0 -->
I tasti tenuti premuti vengono rilasciati automaticamente quando la pagina perde il focus. Consulta [Modifiche incompatibili](/docs/support-policy#breaking-changes) per sapere come vengono assegnate le versioni alle esportazioni sperimentali.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` restituisce un valore che indica se la pagina ha il focus. Le pressioni dei tasti raggiungono l’app solo quando la pagina ha il focus. È lo stesso valore di `useViewport().focused`, ma attiva un nuovo rendering solo quando il focus cambia.

<!-- s:e1075d4220 -->
Quando la pagina non ha il focus e l’app ha un handler `useInput` o `usePaste`, un hook `useKeyState` o un elemento che può ricevere il focus tramite Tab, l’ultima riga del frame della console diventa una barra color ambra con il testo «Fai clic sulla pagina per usare la tastiera». Gli handler contrassegnati come [`ambient`](#useinput) non contano. Il suggerimento non appare in un terminale, nei test o nelle repliche inline. Ogni volta che appare, il suggerimento lampeggia per circa 6 secondi, a meno che non sia attiva l’impostazione di sistema per ridurre il movimento. Per decidere tu quando mostrarlo, imposta `focusHint: false` in `text.config.ts` o in `createConsoleRoot` e renderizza `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
Il REPL di `window.text`

<!-- s:420cc7f125 -->
Ogni app aggiunge funzioni di utilità a `window.text`. Digitale nel prompt di DevTools.

<!-- s:195573d803 -->
Caricamento su richiesta della console (sperimentale)

<!-- s:97014ecad1 -->
`@textjs/core/experimental` esporta `onConsoleIntent` per le pagine che scaricano la propria app console solo quando un visitatore la richiede. Chiama la tua funzione una sola volta, indicando il motivo:

<!-- s:444b1ebdd7 -->
| Motivo | Quando |
| :-- | :-- |
| `dock` | DevTools è ancorato al caricamento della pagina o viene ancorato in seguito. Text.js lo rileva dalle dimensioni della finestra |
| `shortcut` | Il visitatore preme F12 o Ctrl+Shift+J, I, C o K, oppure ⌘⌥J, I, C o K su un Mac. Il browser apre comunque DevTools |
| `engage` | Un clic primario su un elemento che corrisponde a `engageSelector`, Enter o Space su un pulsante `[data-textjs-engage]`, oppure la scelta di una dimensione in `<ViewportControl>` prima dell’avvio dell’app. I clic su link, pulsanti e campi di modulo all’interno di un elemento corrispondente non contano, a meno che non abbiano anch’essi `data-textjs-engage` |
| `session` | Uno degli eventi precedenti si è già verificato in questa scheda, quindi al ricaricamento l’app si avvia subito |
| `manual` | Hai chiamato `trigger()` sull’handle restituito |

<!-- s:894b97fac4 -->
DevTools aperto in una finestra separata dal menu del browser non si riflette nelle dimensioni della finestra. Questi visitatori avviano l’app da un elemento `engage` e `session` continua ad avviarla ai ricaricamenti in quella scheda.

<!-- s:06cdcf713e -->
Sugli schermi touch non si attiva nulla automaticamente. Chiama `trigger()` da un tuo controllo.

<!-- s:d7006796c2 -->
| Opzione | Descrizione |
| :-- | :-- |
| `engageSelector` | Elementi che avviano l’app al clic (valore predefinito `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` non aggiunge listener |
| `persist` | Memorizzazione della richiesta per la scheda in `sessionStorage` con la chiave `CONSOLE_INTENT_KEY` (valore predefinito `true`) |
| `prefetch` | Chiamata al massimo una volta, quando il puntatore o il focus entra in un elemento `engageSelector` |
| `idlePrefetch` | Chiamata a `prefetch` anche quando il browser è inattivo dopo `load` (valore predefinito `false`) |

<!-- s:4460da3205 -->
`prefetch` non viene mai eseguito sugli schermi touch, con Risparmio dati attivo o su connessioni più lente del 4G. `canPrefetchConsole()` restituisce lo stesso controllo. Il metodo `dispose()` dell’handle rimuove tutti i listener.

<!-- s:9128a9d98f -->
`<ViewportControl>` funziona prima che esista la radice della console. La scelta di una dimensione la salva, attiva `engage` in modo che `onConsoleIntent` avvii l’app e applica la dimensione una volta impostato `root`. Consulta [Modifiche incompatibili](/docs/support-policy#breaking-changes) per sapere come vengono assegnate le versioni alle esportazioni sperimentali.
