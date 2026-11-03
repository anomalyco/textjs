<!-- s:f9337b40e7 -->
Text.js inclut des hooks pour les temporisateurs, l’animation, la mesure et la persistance. Les temporisateurs et les animations suivent la cadence des frames du moteur de rendu.

<!-- s:43bb49a7a4 -->
Temporisateurs

<!-- s:15335858dd -->
Tous deux appellent toujours la fonction de rappel la plus récente. `null` les arrête.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` s’exécute une fois par créneau de frame. Text.js émet environ 15 frames par seconde, donc animer plus vite consomme du CPU pour des frames qui ne sont jamais affichées dans la console. Les boucles partagent un temporisateur par fréquence et s’arrêtent lorsque la sortie est en pause.

<!-- s:faffc1716f -->
`useTween` et `useSpring`

<!-- s:e1a9665d36 -->
Tous deux renvoient un nombre qui évolue vers la cible et cessent de s’exécuter une fois stabilisés. `easings` contient `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` et d’autres fonctions.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
Le calcul du layout s’exécute après la phase de commit de React, donc les dimensions arrivent une frame plus tard. Il ne déclenche un nouveau rendu que lorsque les dimensions changent.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Colonnes |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Les points de rupture s’expriment en colonnes. Passez vos propres seuils en argument.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` stocke du JSON dans `localStorage`, et en mémoire hors du navigateur. Les hooks qui partagent une clé restent synchronisés, y compris entre les onglets.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` est une limite de focus invisible. Avec `trap`, `Tab` et `useInput` restent à l’intérieur, exactement comme dans un `<Modal>` sans la surcouche.
