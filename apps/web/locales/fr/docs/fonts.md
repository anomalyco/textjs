<!-- s:dd02562b57 -->
`@textjs/font` analyse les fichiers FIGfont 2 (`.flf`) et les met en page exactement comme le programme `figlet`. Chaque police est un module ES, seules les polices que vous importez sont donc livrées.

<!-- s:a15d12503b -->
Installation

<!-- s:63bfd61a05 -->
Utilisation

<!-- s:fdffc4b786 -->
`<FigletText>` prend une police et une chaîne de caractères. Les lignes sont mesurées en cellules, le lettrage s’intègre donc aux layouts flexbox comme tout autre `<Text>`.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) accepte les mêmes polices, tout en conservant ses lettrages intégrés `block` et `compact` :

<!-- s:9fc6ab3e8b -->
En dehors de React, `renderFiglet` renvoie une chaîne par ligne :

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Le layout horizontal suit les options de FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Effet |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout de la police, généralement avec fusion |
| `"full"` | `-W` | Pleine largeur ; caractères sans contact |
| `"fitted"` | `-k` | Crénage ; rapprochement des caractères jusqu’au contact |
| `"smushed"` | `-S` | Fusion selon les règles de la police, même pour les polices à crénage |
| `"universal"` | `-o` | Superposition des caractères suivants sur les précédents |
| `0`–`63` | `-m` | Mode de fusion explicite |

<!-- s:d9f3601792 -->
Les six règles de fusion horizontale sont implémentées : caractère identique, trait de soulignement, hiérarchie, paire opposée, grand X et espace insécable de fusion (hardblank).

<!-- s:889b1e19ef -->
`verticalLayout` s’applique au texte multiligne. FIGlet 2.2.5 ne rapproche jamais les lignes, la valeur par défaut est donc `"full"` ; `"fitted"`, `"smushed"` et `"universal"` implémentent les cinq règles verticales, y compris la super-fusion des traits verticaux, et `"default"` utilise celles de la police.

<!-- s:d4ec30b173 -->
Retour à la ligne et alignement

<!-- s:f799453d05 -->
`columns` (ou `width` dans `renderFiglet`) coupe le texte entre les mots, puis au milieu des mots, exactement là où `figlet -w` le ferait. `align` vaut `"left"`, `"center"` ou `"right"` ; sans largeur définie, les lignes s’alignent sur la largeur de la ligne la plus longue. Les polices de droite à gauche comme `ivrit` s’affichent de droite à gauche et s’alignent à droite ; modifiez ce comportement avec `direction`.

<!-- s:f8ccfce091 -->
Polices incluses

<!-- s:15e0b8eca7 -->
| Import | Lignes | Remarques |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Police par défaut de FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Italique |
| `@textjs/font/small` | 5 | Compacte |
| `@textjs/font/big` | 8 | Caractères grecs inclus |
| `@textjs/font/banner` | 8 | Lettrage en `#`, katakana et cyrillique |
| `@textjs/font/block`, `lean` | 8 | Contours, droits et inclinés |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Ombre portée |
| `@textjs/font/script`, `smscript` | 7, 5 | Cursive |
| `@textjs/font/mini` | 4 | Minuscule |
| `@textjs/font/bubble`, `digital` | 4, 3 | Lettres dans des cercles et des cases |
| `@textjs/font/ivrit` | 6 | Hébreu, de droite à gauche |
| `@textjs/font/term` | 1 | Entrée telle quelle |

<!-- s:a8ecd7e9c1 -->
Chaque glyphe utilise des caractères ASCII imprimables ou Latin-1, chaque sous-caractère occupe donc exactement une cellule dans la police Menlo de DevTools. `@textjs/font/all` les exporte toutes, ainsi que `BUNDLED_FONTS` pour les galeries. Les polices sont analysées au premier rendu, pas à l’import.

<!-- s:74ff0f95fa -->
Polices personnalisées

<!-- s:093892bc6a -->
Toute police FIGfont fonctionne. Récupérez-la, puis analysez-la :

<!-- s:c2f4ef471e -->
L’analyseur lit l’en-tête, les lignes de commentaire, les espaces insécables de fusion (hardblanks), les marqueurs de fin, les 102 caractères requis et les caractères étiquetés par leur code en décimal, octal ou hexadécimal. Les polices TOIlet `.tlf` sont rendues en texte brut. Privilégiez les polices dessinées avec des caractères ASCII ou de tracé de cadres ; le braille et les emoji n’occupent pas une seule cellule en largeur dans Menlo.

<!-- s:f64649f401 -->
Licences

<!-- s:adad99f0de -->
Les polices incluses sont celles de la distribution FIGlet 2.2.5, identiques octet pour octet, sous la licence BSD à 3 clauses de FIGlet. Chacune conserve ses crédits dans ses lignes de commentaire, accessibles à l’exécution via `font.comment`. Les polices populaires sans autorisation de redistribution, comme Doom, Larry 3D, ANSI Shadow et Calvin S, ne sont pas incluses.

<!-- s:2a50d4cddc -->
Vérification par rapport à `figlet`

<!-- s:111c132fa2 -->
La suite de tests reproduit 273 sorties enregistrées à partir du véritable binaire `figlet` 2.2.5 : chaque police incluse dans chaque mode de layout, le retour à la ligne, la justification, le texte de droite à gauche, le mode paragraphe et les données d’entrée des tests de régression de FIGlet. Toutes correspondent exactement.
