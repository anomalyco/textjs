<!-- s:07e7af1eca -->
L’App Router associa le cartelle in `app/` agli URL e le mantiene sincronizzate con la barra degli indirizzi e la cronologia del browser.

<!-- s:9c68fe3a82 -->
Pagine

<!-- s:c4bd849316 -->
Esporta un componente come export predefinito da `page.tsx`:

<!-- s:66a6e1dc46 -->
Layout

<!-- s:7d310a5d74 -->
I layout avvolgono le route e mantengono il proprio stato durante la navigazione.

<!-- s:c2b3ba00ff -->
Segmenti dinamici

<!-- s:44ffd1d0a7 -->
Navigazione

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
`<Link>` può ricevere il focus e supporta scorciatoie a tasto singolo.

<!-- s:328e16abd4 -->
| Prop | Descrizione |
| :-- | :-- |
| `href` | Percorso di destinazione |
| `shortcut` | Tasto per seguire il link |
| `replace` | Sostituzione della voce nella cronologia |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Naviga dal codice:

<!-- s:4d9f7f9c5b -->
`usePathname` e `useParams`

<!-- s:2545c9aaa2 -->
Leggi la route corrente:

<!-- s:a5386906c8 -->
Indietro, avanti e link diretti funzionano tutti. Su un host statico, i segmenti dinamici richiedono un fallback a `index.html`. L’adattatore `static` ne scrive uno come `404.html`.
