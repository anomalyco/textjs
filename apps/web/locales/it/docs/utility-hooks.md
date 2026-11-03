<!-- s:f9337b40e7 -->
Text.js include hook per timer, animazione, misurazione e persistenza. I timer e le animazioni seguono la cadenza dei frame del renderer.

<!-- s:43bb49a7a4 -->
Timer

<!-- s:15335858dd -->
Entrambi chiamano sempre la callback più recente. `null` li arresta.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` si attiva una volta per intervallo di frame. Text.js emette circa 15 frame al secondo, quindi animare più velocemente consuma CPU per frame che non vengono mai scritti nella console. I cicli condividono un timer per ogni frequenza e si fermano quando l’output è in pausa.

<!-- s:faffc1716f -->
`useTween` e `useSpring`

<!-- s:e1a9665d36 -->
Entrambi restituiscono un numero che si anima verso il valore di destinazione e smettono di aggiornarsi quando si stabilizzano. `easings` contiene `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` e altre funzioni.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Il layout viene calcolato dopo il commit di React, quindi le dimensioni arrivano un frame dopo. Il rendering si ripete solo quando le dimensioni cambiano.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Colonne |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
I breakpoint sono espressi in colonne. Passa le tue soglie come argomento.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` memorizza JSON in `localStorage` e, fuori dal browser, in memoria. Gli hook che condividono una chiave restano sincronizzati, anche tra schede.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` è un confine invisibile per il focus. Con `trap`, `Tab` e `useInput` restano al suo interno, esattamente come in un `<Modal>` senza overlay.
