<!-- s:00c66df67a -->
Text.js 0.1 ha un tag. È la prima versione con tutti e tre i livelli: `@textjs/core` disegna i frame nella console, `@textjs/react` renderizza React 19 in quei frame e `textjs` aggiunge un App Router e una CLI.

<!-- s:1aa5bba86a -->
L’App Router

<!-- s:4631fd1deb -->
Le route sono cartelle in `app/` e seguono le convenzioni dell’App Router di Next.js. Questo è il template `dashboard` di `create-text-app`:

<!-- s:18fa0019a3 -->
Un layout avvolge ogni pagina al di sotto e mantiene il proprio stato durante la navigazione. `<Link>` accetta una `shortcut`, quindi basta un tasto per seguire il link, e `activeClassName` applica lo stile al link della route corrente:

<!-- s:5587be498a -->
I segmenti dinamici funzionano come in Next.js. `[id]` diventa un parametro, `[...slug]` cattura il resto del percorso e `[[...slug]]` corrisponde anche al percorso padre. I segmenti statici hanno la precedenza su quelli dinamici e i gruppi di route come `(marketing)` organizzano i file senza aggiungere parti all’URL.

<!-- s:3a9a93d850 -->
`loading.tsx` ed `error.tsx` avvolgono un segmento in un boundary Suspense e in un error boundary. Il componente di errore riceve l’errore e una funzione `reset`:

<!-- s:142b529e3f -->
I route handler si trovano in `app/api` e restituiscono una `Response` standard:

<!-- s:fe0c29445c -->
Il router mantiene sincronizzato `window.location` tramite `history.pushState`, quindi Indietro, Avanti e i link diretti funzionano, e scrive `metadata.title` in `document.title`. L’app disegna nella console e la pagina ospita un pannello del focus che raccoglie l’input.

<!-- s:6109f13d80 -->
La CLI

<!-- s:bbc9d4be2d -->
- `text dev` avvia Vite con React Fast Refresh. Salvare un file aggiorna la console sul posto.
- `text build` scrive una build di produzione dell’app e dei suoi route handler.
- `text start` serve la build e i route handler.

<!-- s:1e1161891f -->
`create-text-app` crea la struttura di un progetto a partire dal template `starter` o `dashboard`.

<!-- s:e2a33d088a -->
L’ispettore

<!-- s:cdb3155210 -->
Premi `` Ctrl+` `` o `F2` in un’app in esecuzione per aprire l’ispettore `[▼]` nella console. Mostra la route corrispondente e i suoi parametri, le dimensioni del frame, il numero di span e i tempi delle fasi, e il numero di frame saltati dal dirty gate. `W` disegna il layout Yoga come wireframe.

<!-- s:c2600ceabc -->
Altre novità della 0.1

<!-- s:289b0a9973 -->
`@textjs/react` include componenti PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), utilità `className` in stile Tailwind che operano sulle celle e temi. Il layout usa Yoga in WebAssembly.

<!-- s:8ad0f2154c -->
L’elenco completo è nel [registro delle modifiche](/changelog#v0-1-0).
