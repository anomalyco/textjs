<!-- s:ce06f5c491 -->
L’App Router associa i file in `app/` agli URL, seguendo le convenzioni dell’App Router di Next.js. La barra degli indirizzi e la cronologia del browser restano sincronizzate, quindi indietro, avanti e i link diretti funzionano mentre l’interfaccia viene renderizzata nella console.

<!-- s:00fe1aba85 -->
I file sono route

<!-- s:8bae70ad43 -->
Sposta l’elenco in una route dedicata e aggiungi una pagina delle impostazioni:

<!-- s:141a7c73d4 -->
Un layout condiviso

<!-- s:cffa0eef2d -->
`layout.tsx` racchiude ogni pagina e mantiene il proprio stato durante la navigazione. Inserisci al suo interno la barra superiore e la navigazione.

<!-- s:9d98f5e58a -->
`shortcut` associa un singolo tasto al link. Premi `1`, `2` e `3` nella console; l’URL di un’app reale cambierebbe a ogni pressione.

<!-- s:53af99b059 -->
Tornare indietro

<!-- s:d77cce0a86 -->
`useRouter()` gestisce la navigazione dal codice. Associa `Backspace` a `router.back()` nel layout:

<!-- s:c2b3ba00ff -->
Segmenti dinamici

<!-- s:6a1dcfdf25 -->
Le cartelle `[id]` ricevono il proprio valore in `params`:

<!-- s:8294e77b63 -->
Su un host statico, i segmenti dinamici come questo richiedono una riscrittura verso `index.html`. Il capitolo 10 tratta questo argomento.
