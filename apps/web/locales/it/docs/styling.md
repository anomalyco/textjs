<!-- s:581711536b -->
Definisci lo stile dei componenti con le utility di `className` o con prop tipizzate. Le app Text.js non hanno fogli di stile.

<!-- s:e0ac1db626 -->
Utility

<!-- s:2de571e2bf -->
`className` accetta utility in stile Tailwind. Un’unità corrisponde a una cella.

<!-- s:785b2c3db0 -->
| Categoria | Esempi |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Spaziatura | `p-1` `px-2` `mt-1` |
| Bordi | `border` `rounded` `border-accent` |
| Colore | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Prop tipizzate

<!-- s:4963259a42 -->
Ogni utility ha una prop. Le prop hanno la precedenza su `className`.

<!-- s:15a3834a24 -->
Colori

<!-- s:d333dad27a -->
Usa valori esadecimali, nomi Tailwind o token del tema come `fg`, `muted`, `surface`, `accent`, `success` e `danger`. I token seguono il tema attivo.

<!-- s:087abce968 -->
Temi

<!-- s:abba2a3188 -->
Sono inclusi cinque preset: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` e `amberCrt`.

<!-- s:5dc490305b -->
Viewport adattivi

<!-- s:419fb844db -->
Per impostazione predefinita, le app riempiono la console DevTools ancorata (`viewport.responsive`) e si ridimensionano quando trascini il pannello. Organizza il layout con flex e leggi le dimensioni quando ti servono:

<!-- s:3d847eadf9 -->
La pagina può vedere solo un pannello ancorato. I DevTools non ancorati, lo zoom dei DevTools e la barra laterale di «Console» sono invisibili alla pagina, quindi l’app usa `viewport.width × viewport.height` (valore predefinito `120×36`) o le dimensioni che fissi:
