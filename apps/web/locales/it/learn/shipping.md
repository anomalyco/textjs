<!-- s:09c9709272 -->
`text build` produce un client statico e, se hai route handler, un server per `text start`.

<!-- s:b09ff23eb8 -->
Build

<!-- s:34d9f1bf54 -->
`text start` serve la build ed esegue i tuoi route handler. Funziona su qualsiasi host con Bun 1.2+ o Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Imposta il titolo della scheda del browser nel layout radice. Le pagine possono sovrascriverlo.

<!-- s:0467501ecc -->
Hosting statico

<!-- s:f5f06a38ae -->
Senza route handler, la build è un normale sito statico. Ogni route statica ha il proprio file HTML. Le route dinamiche come `/deployments/[id]` sono servite da `index.html`.

<!-- s:c33282e322 -->
Su Vercel e Cloudflare Pages, `text build` rileva la piattaforma e scrive autonomamente quel fallback. Gli altri host statici richiedono una regola di riscrittura. Su Netlify, aggiungi un file `_redirects` a `public/`:

<!-- s:ec502dd4e6 -->
Netlify serve i file esistenti prima di applicare la regola, quindi le risorse e le route con pre-rendering restano invariate.

<!-- s:0b1dc034aa -->
Prima del deploy

<!-- s:463de18e39 -->
- Disattiva **Mantieni il log** nelle impostazioni della console. Anche i tuoi utenti devono disattivarlo.
- Prova dimensioni ridotte come 80×24. DevTools ancorato lateralmente produce una griglia stretta.
- Esegui `bun test`.

<!-- s:c5fa27231d -->
Premi `Enter` nella console per fare il deploy. Poi ritira il tuo certificato.
