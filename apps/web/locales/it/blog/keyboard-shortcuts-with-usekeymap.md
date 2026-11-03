<!-- s:cf6b8fc694 -->
Finora, un’app Text.js gestiva i tasti in `useInput` e li elencava una seconda volta, a mano, in un piè di pagina `<KeyHint>`. `useKeymap` sostituisce entrambi con un’unica dichiarazione.

<!-- s:8ec88859eb -->
Premere `j` esegue `next`. Su macOS, `<KeyHints>` mostra `j/↓ Next` e `⌃S Save` nel piè di pagina, perché quelle associazioni impostano `hint`. `?` apre una schermata di aiuto con tutte e quattro, raggruppate sotto Navigation, e `Ctrl+K` apre una palette in cui puoi cercarle.

<!-- s:c7c1123a0d -->
Sintassi dei tasti

<!-- s:e9843726ad -->
| Sintassi | Significato |
| :-- | :-- |
| `ctrl+k` | Modificatori: `ctrl`, `alt`, `shift`, `meta` e `mod` |
| `mod+k` | `⌘` o `Ctrl`, a seconda di quale tieni premuto |
| `j, down` | Alternative |
| `g g` | Una sequenza, con un massimo di 1 secondo tra i tasti |
| `G` | La maiuscola implica `Shift` |
| `?` | I tasti stampabili corrispondono al carattere |

<!-- s:5d4b81956d -->
Un’associazione è un handler oppure un oggetto con `label`, `group`, `hint`, `command`, `disabled` e `noRepeat`. `command: false` esclude dalla palette un’associazione con etichetta. Le associazioni senza etichetta funzionano, ma restano fuori dalla schermata di aiuto e dalla palette.

<!-- s:7beff5bd29 -->
Instradamento

<!-- s:5f000bf949 -->
Ogni mappa dei tasti registra un handler `useInput`, quindi si applicano le regole di input esistenti. Un `<Input>` con il focus gestisce i tasti per primo, perché gli editor ascoltano con priorità 10 e le mappe dei tasti con priorità 0. Un tasto che trova corrispondenza interrompe la propagazione. Un `<Modal>` aperto disabilita le associazioni al di fuori di esso, a meno che la mappa dei tasti non passi `global: true`.

<!-- s:a6076c8127 -->
Le sequenze vengono riconosciute all’interno di quell’handler. Un tasto che avvia una sequenza resta in attesa e interrompe la propagazione, e la sequenza si azzera quando il tasto successivo arriva dopo più di `sequenceTimeout` (1000 ms per impostazione predefinita):

<!-- s:aa0a9c8615 -->
Un registro per ogni radice

<!-- s:8a689d7ce6 -->
Le associazioni con etichetta sono pubblicate in un registro che appartiene alla radice della console. `<KeyHelp>`, `<KeyHints>` e `<CommandPalette>` lo leggono, e anche i tuoi componenti possono farlo tramite `useKeymapBindings()`. Quando una finestra modale è aperta, il registro restituisce solo le associazioni al suo interno, così la schermata di aiuto elenca i tasti che funzionano in quel momento.

<!-- s:ab5f364d60 -->
Le mappe dei tasti sono solitamente scritte inline, creando un nuovo oggetto a ogni rendering. Per limitarne il costo, una mappa dei tasti ripubblica le proprie etichette solo quando cambia la loro forma visibile:

<!-- s:fa6b5ba7b8 -->
Gli handler vengono letti da un ref quando arriva un tasto, quindi una nuova closure a ogni rendering non è mai obsoleta.

<!-- s:1b173acf33 -->
La schermata di aiuto e la palette

<!-- s:15201cd425 -->
`<KeyHelp>` si apre con `?` ed elenca per gruppo ogni associazione attiva con etichetta. `keys` e `title` cambiano il tasto di attivazione e il titolo.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` si apre con `Ctrl+K` o `Ctrl+P`. Esegue una ricerca per corrispondenza approssimata tra i tuoi `commands` e tutte le associazioni con etichetta, ed evidenzia le lettere corrispondenti. Si chiude prima di eseguire un comando, così un comando può aprire una propria finestra modale.

<!-- s:bea7ebdffb -->
`formatKeys` formatta un’associazione per la visualizzazione. `formatKeys("ctrl+shift+p")` restituisce `⌃⇧P` su macOS e `ctrl+shift+P` altrove, e `<Kbd>` visualizza un singolo tasto con la stessa formattazione.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` e `<CommandPalette>` sono inclusi in Text.js 1.0. La documentazione di riferimento si trova in [Tastiera](/docs/keyboard).
