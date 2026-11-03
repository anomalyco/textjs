<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (ou `@textjs/react/testing`) effectue le rendu de votre application hors écran, simule des appuis sur les touches et renvoie la frame sous forme de texte. Les tests s’exécutent sans navigateur ni DevTools.

<!-- s:9bc71b1ad2 -->
Cela fonctionne avec tout exécuteur prenant en charge les tests `async`, notamment Bun, Vitest et Jest.

<!-- s:f7898e6b92 -->
Rendu

<!-- s:fc969a7928 -->
| Méthode | Description |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Montage hors écran (80×24 par défaut) |
| `lastFrame()` | Frame en texte brut |
| `lines()` | Frame sous forme de tableau de lignes |
| `frames` | Ensemble des frames distinctes jusqu’ici |
| `toAnsi()` | ANSI en couleurs vraies, pour les instantanés |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` de la première correspondance |
| `rerender(el)` / `unmount()` | Mise à jour ou démontage |

<!-- s:893f22353a -->
`renderToString(el, options)` effectue un seul rendu et renvoie le texte.

<!-- s:99a3c4d459 -->
Entrées

<!-- s:105149560b -->
Chaque appel s’exécute dans `act()` et traite les frames qui en résultent, pour que l’assertion suivante voie la mise à jour.

<!-- s:1f65c071dc -->
Temps

<!-- s:ab365d9403 -->
Les animations, les indicateurs de chargement et les notifications utilisent des temporisateurs réels, donc `wait` et `waitFor` constituent le moyen fiable de les observer.

<!-- s:26f93acae3 -->
Instantanés

<!-- s:05724c9883 -->
Les espaces en fin de ligne et les lignes vides en bas des frames sont supprimés, ce qui évite les changements d’instantanés dus aux espaces.
