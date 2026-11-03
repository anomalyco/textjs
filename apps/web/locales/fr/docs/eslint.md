<!-- s:df706c7a4d -->
`eslint-plugin-textjs` détecte les erreurs Text.js dans l’éditeur : balises DOM dans les composants console, boîtes dans le texte, glyphes absents de Menlo, appels `console.log` parasites et exports App Router ignorés sans avertissement.

<!-- s:0ecddf15e1 -->
Installation

<!-- s:5d60a92733 -->
Le plugin prend en charge ESLint 9 et 10 avec une configuration plate. Les règles sont syntaxiques et ne nécessitent ni informations de type ni `parserOptions.project`. Tout analyseur qui comprend TypeScript et JSX convient.

<!-- s:b69abcef52 -->
Configurations

<!-- s:9cfe4adde3 -->
| Configuration | Ce qu’elle active |
| :-- | :-- |
| `textjs.configs.recommended` | Toutes les règles de validité comme erreurs ; les règles de console, de minuterie et de cadence des frames comme avertissements |
| `textjs.configs.strict` | Tout comme erreur, plus `prefer-use-keymap` comme avertissement |

<!-- s:6c9781312c -->
Vous pouvez aussi choisir les règles individuellement :

<!-- s:ec6eb92cf0 -->
Fichiers console

<!-- s:04573fe453 -->
La plupart des règles ne s’appliquent qu’aux fichiers dont le rendu s’effectue dans la console : ceux qui importent un composant ou un hook (`Box`, `Text`, `useInput`, …) depuis `@textjs/app` ou `@textjs/react`. Les fichiers qui importent `react-dom` ou `@textjs/react/dom` sont du code de page et ne sont pas concernés, ce qui permet à un site web de mêler pages DOM et applications console dans un même projet. Importer un utilitaire comme `tokenize` ou `parseMarkdown` ne fait pas d’un fichier un fichier console.

<!-- s:96e9c86b58 -->
Les règles App Router se fondent sur le nom du fichier (`page.tsx`, `layout.tsx`, `route.ts`, …) dans tout répertoire `app/`, y compris `src/app/`. Si le vôtre porte un autre nom, passez `{ appDir: "routes" }` à `valid-route-module`, `valid-metadata` et `route-handler-exports`.

<!-- s:b66542635d -->
Règles

<!-- s:c1b57ad8e2 -->
| Règle | Configuration recommandée | Correction |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | erreur | suggestion |
| [`no-box-in-text`](#no-box-in-text) | erreur | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | erreur | correction automatique, suggestion |
| [`no-console-in-components`](#no-console-in-components) | avertissement | suggestion |
| [`prefer-use-interval`](#prefer-use-interval) | avertissement | suggestion |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | avertissement | |
| [`prefer-use-keymap`](#prefer-use-keymap) | configuration stricte uniquement | |
| [`valid-route-module`](#valid-route-module) | erreur | |
| [`valid-metadata`](#valid-metadata) | erreur | |
| [`route-handler-exports`](#route-handler-exports) | erreur | suggestion |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, les éléments personnalisés et les autres balises DOM n’existent pas dans la console. Le réconciliateur ne connaît que ses propres nœuds hôtes et lève `TX003` pour tout autre élément.

<!-- s:bd7c3e0318 -->
La suggestion remplace la balise par le composant le plus proche (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) et ajoute l’import.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` est une suite de spans stylés ; il ne peut pas contenir de boîte. Imbriquer `<Box>` ou tout composant dont la racine est une boîte (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) lève `TX004` lors du rendu. Cette règle détecte le problème dans l’éditeur, y compris dans `&&`, les expressions ternaires, les fragments et `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js dispose chaque caractère dans une grille de cellules fixes. Les glyphes absents de Menlo, la police de la console DevTools sur macOS, s’affichent dans une police de substitution plus large qu’une cellule, ce qui décale toutes les cellules suivantes.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, les frames classiques des indicateurs de chargement de terminal) : utilisez des caractères de bloc ou de quadrant (`▘▝▗▖`), `<Spinner variant="dots">` ou `marker="quadrant"` sur les graphiques. Définissez `{ allowBraille: true }` pour les applications qui s’exécutent uniquement avec `text run` dans un terminal.
- **Symboles et flèches divers** (U+2B00–U+2BFF, comme le petit carré U+2B1D) : les suggestions proposent l’équivalent Menlo (`·`, `●`, `←`).
- **Présentation emoji des symboles d’une cellule** (`▶` ou `↩` suivi de U+FE0F) : le sélecteur de variante les transforme en emoji de deux cellules alors que la grille n’en réserve qu’une. La correction automatique le supprime.

<!-- s:8c0c49dfb7 -->
Les emoji larges (`🚀`, `✅`) conviennent : Text.js les mesure comme deux cellules.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Chaque frame correspond à un `console.log`. Vos propres journaux s’insèrent entre les frames, disparaissent au défilement provoqué par la suivante et sont masqués par la vue maintenue en bas. `console.clear()` efface l’application elle-même.

<!-- s:0011d5dcff -->
Affichez les messages dans l’interface avec `useToast()` ou un `<ScrollBox>` de journal, ou inspectez l’état dans le Dev Overlay `[▼]` (`` Ctrl+` ``). Avec `logger`, la suggestion remplace `console.warn(…)` par `log.warn(…)`. Les fichiers de test et les rendus `@textjs/app/testing` sont exclus.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Un `setInterval` brut dans un composant nécessite un effet, un nettoyage et une ref pour éviter un état périmé. `useInterval` gère les trois, et `null` l’arrête.

<!-- s:894ec09a45 -->
Pour les animations, `useAnimationFrame` suit la cadence des frames du moteur de rendu et s’arrête lorsque la sortie est en pause. Consultez [Hooks utilitaires](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js émet au maximum une frame toutes les 66 ms (environ 15 fps). Un intervalle de 16 ms produit quatre rendus par frame émise ; les frames supplémentaires sont regroupées et ne font que consommer du CPU. La règle signale les délais `setInterval`/`useInterval` inférieurs à `minInterval` (`66` par défaut) et les appels à `useAnimationFrame` avec un `fps` supérieur à 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Comparer `e.key` manuellement fonctionne, mais les raccourcis sont invisibles. `useKeymap` place des associations libellées dans `<KeyHelp>`, `<KeyHints>` (associations avec `hint: true`) et la palette de commandes, gère les séquences comme `g g` et arrête la propagation des touches correspondantes. La règle signale les gestionnaires `useInput` qui comparent au moins deux littéraux de touche (`minKeys`) et exclut les gestionnaires qui lisent `e.input` pour la saisie.

<!-- s:05d39412dc -->
Consultez [Raccourcis clavier](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- Les fichiers `page`, `layout`, `loading`, `error` et `not-found` doivent exporter un composant par défaut (`TX015`).
- `export const dynamic` doit valoir `"auto"`, `"force-static"` ou `"force-dynamic"` (`TX031`). Text.js ne prend pas en charge la valeur `"error"` de Next.js. Cette valeur est lue dans les pages, les layouts et les gestionnaires de route. Dans les pages et les layouts, écrivez-la sous forme de littéral de chaîne : `text build` la lit depuis le code source sans exécuter le module.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata est fusionné à partir des layouts, puis de la page (ou de `not-found`). La règle signale ce que le routeur ignorerait sans avertissement :

<!-- s:fe9ebcbc0c -->
- `metadata` ou `generateMetadata` dans les fichiers `loading` ou `error`
- les deux exports dans un même fichier
- `async generateMetadata` : l’appel est synchrone, donc une Promise ne définit jamais le titre
- un `title` qui n’est ni une chaîne ni `{ default, template?, absolute? }`, ou une clé mal orthographiée
- un `title.template` sans `%s`, ou dans une page, où il n’a aucun effet
- une `description` qui n’est pas une chaîne

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
Les fichiers `route.ts` ne répondent qu’aux méthodes HTTP qu’ils exportent : `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` et `OPTIONS`. Les fonctions `get` ou `Post` avec une initiale minuscule ne sont jamais appelées (les requêtes reçoivent `405`) ; la suggestion les renomme. Les exports par défaut, les gestionnaires qui ne sont pas des fonctions et les autres exports sont signalés, à l’exception de `dynamic` et `revalidate` dans la [configuration du segment de route](/docs/caching). Déplacez le code partagé dans `lib/`, ou listez les noms supplémentaires avec `{ allow: [...] }`.
