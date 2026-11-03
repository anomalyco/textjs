<!-- s:f9337b40e7 -->
Text.js enthält Hooks für Timer, Animation, Messung und Persistenz. Timer und Animationen folgen dem Frame-Takt des Renderers.

<!-- s:43bb49a7a4 -->
Timer

<!-- s:15335858dd -->
Beide rufen immer den neuesten Callback auf. `null` stoppt sie.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` tickt einmal pro Frame-Zeitfenster. Text.js gibt etwa 15 Frames pro Sekunde aus, daher verbrauchen schnellere Animationen CPU-Zeit für Frames, die nie in der Konsole landen. Schleifen teilen sich einen Timer pro Taktrate und stoppen, solange die Ausgabe pausiert.

<!-- s:faffc1716f -->
`useTween` und `useSpring`

<!-- s:e1a9665d36 -->
Beide geben eine Zahl zurück, die sich animiert dem Zielwert nähert, und hören auf zu ticken, sobald sie zur Ruhe kommen. `easings` enthält `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` und weitere.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Das Layout läuft nach dem React-Commit, daher stehen Größen einen Frame später bereit. Nur wenn sich die Größe ändert, wird erneut gerendert.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Spalten |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Breakpoints sind in Spalten angegeben. Übergib eigene Schwellenwerte als Argument.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` speichert JSON in `localStorage` und außerhalb des Browsers im Arbeitsspeicher. Hooks mit demselben Schlüssel bleiben synchron, auch über Tabs hinweg.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` ist eine unsichtbare Fokusgrenze. Mit `trap` bleiben `Tab` und `useInput` innerhalb dieser Grenze, genau wie bei einem `<Modal>` ohne Overlay.
