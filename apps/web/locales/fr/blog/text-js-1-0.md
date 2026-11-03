<!-- s:5a6798e6a5 -->
Aujourd’hui, nous publions Text.js 1.0, le framework console pour le Web.

<!-- s:e4787165f5 -->
Text.js affiche des applications React 19 dans la console des DevTools de Chrome, avec des layouts, du routage, la gestion du focus, des saisies, des formulaires, des graphiques et du Markdown en streaming, dessinés avec `console.log`.

<!-- s:48b184a262 -->
Les nouveautés de la version 1.0

<!-- s:7f7f2a9a76 -->
- **L’App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` et `api/*/route.ts`, synchronisés avec `window.location`. Il suit les conventions de l’App Router de Next.js.
- **Turbolog.** Yoga flexbox dispose une grille de cellules, un `CellBuffer` à tableaux typés la stocke, et un encodeur par plages la transforme en un seul appel à `console.log(format, ...css)`. Les frames inactives ne font aucun appel à la console.
- **Un kit de composants.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` virtualisée, `Table`, `Tree`, des graphiques, des boîtes de dialogue, des notifications et une palette de commandes `Ctrl+K` fournie par `useKeymap`.
- **Des frames ajoutées à la suite.** Chaque frame est ajoutée sous la précédente, pour que la console ne clignote pas en se vidant entre deux frames. Plus de détails dans [Turbolog : éliminer le clignotement](/blog/turbolog-eliminating-the-flash).
- **Le texte de droite à gauche.** L’hébreu et l’arabe s’affichent dans l’ordre visuel, avec la mise en forme contextuelle de l’arabe, grâce à une implémentation d’UAX #9 qui réussit les 770 241 cas de `BidiTest.txt`. Consultez [Le texte de droite à gauche dans la console](/blog/right-to-left-text).
- **Une console adaptative.** Text.js s’adapte au panneau DevTools ancré, y compris au zoom de la page et à une barre d’outils qui passe sur plusieurs lignes. Détaché, il utilise par défaut `120×36`.
- **`text run`.** La même application App Router s’affiche dans un vrai terminal.
- **Des outils pour les agents et les éditeurs.** `text mcp` expose votre application aux agents de programmation via le Model Context Protocol, et l’extension Text.js DevTools ajoute un panneau à côté de « Console ». `eslint-plugin-textjs` et une extension VS Code font aussi partie de la version 1.0.

<!-- s:b71c4a16bc -->
Un changement de nom

<!-- s:b47aa37902 -->
Le paquet du framework s’appelle désormais `@textjs/next`. Le nom `textjs` était déjà pris sur npm. Mettez à jour vos imports :

<!-- s:e4005009f1 -->
**Mise à jour, 1.0.2 :** le paquet s’appelle désormais `@textjs/app`, et `@textjs/next` est déprécié. Pour migrer, exécutez `bun remove @textjs/next && bun add @textjs/app` et importez depuis `@textjs/app`.

<!-- s:5b35a47b90 -->
Chiffres

<!-- s:2ee54da34c -->
Sur un tableau de bord dense de `100×32` (46 nœuds de texte, 149 spans `%c`), mesures effectuées avec `packages/core/test/perf.test.ts` :

<!-- s:9729def172 -->
| Frame | Moyenne |
| :-- | --: |
| Rendu complet (layout, dessin, encodage) | 0,163 ms |
| Modification d’une ligne (saisie) | 0,011 ms |
| Inactivité | 0,000 ms, 0 appel à la console |

<!-- s:2fee8c4c3d -->
Une frame inchangée retourne avant d’allouer une chaîne de caractères, ce qui donne une mesure de 0,000 ms pour les frames inactives.

<!-- s:a0fa47c98f -->
Essayer

<!-- s:aeb9cc2b5d -->
Ouvrez [textjs.org](/) et appuyez sur ⌘⌥J (Ctrl+Shift+J sous Windows et Linux). Le site exécute une application Text.js dans votre console, avec une vue par page. Le [Playground](/playground) propose un tableau de bord, du Markdown en streaming et Snake. [OpenCode](/opencode) se connecte à votre serveur OpenCode local.

<!-- s:31dd2e762c -->
La liste complète des changements figure dans le [journal des modifications](/changelog), et le code source est sur [GitHub](https://github.com/anomalyco/textjs).
