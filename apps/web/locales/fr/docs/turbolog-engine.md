<!-- s:aca2697522 -->
Turbolog transforme chaque commit React en un appel à `console.log`, ou aucun si aucune cellule n’a changé.

<!-- s:d01b048a1d -->
Objectifs

<!-- s:53b8b34f5a -->
1. **Un appel par frame modifiée.**
2. **Zéro appel au repos.** Une frame inchangée provoque un retour avant la construction d’une chaîne.
3. **Peu d’arguments de style.** 149 spans `%c` pour les 3200 cellules d’un tableau de bord dense de `100×32`.

<!-- s:e284ac0068 -->
Pipeline

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
La frame réside dans des tableaux typés plats pour les caractères, les couleurs et les attributs, alloués une seule fois.

<!-- s:6215aa69f7 -->
Filtrage des changements

<!-- s:617da960c4 -->
Chaque ligne est hachée. Si rien n’a changé, le pilote retourne immédiatement :

<!-- s:524a0717a4 -->
Remplacement des frames

<!-- s:3c7194b785 -->
Turbolog ajoute les frames à la suite et n’efface la console qu’à la première frame, après `invalidate()`, au repos une fois 100 frames empilées, et à 300. DevTools supprime immédiatement les messages effacés, mais limite l’affichage des nouveaux à un rafraîchissement toutes les 50 ms : effacer chaque frame fait donc brièvement apparaître une console vide. Les frames ajoutées à la suite se remplacent en un seul rafraîchissement, et un span rideau de largeur nulle masque la frame précédente. Faites défiler vers le haut pour voir les frames antérieures.

<!-- s:7845be2cbb -->
Les frames sont cadencées à environ 15 fps. Les frames plus rapides réinitialisent la temporisation de DevTools et sont abandonnées.

<!-- s:a36177ad5b -->
Codage par plages

<!-- s:d4079278eb -->
Les cellules identiques fusionnent en un seul span `%c`. Les spans se prolongent au-delà des sauts de ligne, et les chaînes CSS sont internées.

<!-- s:7fe20496b0 -->
Détails propres à Chromium

<!-- s:ff8301db1f -->
- Le caractère littéral `%` est échappé sous la forme `%%`.
- Les URL et le texte `path:line` reçoivent un word joiner pour empêcher DevTools de modifier leur style.
- Les spans utilisent uniquement des propriétés CSS non abrégées. DevTools copie chaque propriété développée sur chaque ligne.
- Les spans sont ajustés pour que les arrière-plans se juxtaposent sans interstices.

<!-- s:41e36e3179 -->
Firefox et Safari

<!-- s:8b2f3136a1 -->
Chromium dispose chaque ligne d’un span `%c` comme un bloc en ligne. Firefox et Safari conservent les spans en ligne, ignorent donc les marges verticales et renvoient les longues lignes à la ligne. `CssConsoleDriver` détecte le navigateur par des tests de fonctionnalités CSS et, pour ces deux consoles, définit une hauteur de ligne de 14 px sans marges, désactive le retour à la ligne avec `text-wrap-mode: nowrap` et repousse les frames antérieures hors de la vue avec un rideau `line-height: 100vh`. L’ajustement à la console réserve de la place pour la colonne des liens source de Firefox. Safari place Menlo en tête de la liste de polices, car ses pages ne peuvent pas utiliser une police SF Mono installée par l’utilisateur, même si Web Inspector peut l’utiliser pour son affichage. Passez `browser` à `createConsoleRoot` pour choisir vous-même une console.

<!-- s:66b07a5809 -->
Mesures de performance

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` sur un tableau de bord dense de `100×32`, moyenne sur 1000 frames (Apple M5 Pro, Bun 1.4.4) :

<!-- s:342771dd1f -->
| Frame | Temps | Spans `%c` |
| :-- | --: | --: |
| Rafraîchissement complet (layout, affichage, encodage) | **0,163 ms** | 149 |
| Modification d’une ligne | **0,011 ms** | 149 |
| Au repos | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
La page [État](/status) exécute le même pipeline dans votre navigateur. Exécutez `text.stats()` dans DevTools pendant qu’une démo du [Playground](/playground) est en cours.
