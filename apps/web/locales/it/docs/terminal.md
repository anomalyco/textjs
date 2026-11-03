<!-- s:e9f791b208 -->
`text run` renderizza un’app App Router in un terminale. Layout, componenti, mappe dei tasti e route handler sono condivisi con il browser. L’output usa ANSI truecolor invece degli span `%c`.

<!-- s:7d8aa376e3 -->
Premi `Ctrl+C` per uscire. `text run` richiede Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importa ogni file in `app/`, monta App Router con una cronologia in memoria e lo disegna a schermo intero. `<Link>`, `useRouter()`, `notFound()` e `redirect()` funzionano senza modifiche.

<!-- s:75b65c161d -->
Le chiamate `fetch("/api/...")` alla stessa origine eseguono gli handler `route.ts` nello stesso processo, esattamente come li servirebbe `text dev`. Gli altri URL passano dalla rete.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Per un singolo componente o per la tua CLI:

<!-- s:e62e62bfaa -->
`useApp().exit()` smonta l’app e ripristina il terminale.

<!-- s:082b75dda7 -->
| Opzione | Descrizione |
| :-- | :-- |
| `stdin` / `stdout` | Valori predefiniti `process.stdin` / `process.stdout` |
| `cols` / `rows` | Dimensioni fisse (predefinito: seguire il terminale) |
| `altScreen` | Ripristino della cronologia di scorrimento all’uscita (predefinito `true`) |
| `mouse` | Scorrimento con la rotella (predefinito `true`) |
| `exitOnCtrlC` | Valore predefinito `true` |
| `fps` | Limite dei frame (predefinito `60`) |
| `patchConsole` | Accumulo di `console.*` fino all’uscita (predefinito `true`) |
| `theme` / `transparent` | Come in `createConsoleRoot` |

<!-- s:e34e364b9c -->
Output

<!-- s:2ac174afda -->
Ogni frame viene confrontato riga per riga con il precedente. Vengono scritte solo le righe modificate, racchiuse in marcatori di output sincronizzato, così i terminali che li supportano non mostrano mai un frame disegnato a metà. Le app inattive non scrivono nulla.

<!-- s:99a3c4d459 -->
Input

<!-- s:4a9817d820 -->
L’input di stdin in modalità raw viene interpretato e convertito negli stessi eventi prodotti dal browser: frecce e tasti funzione con modificatori, combinazioni con `Alt`, incolla delimitato, rotella del mouse SGR e protocollo di tastiera kitty. `TerminalInputParser` e `parseTerminalInput` sono esportati se ti servono altrove.

<!-- s:6b688e229b -->
Differenze

<!-- s:56ed51fed3 -->
| Funzionalità | DevTools | Terminale |
| :-- | :-- | :-- |
| Frequenza dei frame | ~15 fps | Fino a `fps` |
| Dimensioni della griglia | Console ancorata | Finestra del terminale |
| `<Image src>` | Caricamento tramite canvas | Uso di `pixels` |
| `console.log` | I tuoi frame | Accumulo fino all’uscita |
