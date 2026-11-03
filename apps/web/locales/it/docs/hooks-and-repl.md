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
