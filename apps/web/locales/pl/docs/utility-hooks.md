<!-- s:f9337b40e7 -->
Text.js zawiera hooki do timerów, animacji, pomiarów i trwałego przechowywania danych. Timery i animacje działają zgodnie z rytmem klatek renderera.

<!-- s:43bb49a7a4 -->
Timery

<!-- s:15335858dd -->
Oba zawsze wywołują najnowszą funkcję zwrotną. `null` je zatrzymuje.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
Hook `useAnimationFrame` wywołuje funkcję raz na przedział czasowy klatki. Text.js emituje około 15 klatek na sekundę, więc szybsza animacja zużywa CPU na klatki, które nigdy nie trafiają do konsoli. Pętle o tej samej częstotliwości współdzielą jeden timer i zatrzymują się, gdy wyjście jest wstrzymane.

<!-- s:faffc1716f -->
`useTween` i `useSpring`

<!-- s:e1a9665d36 -->
Oba zwracają liczbę, która zmienia się w kierunku wartości docelowej, i przestają aktualizować ją po ustabilizowaniu. `easings` zawiera `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` i inne funkcje.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Layout jest obliczany po zatwierdzeniu zmian przez React, więc wymiary są dostępne o jedną klatkę później. Ponowne renderowanie następuje tylko wtedy, gdy zmienia się rozmiar.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Kolumny |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Progi są wyrażone w kolumnach. Przekaż własne progi jako argument.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
Hook `useLocalStorage` przechowuje JSON w `localStorage`, a poza przeglądarką w pamięci. Hooki współdzielące klucz pozostają zsynchronizowane, również między kartami.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` to niewidoczna granica fokusu. Z włączonym `trap` klawisz `Tab` i hook `useInput` działają tylko w jej obrębie, dokładnie jak w komponencie `<Modal>` bez warstwy nakładki.
