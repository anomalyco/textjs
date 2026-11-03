<!-- s:3bfcfe41ce -->
Dichiara le scorciatoie una volta con `useKeymap`. Text.js le instrada, le elenca in un pannello in sovrimpressione `?`, le mostra nel footer e le rende ricercabili in una palette dei comandi.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Sintassi | Significato |
| :-- | :-- |
| `ctrl+k` | Modificatori: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` o `Ctrl`, a seconda di quale tieni premuto |
| `j, down` | Alternative |
| `g g` | Una sequenza (1 secondo tra i tasti) |
| `G` | La maiuscola implica `Shift` |
| `?` | I tasti stampabili corrispondono al carattere |

<!-- s:ef55b4b9de -->
I valori sono un handler oppure un’associazione con `label`, `group`, `hint`, `disabled` e `noRepeat`. Le associazioni senza etichetta funzionano, ma non compaiono nel pannello di aiuto in sovrimpressione.

<!-- s:01f344cdbe -->
`useKeymapBindings()` restituisce le associazioni con etichetta attualmente attive, da usare nei tuoi footer e menu.

<!-- s:dd8af5eb69 -->
Le mappe dei tasti passano attraverso `useInput`, quindi si applicano le regole abituali: gli input con il focus hanno la precedenza, un tasto corrispondente interrompe la propagazione e un `<Modal>` aperto disabilita le associazioni al di fuori di esso. Passa `{ priority, global, isActive }` per cambiare questo comportamento.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Premi `?` per vedere tutte le associazioni con etichetta, suddivise in gruppi. Elenca quelle attive nel contesto in cui è stato aperto.

<!-- s:3cebb95bfc -->
`<KeyHints>` e `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` mostra le associazioni contrassegnate con `hint: true` oppure gli `items` espliciti. `<StatusBar>` è un footer di una riga con uno slot `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` visualizza un singolo tasto. `formatKeys("ctrl+shift+p")` restituisce `⌃⇧P` su macOS e `ctrl+shift+P` altrove.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (o `Ctrl+P`) apre un selettore con ricerca approssimata tra i tuoi comandi e tutte le associazioni con etichetta, con le lettere corrispondenti evidenziate.

<!-- s:e88bab4eab -->
| Prop | Descrizione |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Scorciatoia di apertura (predefinita `ctrl+k, ctrl+p`; `null` per disabilitarla) |
| `includeKeymap` | Elenco delle associazioni della mappa dei tasti (predefinito `true`) |
| `open` / `onOpenChange` | Controllato |

<!-- s:ddd093fe85 -->
La palette si chiude prima di eseguire un comando, quindi i comandi possono aprire le proprie finestre modali. `fuzzyMatch` e `fuzzyFilter` sono esportati per le tue liste.
