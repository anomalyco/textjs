<!-- s:cf6b8fc694 -->
Jusqu’ici, une application Text.js gérait les touches dans `useInput` et les listait une seconde fois, à la main, dans un pied de page `<KeyHint>`. `useKeymap` remplace les deux par une seule déclaration.

<!-- s:8ec88859eb -->
Appuyer sur `j` exécute `next`. Sur macOS, `<KeyHints>` affiche `j/↓ Next` et `⌃S Save` dans le pied de page, car ces associations définissent `hint`. `?` ouvre un écran d’aide avec les quatre associations, regroupées sous Navigation, et `Ctrl+K` ouvre une palette pour y effectuer des recherches.

<!-- s:c7c1123a0d -->
Syntaxe des touches

<!-- s:e9843726ad -->
| Syntaxe | Signification |
| :-- | :-- |
| `ctrl+k` | Modificateurs : `ctrl`, `alt`, `shift`, `meta` et `mod` |
| `mod+k` | `⌘` ou `Ctrl`, selon la touche maintenue |
| `j, down` | Alternatives |
| `g g` | Une séquence, avec au plus 1 seconde entre les touches |
| `G` | Une majuscule implique `Shift` |
| `?` | Les touches imprimables correspondent au caractère |

<!-- s:5d4b81956d -->
Une association est un gestionnaire ou un objet avec `label`, `group`, `hint`, `command`, `disabled` et `noRepeat`. `command: false` exclut de la palette une association dotée d’un libellé. Les associations sans libellé fonctionnent, mais restent absentes de l’écran d’aide et de la palette.

<!-- s:7beff5bd29 -->
Routage

<!-- s:5f000bf949 -->
Chaque keymap enregistre un gestionnaire `useInput`, les règles de saisie existantes s’appliquent donc. Un `<Input>` ayant le focus traite les touches en premier, car les éditeurs écoutent à la priorité 10 et les keymaps à la priorité 0. Une touche reconnue arrête la propagation. Un `<Modal>` ouvert désactive les associations à l’extérieur, sauf si le keymap transmet `global: true`.

<!-- s:a6076c8127 -->
Les séquences sont reconnues dans ce gestionnaire. Une touche qui commence une séquence est mise en attente et arrête la propagation, et la séquence est réinitialisée lorsque la touche suivante arrive après un délai supérieur à `sequenceTimeout` (1000 ms par défaut) :

<!-- s:aa0a9c8615 -->
Un registre par racine

<!-- s:8a689d7ce6 -->
Les associations dotées d’un libellé sont publiées dans un registre appartenant à la racine de la console. `<KeyHelp>`, `<KeyHints>` et `<CommandPalette>` le consultent, et vos propres composants peuvent aussi le faire via `useKeymapBindings()`. Tant qu’une fenêtre modale est ouverte, le registre ne renvoie que les associations qu’elle contient, pour que l’écran d’aide liste les touches utilisables à cet instant.

<!-- s:ab5f364d60 -->
Les keymaps sont généralement écrits en ligne, ce qui crée un nouvel objet à chaque rendu. Pour limiter ce coût, un keymap ne republie ses libellés que lorsque leur forme visible change :

<!-- s:fa6b5ba7b8 -->
Les gestionnaires sont lus depuis une ref lorsqu’une touche arrive, de sorte qu’une nouvelle fermeture à chaque rendu n’est jamais obsolète.

<!-- s:1b173acf33 -->
L’écran d’aide et la palette

<!-- s:15201cd425 -->
`<KeyHelp>` s’ouvre avec `?` et liste par groupe toutes les associations actives dotées d’un libellé. `keys` et `title` modifient le déclencheur et le titre.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` s’ouvre avec `Ctrl+K` ou `Ctrl+P`. La recherche approximative porte sur vos `commands` et toutes les associations dotées d’un libellé, et met en évidence les lettres correspondantes. La palette se ferme avant d’exécuter une commande, pour qu’une commande puisse ouvrir sa propre fenêtre modale.

<!-- s:bea7ebdffb -->
`formatKeys` met en forme une association pour l’affichage. `formatKeys("ctrl+shift+p")` renvoie `⌃⇧P` sur macOS et `ctrl+shift+P` ailleurs, et `<Kbd>` affiche une touche unique avec la même mise en forme.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` et `<CommandPalette>` sont inclus dans Text.js 1.0. La référence se trouve dans [Clavier](/docs/keyboard).
