<!-- s:5a6798e6a5 -->
Oggi rilasciamo Text.js 1.0, il framework console per il Web.

<!-- s:e4787165f5 -->
Text.js esegue il rendering di app React 19 nella console di Chrome DevTools, con layout, routing, focus, input, moduli, grafici e Markdown in streaming disegnati con `console.log`.

<!-- s:48b184a262 -->
Le novità della 1.0

<!-- s:7f7f2a9a76 -->
- **L’App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` e `api/*/route.ts`, sincronizzati con `window.location`. Segue le convenzioni dell’App Router di Next.js.
- **Turbolog.** Yoga flexbox dispone una griglia di celle, un `CellBuffer` basato su array tipizzati la memorizza e un codificatore run-length la trasforma in una singola chiamata `console.log(format, ...css)`. I frame inattivi non effettuano chiamate alla console.
- **Un kit di componenti.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` virtualizzata, `Table`, `Tree`, grafici, finestre di dialogo, notifiche toast e una palette di comandi `Ctrl+K` basata su `useKeymap`.
- **Frame accodati.** I frame vengono accodati sotto il precedente, così la console non lampeggia vuota tra un frame e l’altro. Per approfondire, leggi [Turbolog: eliminare il lampeggio](/blog/turbolog-eliminating-the-flash).
- **Testo da destra a sinistra.** Ebraico e arabo vengono visualizzati in ordine visivo, con la composizione delle forme arabe, grazie a un’implementazione di UAX #9 che supera tutti i 770.241 casi di `BidiTest.txt`. Vedi [Testo da destra a sinistra nella console](/blog/right-to-left-text).
- **Una console adattiva.** Text.js si adatta al pannello DevTools ancorato, tenendo conto dello zoom della pagina e di una barra degli strumenti che va a capo. Quando il pannello è sganciato, usa `120×36`.
- **`text run`.** La stessa app App Router viene visualizzata in un vero terminale.
- **Strumenti per agenti ed editor.** `text mcp` rende disponibile la tua app agli agenti di programmazione tramite il Model Context Protocol e l’estensione Text.js DevTools aggiunge un pannello accanto a «Console». Anche `eslint-plugin-textjs` e un’estensione per VS Code fanno parte della 1.0.

<!-- s:b71c4a16bc -->
Un cambio di nome

<!-- s:b47aa37902 -->
Il pacchetto del framework ora è `@textjs/next`. Il nome `textjs` era già occupato su npm. Aggiorna le importazioni:

<!-- s:e4005009f1 -->
**Aggiornamento, 1.0.2:** il pacchetto ora è `@textjs/app` e `@textjs/next` è deprecato. Per passare al nuovo pacchetto, esegui `bun remove @textjs/next && bun add @textjs/app` e importa da `@textjs/app`.

<!-- s:5b35a47b90 -->
Numeri

<!-- s:2ee54da34c -->
Su una dashboard densa da `100×32` (46 nodi di testo, 149 span `%c`), con misurazioni tramite `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Frame | Media |
| :-- | --: |
| Ridisegno completo (layout, disegno, codifica) | 0,163 ms |
| Modifica di una riga (digitazione) | 0,011 ms |
| Inattivo | 0,000 ms, 0 chiamate alla console |

<!-- s:2fee8c4c3d -->
Un frame invariato termina prima di allocare una stringa, quindi i frame inattivi misurano 0,000 ms.

<!-- s:a0fa47c98f -->
Provare Text.js

<!-- s:aeb9cc2b5d -->
Apri [textjs.org](/) e premi ⌘⌥J (Ctrl+Shift+J su Windows e Linux). Il sito esegue un’app Text.js nella tua console, con una vista per pagina. Il [Playground](/playground) include una dashboard, Markdown in streaming e Snake. [OpenCode](/opencode) si connette al tuo server OpenCode locale.

<!-- s:31dd2e762c -->
L’elenco completo delle modifiche è nel [registro delle modifiche](/changelog) e il codice sorgente è su [GitHub](https://github.com/anomalyco/textjs).
