<!-- s:dd02562b57 -->
`@textjs/font` analizza i file FIGfont 2 (`.flf`) e li dispone esattamente come il programma `figlet`. Ogni font è un modulo ES, quindi vengono distribuiti solo i font che importi.

<!-- s:a15d12503b -->
Installazione

<!-- s:63bfd61a05 -->
Utilizzo

<!-- s:fdffc4b786 -->
`<FigletText>` accetta un font e una stringa. Le righe si misurano in celle, quindi i caratteri si inseriscono nei layout flexbox come qualsiasi altro `<Text>`.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) accetta gli stessi font, mantenendo i suoi stili integrati `block` e `compact`:

<!-- s:9fc6ab3e8b -->
Al di fuori di React, `renderFiglet` restituisce una stringa per riga:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Il layout orizzontale segue i flag di FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Effetto |
| :-- | :-- | :-- |
| `"default"` | `-s` | Il layout del font, solitamente con fusione dei caratteri |
| `"full"` | `-W` | Larghezza piena; i caratteri non si toccano mai |
| `"fitted"` | `-k` | Crenatura; i caratteri si avvicinano fino a toccarsi |
| `"smushed"` | `-S` | Fusione secondo le regole del font, anche per i font con crenatura |
| `"universal"` | `-o` | I caratteri successivi si sovrappongono ai precedenti |
| `0`–`63` | `-m` | Modalità di fusione esplicita |

<!-- s:d9f3601792 -->
Sono implementate tutte e sei le regole di fusione orizzontale: carattere uguale, trattino basso, gerarchia, coppia opposta, X grande e hardblank.

<!-- s:889b1e19ef -->
`verticalLayout` si applica al testo su più righe. FIGlet 2.2.5 non avvicina mai le righe, quindi il valore predefinito è `"full"`; `"fitted"`, `"smushed"` e `"universal"` implementano le cinque regole verticali, inclusa la superfusione delle linee verticali, e `"default"` usa quelle del font.

<!-- s:d4ec30b173 -->
A capo e allineamento

<!-- s:f799453d05 -->
`columns` (o `width` in `renderFiglet`) manda a capo tra le parole, poi all’interno delle parole, esattamente dove lo farebbe `figlet -w`. `align` può essere `"left"`, `"center"` o `"right"`; senza una larghezza, le righe si allineano entro la larghezza della riga più lunga. I font da destra a sinistra come `ivrit` stampano da destra a sinistra e si allineano a destra; usa `direction` per modificare questo comportamento.

<!-- s:f8ccfce091 -->
Font inclusi

<!-- s:15e0b8eca7 -->
| Import | Righe | Note |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Predefinito di FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Inclinato |
| `@textjs/font/small` | 5 | Compatto |
| `@textjs/font/big` | 8 | Include il greco |
| `@textjs/font/banner` | 8 | Caratteri disegnati con `#`, katakana e cirillico |
| `@textjs/font/block`, `lean` | 8 | Contorno, diritto e inclinato |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Ombra esterna |
| `@textjs/font/script`, `smscript` | 7, 5 | Corsivo calligrafico |
| `@textjs/font/mini` | 4 | Minuscolo |
| `@textjs/font/bubble`, `digital` | 4, 3 | Lettere in cerchi e riquadri |
| `@textjs/font/ivrit` | 6 | Ebraico, da destra a sinistra |
| `@textjs/font/term` | 1 | Input invariato |

<!-- s:a8ecd7e9c1 -->
Ogni glifo usa caratteri ASCII stampabili o Latin-1, quindi ogni sottocarattere occupa esattamente una cella nel Menlo di DevTools. `@textjs/font/all` li esporta tutti, insieme a `BUNDLED_FONTS` per le gallerie. I font vengono analizzati al primo rendering, non all’importazione.

<!-- s:74ff0f95fa -->
Font personalizzati

<!-- s:093892bc6a -->
Qualsiasi FIGfont funziona. Scaricalo, poi analizzalo:

<!-- s:c2f4ef471e -->
Il parser legge l’intestazione, le righe di commento, gli hardblank, i marcatori di fine, i 102 caratteri obbligatori e i caratteri contrassegnati da codici decimali, ottali o esadecimali. I font TOIlet `.tlf` vengono visualizzati come testo semplice. Preferisci font disegnati con caratteri ASCII o caratteri per disegnare riquadri; braille ed emoji non occupano una sola cella in Menlo.

<!-- s:f64649f401 -->
Licenze

<!-- s:adad99f0de -->
I font inclusi sono quelli della distribuzione FIGlet 2.2.5, byte per byte, sotto la licenza BSD a 3 clausole di FIGlet. Ciascuno conserva i propri crediti nelle righe di commento, disponibili a runtime come `font.comment`. I font popolari senza un’autorizzazione alla ridistribuzione, come Doom, Larry 3D, ANSI Shadow e Calvin S, non sono inclusi.

<!-- s:2a50d4cddc -->
Verifica con `figlet`

<!-- s:111c132fa2 -->
La suite di test riproduce 273 output registrati dal vero binario `figlet` 2.2.5: ogni font incluso in ogni modalità di layout, a capo, giustificazione, testo da destra a sinistra, modalità paragrafo e l’input di regressione di FIGlet stesso. Tutti corrispondono esattamente.
