<!-- s:674f346b70 -->
Les hooks relient les composants aux entrées, au focus et à la zone d’affichage.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Champ | Description |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Texte produit par la touche |
| `ctrl` `meta` `shift` `alt` | Modificateurs |
| `stopPropagation()` | Arrêter les gestionnaires de priorité inférieure |

<!-- s:0764796164 -->
Les raccourcis du navigateur comme `⌘⌥J` et `⌘R` restent toujours actifs.

<!-- s:550c6a7dd5 -->
`usePaste` et `useWheel` acceptent les mêmes options. `ambient` n’a aucun effet sur `useWheel`.

<!-- s:9248f9b147 -->
| Option | Description |
| :-- | :-- |
| `isActive` | `false` désactive le gestionnaire sans le démonter (par défaut `true`) |
| `priority` | Les priorités les plus élevées s’exécutent en premier (par défaut `0`). Les composants ayant le focus utilisent `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Continuer à recevoir les entrées lorsqu’un `<Modal>` extérieur à ce composant est ouvert (par défaut `false`) |
| `ambient` | Ne pas prendre en compte ce gestionnaire pour l’[indication de focus](#usepagefocus) (par défaut `false`) |

<!-- s:e4e842287a -->
Le raccourci du Dev Overlay (`F2` ou `` Ctrl+` ``) est ambiant, donc une page sans autre entrée clavier n’affiche pas l’indication.

<!-- s:617ae1bfe8 -->
`usePaste` et `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (expérimental)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` exporte `useKeyState` pour suivre les touches physiques maintenues enfoncées via `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Interroger `keys.isDown(code)` ou lire `keys.pressed` ne déclenche pas de nouveaux rendus React. Passez une fonction de rappel pour réagir aux appuis et aux relâchements des touches au moment où ils se produisent.

<!-- s:d9e1465ae0 -->
Les touches maintenues enfoncées sont automatiquement relâchées lorsque la page perd le focus. Consultez [Changements incompatibles](/docs/support-policy#breaking-changes) pour connaître les règles de versionnement des exports expérimentaux.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` indique si la page a le focus. Les frappes clavier n’atteignent l’application que lorsque c’est le cas. Cette valeur est identique à `useViewport().focused`, mais le hook ne déclenche un nouveau rendu que lorsque le focus change.

<!-- s:e1075d4220 -->
Lorsque la page n’a pas le focus et que l’application possède un gestionnaire `useInput` ou `usePaste`, un hook `useKeyState` ou une cible de focus accessible avec Tab, la dernière ligne de la frame de console devient une barre ambrée indiquant « Cliquez sur la page pour utiliser le clavier ». Les gestionnaires marqués [`ambient`](#useinput) ne sont pas pris en compte. L’indication n’apparaît ni dans un terminal, ni dans les tests, ni dans les miroirs intégrés. Chaque fois que l’indication apparaît, elle clignote pendant environ 6 secondes, sauf si le paramètre système de réduction des animations est activé. Pour décider vous-même quand elle s’affiche, définissez `focusHint: false` dans `text.config.ts` ou `createConsoleRoot` et affichez `<FocusHint>` :

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
Le REPL `window.text`

<!-- s:420cc7f125 -->
Chaque application ajoute des fonctions utilitaires à `window.text`. Saisissez-les dans l’invite de DevTools.
