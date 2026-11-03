<!-- s:3c9b7877c3 -->
Text.js 0.3 a ajouté `@textjs/font`, un analyseur et un moteur de rendu pour les polices FIGlet. Il inclut les 17 polices de la distribution FIGlet 2.2.5, chacune dans un module ES, et sa sortie correspond exactement à celle du binaire `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Pourquoi FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` propose deux lettrages intégrés, `block` et `compact`, depuis la version 0.1. FIGlet est le standard pour ce type de lettrage depuis 1991, et des centaines de polices `.flf` existent. La prise en charge de ce format rend chacune d’elles utilisable dans une application console.

<!-- s:7fdbff5714 -->
Une police FIGlet est un fichier texte brut. Une ligne d’en-tête définit la hauteur, le caractère hardblank et les règles de layout, puis chaque caractère est dessiné sous forme d’un bloc de lignes avec un marqueur de fin au bout de chaque ligne. Dans ses layouts par défaut, FIGlet déplace chaque caractère vers la gauche jusqu’à ce qu’il touche le précédent, puis utilise les règles de fusion de la police pour décider si les deux sous-caractères en contact fusionnent.

<!-- s:4c761bba4d -->
Modes de layout

<!-- s:3f1c38cf92 -->
`figlet` propose cinq layouts horizontaux, et `renderFiglet` accepte les cinq mêmes via `layout` :

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Effet |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout propre à la police, généralement avec fusion |
| `"full"` | `-W` | Pleine largeur ; aucun contact entre les caractères |
| `"fitted"` | `-k` | Rapprochement des caractères jusqu’au contact |
| `"smushed"` | `-S` | Fusion selon les règles de la police |
| `"universal"` | `-o` | Superposition des caractères suivants sur les précédents |

<!-- s:7a1307992e -->
Un nombre de -1 à 63 correspond à un mode de layout `-m` brut : `-1` donne la pleine largeur, `0` rapproche les caractères jusqu’au contact, et les valeurs de `1` à `63` sélectionnent des règles de fusion. Les six règles de fusion horizontale sont implémentées : caractères identiques, trait de soulignement, hiérarchie, paire opposée, grand X et hardblank. L’analyseur gère aussi le reste du format : lignes de commentaires, caractères identifiés par un code décimal, octal ou hexadécimal, glyphe de caractère manquant et polices de droite à gauche comme `ivrit`.

<!-- s:0c920c94d3 -->
Le retour à la ligne suit également FIGlet. `width` coupe entre les mots, et à l’intérieur d’un mot lorsque celui-ci dépasse la largeur de la ligne, aux mêmes endroits que `figlet -w`. `figlet -w 80` affiche au plus 79 colonnes, donc `-w N` correspond à `width: N - 1`.

<!-- s:729dda48fc -->
Conformité au binaire

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` contient 273 sorties générées en exécutant le véritable `figlet` 2.2.5 sur chaque police incluse dans chaque mode de layout, avec retour à la ligne, justification, texte de droite à gauche, mode paragraphe et les données d’entrée des tests de non-régression de FIGlet avec les options de son `run-tests.sh`. Chaque cas enregistre les arguments, l’entrée et la sortie exacte, et le test reconvertit la ligne de commande en options :

<!-- s:d31215cb4b -->
Les 273 sorties correspondent. Pour régénérer les données de référence, placez `figlet` 2.2.5 dans votre `PATH` et exécutez `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Polices sur la grille de cellules

<!-- s:ede6764977 -->
Chaque police incluse utilise des caractères ASCII ou Latin-1 imprimables, donc chaque sous-caractère occupe exactement une cellule en Menlo et s’aligne sur la grille. `<FigletText>` mesure ses lignes en cellules, de sorte que le lettrage s’intègre dans un layout flexbox comme tout autre `<Text>`, et `columns` et `align` gèrent son retour à la ligne et sa justification dans son cadre.

<!-- s:3cedd51e92 -->
Chaque police dispose de son propre module, donc une application n’embarque que les polices qu’elle importe, et une police est analysée au premier rendu plutôt qu’à l’importation. `@textjs/font/all` exporte toutes les polices pour les galeries.

<!-- s:9d54eeef4f -->
Toute autre FIGfont peut être récupérée et analysée à l’exécution :

<!-- s:f64649f401 -->
Licences

<!-- s:67e882f6b4 -->
Les polices incluses sont identiques octet pour octet à celles de `figlet-2.2.5.tar.gz` et sont distribuées sous la licence BSD à 3 clauses de FIGlet. Chacune conserve ses crédits dans ses lignes de commentaires, accessibles via `font.comment`. Les polices populaires sans autorisation de redistribution, comme Doom, Larry 3D, ANSI Shadow et Calvin S, ne sont pas incluses.

<!-- s:ee98166722 -->
La référence complète se trouve dans [Polices](/docs/fonts).
