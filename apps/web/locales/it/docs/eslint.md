<!-- s:df706c7a4d -->
`eslint-plugin-textjs` rileva gli errori Text.js nell’editor: tag DOM nei componenti della console, box all’interno del testo, glifi assenti in Menlo, chiamate `console.log` fuori posto ed esportazioni App Router ignorate senza segnalazioni.

<!-- s:0ecddf15e1 -->
Installazione

<!-- s:5d60a92733 -->
Il plugin supporta ESLint 9 e 10 con la configurazione flat. Le regole sono sintattiche e non richiedono informazioni sui tipi né `parserOptions.project`. Funziona qualsiasi parser che comprenda TypeScript e JSX.

<!-- s:b69abcef52 -->
Configurazioni

<!-- s:9cfe4adde3 -->
| Configurazione | Cosa abilita |
| :-- | :-- |
| `textjs.configs.recommended` | Ogni regola di correttezza come errore; le regole su console, timer e cadenza dei frame come avvisi |
| `textjs.configs.strict` | Tutto come errore, più `prefer-use-keymap` come avviso |

<!-- s:6c9781312c -->
In alternativa, scegli le regole singolarmente:

<!-- s:ec6eb92cf0 -->
File della console

<!-- s:04573fe453 -->
La maggior parte delle regole si applica solo ai file che renderizzano nella console: file che importano un componente o un hook (`Box`, `Text`, `useInput`, …) da `@textjs/app` o `@textjs/react`. I file che importano `react-dom` o `@textjs/react/dom` sono codice della pagina e non vengono controllati, quindi un sito può combinare pagine DOM e app per la console nello stesso progetto. Importare un’utilità come `tokenize` o `parseMarkdown` non rende un file un file della console.

<!-- s:96e9c86b58 -->
Le regole App Router si basano sul nome del file (`page.tsx`, `layout.tsx`, `route.ts`, …) all’interno di qualsiasi directory `app/`, inclusa `src/app/`. Se la tua ha un altro nome, passa `{ appDir: "routes" }` a `valid-route-module`, `valid-metadata` e `route-handler-exports`.

<!-- s:b66542635d -->
Regole

<!-- s:c1b57ad8e2 -->
| Regola | Consigliata | Correzione |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | errore | suggerimento |
| [`no-box-in-text`](#no-box-in-text) | errore | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | errore | correzione automatica, suggerimento |
| [`no-console-in-components`](#no-console-in-components) | avviso | suggerimento |
| [`prefer-use-interval`](#prefer-use-interval) | avviso | suggerimento |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | avviso | |
| [`prefer-use-keymap`](#prefer-use-keymap) | solo strict | |
| [`valid-route-module`](#valid-route-module) | errore | |
| [`valid-metadata`](#valid-metadata) | errore | |
| [`route-handler-exports`](#route-handler-exports) | errore | suggerimento |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, elementi personalizzati e altri tag DOM non esistono nella console. Il reconciler conosce solo i propri nodi host e genera `TX003` per qualsiasi altro elemento.

<!-- s:bd7c3e0318 -->
Il suggerimento sostituisce il tag con il componente più vicino (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) e aggiunge l’importazione.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` è una sequenza di span con stili; non può contenere un box. Annidare `<Box>` o qualsiasi componente con un box come radice (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) genera `TX004` durante il rendering. Questa regola lo rileva invece nell’editor, anche all’interno di `&&`, operatori ternari, frammenti e `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js dispone ogni carattere in una griglia di celle fisse. I glifi assenti in Menlo, il font della console DevTools su macOS, vengono renderizzati con un font di ripiego più largo di una cella, quindi tutte le celle successive si disallineano.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, i classici frame degli indicatori di caricamento del terminale): usa caratteri a blocchi o quadranti (`▘▝▗▖`), `<Spinner variant="dots">` o `marker="quadrant"` sui grafici. Imposta `{ allowBraille: true }` per le app eseguite solo con `text run` in un terminale.
- **Simboli e frecce vari** (U+2B00–U+2BFF, come il quadratino U+2B1D): i suggerimenti propongono l’equivalente in Menlo (`·`, `●`, `←`).
- **Presentazione emoji dei simboli da una cella** (`▶` o `↩` seguiti da U+FE0F): il selettore di variazione li trasforma in emoji da due celle mentre la griglia ne riserva una. La correzione automatica lo rimuove.

<!-- s:8c0c49dfb7 -->
Le emoji larghe (`🚀`, `✅`) vanno bene: Text.js le misura come due celle.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Ogni frame è un `console.log`. I tuoi log finiscono tra i frame, il successivo li fa scorrere fuori dalla vista e la visualizzazione ancorata al fondo li nasconde. `console.clear()` cancella l’app stessa.

<!-- s:0011d5dcff -->
Mostra i messaggi nell’interfaccia con `useToast()` o uno `<ScrollBox>` per i log, oppure ispeziona lo stato nel Dev Overlay `[▼]` (`` Ctrl+` ``). Con `logger`, il suggerimento riscrive `console.warn(…)` come `log.warn(…)`. I file di test e i rendering di `@textjs/app/testing` vengono esclusi.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Un `setInterval` usato direttamente in un componente richiede un effetto, una funzione di pulizia e un ref per evitare uno stato obsoleto. `useInterval` gestisce tutti e tre e `null` lo arresta.

<!-- s:894ec09a45 -->
Per le animazioni, `useAnimationFrame` segue la cadenza dei frame del renderer e si arresta quando l’output è in pausa. Consulta [Hook di utilità](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js emette al massimo un frame ogni 66 ms (circa 15 fps). Un intervallo di 16 ms esegue il rendering quattro volte per ogni frame emesso; i frame aggiuntivi vengono accorpati e consumano solo CPU. Segnala i ritardi di `setInterval`/`useInterval` inferiori a `minInterval` (valore predefinito `66`) e `useAnimationFrame` con `fps` superiore a 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Confrontare `e.key` manualmente funziona, ma le scorciatoie sono invisibili. `useKeymap` inserisce le associazioni con etichetta in `<KeyHelp>`, `<KeyHints>` (associazioni con `hint: true`) e nella palette dei comandi, gestisce sequenze come `g g` e interrompe la propagazione per i tasti corrispondenti. Segnala gli handler di `useInput` che confrontano due o più valori letterali di tasti (`minKeys`) ed esclude gli handler che leggono `e.input` per la digitazione.

<!-- s:05d39412dc -->
Consulta [Scorciatoie da tastiera](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- I file `page`, `layout`, `loading`, `error` e `not-found` devono esportare un componente come esportazione predefinita (`TX015`).
- `export const dynamic` deve essere `"auto"`, `"force-static"` o `"force-dynamic"` (`TX031`). Text.js non supporta `"error"` di Next.js. Il valore viene letto da pagine, layout e route handler. Nelle pagine e nei layout, scrivilo come stringa letterale: `text build` lo legge dal sorgente senza eseguire il modulo.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata viene unito a partire dai layout, poi dalla pagina (o da `not-found`). La regola segnala ciò che il router ignorerebbe senza segnalazioni:

<!-- s:fe9ebcbc0c -->
- `metadata` o `generateMetadata` nei file `loading` o `error`
- entrambe le esportazioni in un file
- `async generateMetadata`: la chiamata è sincrona, quindi una Promise non imposta mai il titolo
- `title` che non è una stringa o `{ default, template?, absolute? }`, oppure una chiave scritta in modo errato
- `title.template` senza `%s`, oppure in una pagina, dove non ha effetto
- una `description` che non è una stringa

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
I file `route.ts` rispondono solo ai metodi HTTP che esportano: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` e `OPTIONS`. `get` in minuscolo o `Post` non vengono mai chiamati (le richieste ricevono `405`); il suggerimento li rinomina. Le esportazioni predefinite, gli handler che non sono funzioni e le altre esportazioni vengono segnalati, tranne le [configurazioni del segmento di route](/docs/caching) `dynamic` e `revalidate`. Sposta il codice condiviso in `lib/`, oppure elenca i nomi aggiuntivi con `{ allow: [...] }`.
