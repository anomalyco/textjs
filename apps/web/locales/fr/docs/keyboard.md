<!-- s:3bfcfe41ce -->
Déclarez les raccourcis une seule fois avec `useKeymap`. Text.js les achemine, les répertorie dans un panneau superposé `?`, les affiche dans votre pied de page et les rend accessibles par recherche dans une palette de commandes.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Syntaxe | Signification |
| :-- | :-- |
| `ctrl+k` | Modificateurs : `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` ou `Ctrl`, selon la touche maintenue |
| `j, down` | Alternatives |
| `g g` | Une séquence (1 seconde entre les touches) |
| `G` | La majuscule implique `Shift` |
| `?` | Les touches imprimables correspondent au caractère |

<!-- s:ef55b4b9de -->
Les valeurs sont un gestionnaire ou une liaison avec `label`, `group`, `hint`, `disabled` et `noRepeat`. Les liaisons sans libellé fonctionnent, mais ne figurent pas dans le panneau d’aide.

<!-- s:01f344cdbe -->
`useKeymapBindings()` renvoie les liaisons avec libellé actuellement actives, pour vos propres pieds de page et menus.

<!-- s:dd8af5eb69 -->
Les keymaps passent par `useInput`, les règles habituelles s’appliquent donc : les champs de saisie ayant le focus sont prioritaires, une touche reconnue arrête la propagation et un `<Modal>` ouvert désactive les liaisons à l’extérieur. Passez `{ priority, global, isActive }` pour modifier ce comportement.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Appuyez sur `?` pour afficher toutes les liaisons avec libellé, par groupe. Le panneau répertorie les liaisons actives à l’endroit où il a été ouvert.

<!-- s:3cebb95bfc -->
`<KeyHints>` et `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` affiche les liaisons marquées `hint: true`, ou les `items` explicites. `<StatusBar>` est un pied de page d’une ligne avec un emplacement `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` affiche une seule touche. `formatKeys("ctrl+shift+p")` donne `⌃⇧P` sur macOS et `ctrl+shift+P` ailleurs.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (ou `Ctrl+P`) ouvre un lanceur à recherche approximative parmi vos commandes et toutes les liaisons avec libellé, avec les lettres correspondantes en surbrillance.

<!-- s:e88bab4eab -->
| Prop | Description |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Raccourci d’ouverture (par défaut `ctrl+k, ctrl+p` ; `null` pour désactiver) |
| `includeKeymap` | Affichage des liaisons du keymap (par défaut `true`) |
| `open` / `onOpenChange` | Contrôle externe |

<!-- s:ddd093fe85 -->
La palette se ferme avant d’exécuter une commande, les commandes peuvent donc ouvrir leurs propres fenêtres modales. `fuzzyMatch` et `fuzzyFilter` sont exportés pour vos propres listes.
