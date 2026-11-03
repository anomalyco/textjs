<!-- s:bd59ce7974 -->
Text.js affiche désormais l’hébreu, l’arabe, le persan et les autres écritures de droite à gauche dans le bon ordre, avec les lettres arabes liées, sur la même grille de cellules que le reste.

<!-- s:4673b00c8b -->
Chaque paragraphe détermine sa direction de base à partir de son premier caractère fort, comme le fait `dir="auto"` en HTML, et les paragraphes de droite à gauche s’alignent à droite. Sur un `<Text>` imbriqué, `dir` isole le span comme le fait `<bdi>`, afin qu’un nom d’utilisateur de direction inconnue ne puisse pas réordonner le texte qui l’entoure.

<!-- s:9026fc3194 -->
L’algorithme

<!-- s:f13f3bb4af -->
La prise en charge du texte de droite à gauche repose sur une implémentation de l’algorithme bidirectionnel Unicode (UAX #9, Unicode 18.0), écrite de zéro dans `@textjs/core`. Elle résout les niveaux d’imbrication de chaque paragraphe, y compris les imbrications et isolats explicites, les types faibles et neutres et les paires de parenthèses. Ensuite, chaque ligne issue du retour à la ligne est réordonnée séparément, et les caractères miroirs sont inversés aux niveaux de droite à gauche, de sorte que `(abc)` reste `(abc)` au sein du texte hébreu.

<!-- s:82ed91ab82 -->
Unicode publie deux fichiers de conformité pour cet algorithme. Tous deux sont inclus dans le dépôt, compressés avec gzip, et la suite de tests exécute chaque cas :

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` répertorie les entrées sous forme de séquences de classes bidi, chacune accompagnée des directions de paragraphe auxquelles elle s’applique. Text.js réussit les 770 241 cas.
- `BidiCharacterTest.txt` répertorie des chaînes réelles avec les niveaux et l’ordre attendus. Text.js réussit les 91 707 cas.

<!-- s:3939cd5f43 -->
De l’ordre logique aux cellules

<!-- s:e682972504 -->
Une ligne de texte de droite à gauche passe par quatre étapes avant d’atteindre la console :

<!-- s:a497c14c9c -->
1. **Effectuer les retours à la ligne dans l’ordre logique.** Les lignes sont coupées aux mêmes endroits que pour du texte de gauche à droite, selon la largeur des cellules.
2. **Réordonner chaque ligne.** Les niveaux résolus déterminent l’ordre d’affichage des graphèmes de la ligne.
3. **Mettre en forme l’arabe.** Les lettres prennent leurs formes contextuelles (isolée, initiale, médiane, finale) dans les blocs de formes de présentation arabes. Une lettre occupe une cellule, et les formes liées sont conservées même en présence d’un curseur ou d’un changement de couleur au milieu d’un mot.
4. **Figer l’ordre.** Les cellules contiennent désormais les glyphes dans l’ordre d’affichage.

<!-- s:5d1156720d -->
La dernière étape existe parce que DevTools appliquerait bidi au texte une seconde fois et l’inverserait à nouveau. Un style `%c` ne peut pas désactiver ce comportement, car le filtre de DevTools supprime `direction` et `unicode-bidi`. Le pilote encadre donc chaque span contenant des caractères de droite à gauche avec `LRO` et `PDF` (U+202D et U+202C), ce qui force l’affichage de gauche à droite du contenu exact des cellules.

<!-- s:aba313fc71 -->
Une dérive d’une demi-cellule

<!-- s:1109446b98 -->
Ni SF Mono ni Menlo ne possèdent de glyphes hébreux ou arabes, donc le navigateur utilise une police de repli pour chaque caractère. Sur macOS, il s’agit de Courier New, également à chasse fixe, avec 7,2012 px par glyphe à 12 px, contre 7,2246 px pour Menlo. Elle est plus étroite de 0,3 %, ce qui suffit à décaler une ligne entière d’hébreu d’environ une demi-cellule.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` mesure chaque span de droite à gauche à l’aide d’un canvas utilisant la police de la console, avec le même mécanisme de repli de police de Blink que DevTools, et ajoute au span un espacement égal à la différence exacte en LayoutUnits (1/64 px). Chaque span finit par avoir la même largeur que les cellules de la grille qu’il recouvre. Un span est réduit d’au plus une demi-cellule, de sorte qu’une police de repli beaucoup plus large déborde au lieu de chevaucher le span suivant.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` mesure le résultat dans l’interface réelle de DevTools, sur une frame de 64×21 contenant des lignes en hébreu, en arabe, mixtes et avec des emoji au sein de l’hébreu :

<!-- s:e6a33dfaa2 -->
| Frame | Dérive du bord droit entre les lignes |
| :-- | --: |
| Cellules écrites dans la console sans figer l’ordre | 14,5 px |
| Ordre figé, sans ajustement de largeur | 2,22 px |
| Pilote livré | 0,156 px |
| Témoin : chaque glyphe RTL remplacé par `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
Le témoin est la même frame avec du texte latin. Le pilote livré produit un meilleur alignement que le témoin, car les emoji contenus dans les spans de droite à gauche sont ajustés avec eux.

<!-- s:d37099863b -->
Texte de gauche à droite inchangé

<!-- s:41ce31b66a -->
Le texte sans caractères de droite à gauche ignore toutes ces étapes. La vérification a lieu pendant la segmentation des graphèmes, à raison d’une comparaison par graphème, et le texte exclusivement de gauche à droite suit le même chemin de rendu qu’auparavant, de sorte que ses frames dans la console sont identiques octet pour octet.

<!-- s:a8fff567e6 -->
La prise en charge du texte de droite à gauche est livrée dans Text.js 1.0. La page [Internationalisation](/docs/internationalization) couvre la saisie, l’édition, les terminaux et l’API.
