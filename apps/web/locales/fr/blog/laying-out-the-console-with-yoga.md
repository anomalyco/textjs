<!-- s:e4dabd0578 -->
Yoga, le moteur flexbox utilisé par React Native et compilé en WebAssembly, calcule le layout de chaque frame de Text.js. Les boîtes et le texte partagent un même arbre Yoga. La console est une grille de cellules de caractères : chaque position et chaque dimension calculée doit donc correspondre à un nombre entier de cellules.

<!-- s:9c86e1b16d -->
Un point vaut une cellule

<!-- s:9026ebff4f -->
Yoga arrondit ses résultats sur une grille de pixels définie par le facteur d’échelle des points. À 2, comme sur un écran Retina, les bords peuvent tomber sur des demi-points. Text.js charge Yoga une seule fois et fixe le facteur à 1 :

<!-- s:f5193c7abd -->
Avec un facteur de 1, Yoga arrondit chaque bord à une unité entière, et Text.js considère qu’une unité vaut une cellule. Yoga arrondit la position absolue de chaque bord et déduit les dimensions des bords arrondis, de sorte que les boîtes voisines partagent un bord. Divisez une ligne de 81 colonnes en deux boîtes `width="50%"` : l’une reçoit 40 colonnes, l’autre 41, sans espace ni chevauchement.

<!-- s:4f9619621a -->
Text.js applique lui-même les valeurs CSS par défaut : `flexDirection` vaut `row` et `flexShrink` vaut `1`, comme dans un navigateur.

<!-- s:5240062c19 -->
Mesure du texte

<!-- s:25f0052f43 -->
Les nœuds de texte sont des feuilles de l’arbre Yoga dotées d’une fonction de mesure. Yoga l’appelle avec la largeur disponible, et Text.js renvoie les dimensions du texte en cellules :

<!-- s:a543588dc9 -->
Le texte qui tient dans la largeur disponible est renvoyé à sa taille naturelle. Le texte qui ne tient pas est réparti sur plusieurs lignes selon la largeur disponible, et sa hauteur correspond au nombre de lignes. Le nœud conserve sa dernière répartition en lignes, ce qui évite de la recalculer lorsque la même largeur est mesurée à nouveau.

<!-- s:3c253fdc4c -->
Mesure des groupes de graphèmes

<!-- s:7d52c4b9c9 -->
La propriété `length` d’une chaîne compte les unités de code UTF-16, ce qui renseigne peu sur le nombre de cellules qu’elle occupe. Le texte est d’abord découpé en groupes de graphèmes avec `Intl.Segmenter` : `e` suivi d’un accent combinatoire forme ainsi un seul groupe, tout comme une séquence d’emojis reliés par des liants sans chasse. Une largeur est ensuite attribuée à chaque groupe :

<!-- s:f36acd4206 -->
| Texte | Cellules | Raison |
| :-- | --: | :-- |
| `abc` | 3 | Une cellule par caractère |
| `你好` | 4 | Deux cellules pour les caractères larges d’Asie de l’Est |
| `🚀` | 2 | Deux cellules pour la présentation emoji |
| `é` (`e` + U+0301) | 1 | Aucune cellule pour les marques combinatoires |
| `─│┌▼←⠋` | 6 | Une cellule fixe pour les caractères de tracé de boîtes, les formes géométriques, les flèches et le braille |

<!-- s:75d5c21868 -->
Les bordures, le symbole `▼`, les flèches et les frames des indicateurs de chargement sont toujours mesurés comme une cellule, de sorte qu’une bordure de boîte ne décale jamais son contenu.

<!-- s:cee20acd8c -->
Les caractères ASCII imprimables ne passent pas par la segmentation, et les autres largeurs sont mises en cache par point de code et par groupe.

<!-- s:5f37d5a215 -->
Retour à la ligne

<!-- s:b59adefd34 -->
`<Text>` accepte un mode `wrap` :

<!-- s:0ad0b36724 -->
- `wrap` (par défaut) coupe aux espaces, et à l’intérieur d’un mot lorsque celui-ci est plus large que la ligne.
- `nowrap` conserve une seule ligne et laisse la boîte rogner ce qui dépasse.
- `truncate-end`, `truncate-middle` et `truncate-start` conservent une seule ligne et remplacent ce qui ne tient pas par `…`.

<!-- s:73ec8f197a -->
La troncature compte elle aussi les cellules : une ligne de texte chinois est donc coupée à la limite d’un caractère, et les points de suspension occupent exactement une cellule.

<!-- s:1d11d6a370 -->
En pratique

<!-- s:50e47bf264 -->
Ici, une barre latérale de 30 colonnes se trouve à côté d’un panneau qui occupe la largeur restante :

<!-- s:f9394d30d6 -->
Dans une console de 100 colonnes, la barre latérale occupe 30 colonnes, bordure comprise, et le panneau de conversation occupe les 70 autres. Une bordure occupe une cellule de chaque côté, le titre de la session est donc tronqué à 28 cellules.
