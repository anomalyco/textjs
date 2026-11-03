<!-- s:8f99ab8d5a -->
I grafici sono disegnati con elementi a blocchi. Le barre usano otto livelli per cella e le linee usano una griglia di punti 2×2 per cella.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Grafici a linee a matrice di punti con asse y e legenda.

<!-- s:977778a73f -->
| Prop | Descrizione |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Forma abbreviata per una serie |
| `height` | Righe (valore predefinito `8`) |
| `min` / `max` | Limiti fissi (valore predefinito: i dati) |
| `axis` | Asse y con etichette min / max |
| `formatValue` | Etichette dell’asse (valore predefinito `1.2k`) |
| `marker` | `quadrant` (predefinito) o `braille` |

<!-- s:3827b070cb -->
`braille` racchiude 2×4 punti per cella. Usalo nei terminali: Menlo, il font della console DevTools su macOS, non include il braille e i glifi di ripiego sono più larghi di una cella.

<!-- s:a1d8752203 -->
I colori predefiniti delle serie sono `accent`, `success`, `warning`, `info` e `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Barre orizzontali con etichette e valori allineati, con una precisione di un ottavo di cella.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Riempie la propria larghezza con i punti più recenti. `height` maggiore di `1` disegna un’area piena.

<!-- s:9b515e6ed1 -->
`sparkline(values)` restituisce la stessa sparkline come stringa.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Descrizione |
| :-- | :-- |
| `value` / `max` | Avanzamento (omettere per uno stato indeterminato) |
| `variant` | `block` (continuo) `line` `thin` |
| `width` | Celle (valore predefinito: riempimento) |
| `label` | Testo iniziale |
| `formatValue` | Testo finale (valore predefinito `42%`) |

<!-- s:39c076d22f -->
Le barre indeterminate scorrono al ritmo dei frame del renderer e si fermano quando l’output è in pausa.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolazione del colore per cella. Le stringhe su più righe condividono un unico gradiente, quindi si abbina a `<AsciiFont>`.

<!-- s:99155d62a4 -->
Gradienti con nome: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Le console di Chromium e Firefox disegnano l’immagine come uno sprite di pixel. La pixel art (256 colori o meno, senza pixel parzialmente trasparenti) mantiene fino a 8 × 16 pixel per cella e le foto fino a 4 × 8. Safari, i terminali, le copie in testo semplice e le pagine con [`runtime = "server"`](/docs/server-rendering) usano mezzi blocchi `▀`: ogni cella contiene due pixel, quello superiore in primo piano e quello inferiore sullo sfondo. Passa `renderMode="halfblock"` per disegnare mezzi blocchi ovunque, come faceva `<Image>` nella versione 1.3.

<!-- s:70bb4fc454 -->
| Prop | Descrizione |
| :-- | :-- |
| `src` | URL dell’immagine (solo browser) |
| `pixels` | RGBA grezzo come `{ width, height, data }`, 4 byte per pixel in ordine di riga |
| `width` / `height` | Larghezza in celle, altezza in righe. Passane una per mantenere le proporzioni, o nessuna per 1 × 2 pixel per cella (`src` ridimensiona fino a un massimo di 256 × 256 px) |
| `fit` | `contain` (predefinito), `cover` o `fill` |
| `alt` | Testo mostrato durante il caricamento di `src` o se il caricamento fallisce |
| `renderMode` | `auto` (predefinito: sprite dove supportato, mezzi blocchi `▀` altrove) o `halfblock` |

<!-- s:c106665c64 -->
`<Image>` accetta anche prop di layout.

<!-- s:20dac26bff -->
`src` carica tramite un canvas, quindi le immagini cross-origin richiedono CORS. `pixels` accetta RGBA grezzo ovunque, incluso il terminale.

<!-- s:4e3b06ef0e -->
Un’immagine viene disegnata con mezzi blocchi anche in Chromium e Firefox quando non può essere un unico sprite:

<!-- s:00d2e660eb -->
- Due immagini affiancate sulle stesse righe, come in una galleria.
- Una foto con testo accanto. La pixel art accanto al testo rimane uno sprite.
- Un’immagine ritagliata da un riquadro `overflow="hidden"` o parzialmente coperta da un altro riquadro.
- Pixel trasparenti sopra il testo o sopra più di un colore di sfondo.

<!-- s:dd4fefaac0 -->
`<Pixels>` (sperimentale)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` esporta `<Pixels>` per framebuffer `0xRRGGBBAA` aggiornati in tempo reale, come giochi, emulatori e video. Scrivi i pixel compattati direttamente in `source.data` e incrementa `frame` per ridisegnare.

<!-- s:2d12b69e81 -->
| Prop | Descrizione |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` in ordine `0xRRGGBBAA` |
| `frame` | Contatore dei frame; incrementare dopo aver modificato `source.data` |
| `width` / `height` | Dimensioni del riquadro in celle e righe |
| `fit` | `contain` (predefinito) o `fill` |
| `pixelAspect` | Larghezza visualizzata divisa per l’altezza di un pixel sorgente (valore predefinito `1`) |
| `palette` | Tavolozza `PackedColor[]` facoltativa rispetto alla quale quantizzare i colori |
| `sample` | Filtro di ripiego per i mezzi blocchi: `nearest` (predefinito) o `average` |
| `renderMode` | `auto` (predefinito: sprite dove supportato, mezzi blocchi `▀` altrove) o `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` disegna uno sprite pixelato in Chromium e in Firefox secondo le regole di stile della sua console (senza benchmark), e ripiega sui mezzi blocchi `▀` in Safari, nei terminali, nelle copie in testo semplice e nelle pagine con [`runtime = "server"`](/docs/server-rendering). Passa `renderMode="halfblock"` per disegnare mezzi blocchi ovunque.

<!-- s:5d2bbbc47b -->
Per disegnare pixel senza React, importa `drawPixels` da `@textjs/core/experimental` insieme a `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` e `PixelRect`. La sua opzione `encoding: "rgba"` mantiene più di 256 colori e trasparenza graduale per le immagini statiche, e `fallback` disegna le tue celle dove non è possibile mostrare lo sprite. Consulta [Modifiche incompatibili](/docs/support-policy#breaking-changes) per sapere come vengono assegnate le versioni alle esportazioni sperimentali.
