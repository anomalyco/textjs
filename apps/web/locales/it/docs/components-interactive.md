<!-- s:06b0e11de4 -->
Questi campi di input si controllano con la tastiera e gestiscono il proprio focus.

<!-- s:1d0d345c65 -->
Focus

<!-- s:bc06482880 -->
`Tab` e `Shift+Tab` spostano il focus ciclicamente. `autoFocus` acquisisce il focus al montaggio.

<!-- s:fca23dd943 -->
Gli editor con il focus intercettano i propri tasti, quindi digitare `1` non attiva mai una scorciatoia globale.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Campo di input a riga singola con modifica in stile readline.

<!-- s:88cdcfc0ea -->
| Prop | Descrizione |
| :-- | :-- |
| `value` / `onChange` | Valore controllato |
| `onSubmit` | Chiamata alla pressione di `Enter` |
| `placeholder` | Testo mostrato quando il campo è vuoto |
| `mask` | Carattere di mascheramento per i dati segreti |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Editor di testo su più righe. `Enter` invia, `Shift+Enter` aggiunge una nuova riga.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Un elenco di opzioni controllato da tastiera con ricerca fuzzy opzionale.

<!-- s:70fe7d6c9b -->
| Prop | Descrizione |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Chiamata alla pressione di `Enter` |
| `searchable` | Filtro delle opzioni durante la digitazione |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Cursore senza focus

<!-- s:f0552feed5 -->
Quando la pagina perde il focus, i cursori si bloccano e i frame si fermano, così puoi selezionare e copiare il testo della console.
