<!-- s:43751f7845 -->
Text.js affiche l’hébreu, l’arabe, le persan et les autres écritures de droite à gauche dans le bon ordre, alignés sur la grille de cellules, dans DevTools, les terminaux et les miroirs DOM. Il implémente l’algorithme bidirectionnel Unicode (UAX #9, Unicode 18.0) et réussit les suites officielles de conformité : les 770 241 cas de `BidiTest.txt` (chaque entrée dans chaque direction de paragraphe) et les 91 707 cas de `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Direction

<!-- s:0c7b144a82 -->
Chaque paragraphe (chaque ligne d’un `<Text>` séparée par `\n`) choisit sa propre direction de base à partir de son premier caractère fort, comme le fait `dir="auto"` en HTML. Les paragraphes de droite à gauche s’alignent à droite par défaut.

<!-- s:c17beb4498 -->
| `align` | Paragraphe de gauche à droite | Paragraphe de droite à gauche |
| :-- | :-- | :-- |
| `"start"` (par défaut) | gauche | droite |
| `"end"` | droite | gauche |
| `"left"` / `"center"` / `"right"` | selon la valeur indiquée | selon la valeur indiquée |

<!-- s:6db8fa68bb -->
Sur un `<Text>` imbriqué, `dir` isole le span comme le fait `<bdi>` en HTML : son contenu est disposé indépendamment et ne peut pas réordonner le texte qui l’entoure. Utilisez-le pour les noms, titres et autres textes de direction inconnue fournis par les utilisateurs.

<!-- s:68088feb2d -->
Étapes du rendu

<!-- s:d401630cda -->
1. **Renvoyer à la ligne dans l’ordre logique.** Les lignes sont coupées exactement comme pour le texte de gauche à droite, selon la largeur des cellules.
2. **Réordonner chaque ligne.** L’algorithme résout les niveaux d’imbrication pour tout le paragraphe (imbrications et isolats explicites, types faibles et neutres, parenthèses appariées), puis réordonne indépendamment chaque ligne issue du renvoi à la ligne (règles L1–L2). Les parenthèses et les autres caractères à miroir s’inversent aux niveaux de droite à gauche (L4), de sorte que `(abc)` reste `(abc)` au sein du texte hébreu.
3. **Mettre en forme l’arabe.** Les lettres prennent leurs formes contextuelles (isolée, initiale, médiane, finale) dans les blocs de formes de présentation arabes, calculées dans l’ordre logique au sein de chaque séquence de même niveau de la ligne (ZWJ et ZWNJ sont pris en compte à leur position). Une lettre occupe une cellule, les formes liées sont conservées à chaque limite de span (un curseur, un changement de couleur), et la console n’a jamais à les mettre en forme.
4. **Verrouiller l’ordre.** Les cellules contiennent désormais les glyphes dans l’ordre d’affichage. Les navigateurs et de nombreux terminaux leur appliqueraient une seconde fois l’algorithme bidi, donc les pilotes verrouillent l’ordre :

<!-- s:153724c967 -->
| Sortie | Verrouillage de l’ordre |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Les spans contenant des caractères de droite à gauche sont encadrés par `LRO … PDF` (U+202D / U+202C). Le filtre de nettoyage de `%c` de DevTools supprime `direction` et `unicode-bidi`. |
| Terminaux (`AnsiDriver`, `text run`) | Les lignes contenant du texte de droite à gauche sont encadrées par `LRO … PDF` pour les terminaux qui appliquent bidi par ligne. `renderToTerminal` passe au mode explicite BDSM d’ECMA-48 (`CSI 8 l`, respecté par les terminaux basés sur VTE) une fois à l’entrée, puis revient au mode implicite (`CSI 8 h`) à la sortie ; les frames ponctuelles de `renderToAnsi` contenant du texte de droite à gauche commencent par `CSI 8 l`. Passez `bidi: "none"` pour émettre les cellules telles quelles. |
| Miroirs DOM (`<ConsoleMirror>`) | Le miroir utilise `direction: ltr` (pour qu’une page hôte RTL ne puisse pas l’inverser), et les spans contenant du texte de droite à gauche reçoivent `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` et `<Divider title>` suivent les mêmes étapes (`drawLogicalText(buffer, x, y, text, …)` dessine ainsi toute ligne individuelle), donc leurs libellés s’affichent dans l’ordre, avec les lettres liées.

<!-- s:3b67946601 -->
Le texte sans caractères de droite à gauche ignore toutes ces étapes. Un modèle de texte entièrement de gauche à droite est détecté lors de la segmentation de ses graphèmes (une comparaison par graphème) et utilise le chemin de rendu inchangé ; les frames de la console sont identiques octet pour octet.

<!-- s:6181d9259c -->
Chargement du moteur bidi

<!-- s:8bd0807fa0 -->
Dans les applications Text.js (`text dev`, `text build`), le moteur bidi et ses tables Unicode forment un bloc séparé de 10,1 ko (gzip). Il est téléchargé la première fois qu’une page affiche du texte de droite à gauche ou un `<Text>` avec `dir="rtl"`, de sorte que les autres pages ne le chargent jamais. En attendant son arrivée, ce texte s’affiche dans l’ordre logique. La console le redessine ensuite dans l’ordre d’affichage.

<!-- s:ed4299ea80 -->
Les applications `text build` avec une structure prérendue lancent elles-mêmes le téléchargement lorsque cette structure contient du texte de droite à gauche. Si vous montez la console vous-même, lancez le téléchargement en parallèle de `createConsoleRoot()` pour que la première frame soit dans l’ordre d’affichage. Par exemple, sur les pages de droite à gauche :

<!-- s:8ebc8c3712 -->
`loadBidi()` rejette sa promesse si le chargement du bloc échoue. Le texte de droite à gauche reste alors dans l’ordre logique.

<!-- s:7adcf6764d -->
Le rendu côté serveur, `text run`, les tests et les bundles sans la condition de résolution `@textjs/client` incluent le moteur : ils affichent donc toujours le texte de droite à gauche dans l’ordre d’affichage, et `loadBidi()` résout sa promesse immédiatement.

<!-- s:26ac17c25a -->
Largeur des cellules

<!-- s:552e751976 -->
La pile de polices fournie est `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Aucune de ces polices ne contient de glyphes hébreux ou arabes, donc les navigateurs choisissent une police de repli pour chaque caractère. Sur macOS, il s’agit de Courier New, une police à chasse fixe de 0,6 em : 7,2012 px par glyphe à 12 px, contre 7,2246 px pour Menlo. Elle est plus étroite de 0,3 %, ce qui suffit à décaler une ligne entière d’hébreu d’environ une demi-cellule.

<!-- s:851f84e769 -->
`CssConsoleDriver` mesure chaque span de droite à gauche avec un canvas dans la police de la console (avec la même mise en forme Blink et les mêmes polices de repli que DevTools), puis ajoute un espacement correspondant à la différence exacte en LayoutUnit (1/64 px). Le span finit par avoir la même largeur que les cellules de la grille qu’il couvre (un graphème large comme un emoji compte pour deux). Un span est réduit d’au plus une demi-cellule, donc une police de repli proportionnelle (Times New Roman à côté de Cascadia Mono sous Windows) déborde plutôt que de laisser le span suivant chevaucher ses glyphes. Mesures dans l’interface réelle de DevTools (Chromium 151) sur une frame de 64×21 contenant des lignes en hébreu, en arabe, mixtes et avec des emojis dans du texte hébreu, ainsi que des titres de boîtes RTL (`bun bench/devtools/bidi-shot.ts`) :

<!-- s:45d1be4db4 -->
| Frame | Décalage du bord droit entre les lignes |
| :-- | --: |
| Cellules affichées sans verrouillage | 14,5 px (DevTools réordonne et remet en forme) |
| Ordre verrouillé, sans ajustement de largeur | 2,22 px |
| Pilote fourni | 0,156 px |
| Témoin : mêmes cellules, chaque glyphe RTL remplacé par `x` | 1,67 px |

<!-- s:a7ec844aae -->
La frame produite par le pilote fourni correspond au témoin entièrement latin sur chaque ligne, sauf celle des emojis, où elle fait mieux : les emojis sont ajustés avec le span de droite à gauche qui les entoure (0,03 px), tandis que la ligne d’emojis de gauche à droite du témoin n’est pas ajustée (1,66 px).

<!-- s:318b8b5f4c -->
DevTools dessine chaque span `%c` avec `contain: paint` et l’aligne séparément sur les pixels physiques ; lorsque deux arrière-plans se rejoignent à une position fractionnaire, le pixel entre eux peut n’appartenir à aucun des deux, laissant un filet de 1 px. Dans Chrome et Edge, un span doté d’un arrière-plan le prolonge de 1 px sous son voisin opaque de droite, et un span ajusté ajoute ce pixel à son espacement intérieur. Aucune des quatre frames ci-dessus ne présente de filet.

<!-- s:7deafc8e74 -->
Passez `measureText: false` pour désactiver l’ajustement, ou fournissez votre propre fonction de mesure `(text, bold, italic) => px`.

<!-- s:f088ff48f9 -->
Saisie et édition

<!-- s:6aca925fed -->
`<Input>` et `<Textarea>` conservent un curseur logique. Les touches fléchées parcourent le texte dans l’ordre de stockage ; dans un texte de droite à gauche, ← se déplace donc visuellement vers la droite. Le curseur bloc se place sur le caractère logique qu’il couvre, où que le réordonnancement le situe. Dans une séquence de droite à gauche, il s’agit de la cellule à gauche du caractère précédent. La sélection est elle aussi une plage logique, et sa surbrillance peut donc couvrir des cellules non contiguës dans les lignes à directions mixtes. Le défilement horizontal d’un `<Input>` à une seule ligne suit la colonne logique, donc une longue valeur de droite à gauche peut faire défiler le curseur hors de la zone visible. Un curseur sur une espace ou à la fin du texte est dessiné comme une espace insécable isolée, afin de rester neutre et de ne jamais se joindre aux nombres de part et d’autre.

<!-- s:68c8d3995f -->
Limites

<!-- s:fbb8008232 -->
- **Séparateurs de paragraphes.** Les lignes sont séparées par `\n`. U+2029 et les autres séparateurs de paragraphes terminent un paragraphe bidi, mais ne commencent pas de nouvelle ligne.
- **Tabulations.** Les tabulations sont remplacées par des espaces avant l’exécution de bidi ; elles agissent donc comme des espaces blancs (WS), et non comme des séparateurs de segments (S).
- **Mise en forme.** Seules les lettres disposant de formes de présentation sont mises en forme : l’arabe, le persan, l’ourdou et les autres lettres dans U+FB50–U+FDFF et U+FE70–U+FEFF. Lam-alef reste deux lettres liées dans deux cellules, et non une ligature à un seul glyphe. Le syriaque, le N’Ko et les autres écritures liées conservent leurs formes nominales.
- **Copie.** Le texte copié depuis la console est dans l’ordre d’affichage (avec les marques `LRO`/`PDF`), et non dans l’ordre logique.
- **Terminaux.** Les terminaux qui ignorent à la fois BDSM et `LRO` et exécutent leur propre algorithme bidi (par exemple avec bidi activé dans iTerm2) peuvent réordonner à nouveau les lignes de droite à gauche.
- **Miroirs DOM.** `<ConsoleMirror>` n’ajuste pas les largeurs, donc les séquences de droite à gauche peuvent y présenter un décalage allant jusqu’à 0,3 % de leur largeur.

<!-- s:f4d4dadbf6 -->
Traduire le pavé de focus

<!-- s:7791d4db4e -->
`<FocusPad>` de `@textjs/react/dom` (également rendu par `<TextCanvas>`) indique aux visiteurs d’ouvrir la console, de cliquer sur la page et d’appuyer sur une touche. Son texte est en anglais par défaut. Pour le traduire, passez `messages` avec les chaînes que vous souhaitez remplacer. Les clés omises conservent leur texte anglais, répertorié dans `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
Une chaîne qui contient une valeur est une fonction qui renvoie la phrase entière, afin qu’une traduction puisse placer la valeur n’importe où dans celle-ci. `step`, `pressShortcut`, `then`, `defaultAction` et `shortcutOpens` sont des fonctions. `step` reçoit le numéro de l’étape et le nombre d’étapes. `then` reçoit la prop `action`, ou le texte de `defaultAction` en l’absence d’`action`. `defaultAction` reçoit les touches de la première indication, ou `null` en l’absence d’indications. `pressShortcut` reçoit les touches du raccourci pour les lecteurs d’écran, et `shortcutOpens` reçoit le raccourci sous forme d’éléments `<kbd>`.

<!-- s:e9475554da -->
`messages` couvre aussi les libellés annoncés par les lecteurs d’écran et le contrôle de taille de la console (`sizeControl`). `<TextCanvas>` accepte la même prop `messages`. `<ViewportControl>` l’accepte aussi et utilise les clés du contrôle de taille. Les touches affichées, comme ⌘⌥J, Ctrl+Shift+J et Enter, ne sont pas traduites.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` et `reorderIndices` exposent l’algorithme lui-même : les règles P1–I2, L1 et L2.
