<!-- s:3ddc060411 -->
`text run` esegue la stessa app in un terminale. Layout, componenti, mappe dei tasti e route handler sono condivisi, e l’output è ANSI truecolor anziché span CSS `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Aggiungi uno script ed eseguilo:

<!-- s:ad1db08664 -->
`text run` importa ogni file in `app/`, monta l’App Router con una cronologia in memoria e lo disegna a schermo intero. `<Link>`, `useRouter()`, `notFound()` e `redirect()` funzionano senza modifiche, e le chiamate `fetch("/api/…")` alla stessa origine eseguono i tuoi route handler nello stesso processo. `Ctrl+C` chiude l’app e ripristina la cronologia del terminale. Richiede Bun.

<!-- s:86d6034750 -->
Uscire con `q`

<!-- s:f06966bd5c -->
Chi usa il terminale si aspetta `q`. `useApp().exit()` smonta l’app e ripristina il terminale; nel browser smonta l’app della console.

<!-- s:62111506f4 -->
La tua CLI

<!-- s:e5f8a30037 -->
Per un singolo componente, usa `renderToTerminal`. Monta un elemento senza l’App Router, e `fetch("/api/…")` raggiunge i tuoi route handler solo con `text run`, quindi passa al componente i suoi dati:

<!-- s:718df08aaf -->
Eseguilo con `bun cli.tsx`. `DeploymentsPage` recupera le proprie righe, quindi richiede `text run`.

<!-- s:76d0fa5082 -->
Le differenze

<!-- s:505bd1bfa2 -->
I terminali ridisegnano più velocemente (fino a 60 fps anziché ~15) e adattano la griglia alla finestra anziché alla console ancorata. Le immagini richiedono dati dei pixel anziché un URL. Tutto il resto, inclusa questa dashboard, usa lo stesso codice.
