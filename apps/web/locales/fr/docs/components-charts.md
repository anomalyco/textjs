<!-- s:8f99ab8d5a -->
Les graphiques sont dessinés avec des éléments de bloc. Les barres utilisent huit niveaux par cellule, et les lignes une grille de 2×2 points par cellule.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Graphiques linéaires en matrice de points avec un axe des ordonnées et une légende.

<!-- s:977778a73f -->
| Prop | Description |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Raccourci pour une seule série |
| `height` | Lignes (par défaut `8`) |
| `min` / `max` | Bornes fixes (par défaut : les données) |
| `axis` | Axe des ordonnées avec libellés min / max |
| `formatValue` | Libellés de l’axe (par défaut `1.2k`) |
| `marker` | `quadrant` (par défaut) ou `braille` |

<!-- s:3827b070cb -->
`braille` regroupe 2×4 points par cellule. Utilisez-le dans les terminaux : Menlo, la police de la console DevTools sur macOS, ne contient pas de braille, et les glyphes de remplacement sont plus larges qu’une cellule.

<!-- s:a1d8752203 -->
Les couleurs des séries sont par défaut `accent`, `success`, `warning`, `info` et `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Barres horizontales avec libellés et valeurs alignés, avec une précision d’un huitième de cellule.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Remplit sa largeur avec les points les plus récents. Une valeur de `height` supérieure à `1` produit une aire remplie.

<!-- s:9b515e6ed1 -->
`sparkline(values)` renvoie la même sparkline sous forme de chaîne de caractères.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Description |
| :-- | :-- |
| `value` / `max` | Progression (à omettre pour une progression indéterminée) |
| `variant` | `block` (continu) `line` `thin` |
| `width` | Cellules (par défaut : toute la largeur) |
| `label` | Texte au début |
| `formatValue` | Texte à la fin (par défaut `42%`) |

<!-- s:39c076d22f -->
Les barres indéterminées défilent au rythme des frames du moteur de rendu et s’arrêtent lorsque la sortie est en pause.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolation des couleurs par cellule. Les chaînes sur plusieurs lignes partagent un même dégradé, ce qui convient à `<AsciiFont>`.

<!-- s:99155d62a4 -->
Dégradés nommés : `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Les consoles de Chromium et Firefox dessinent l’image sous forme de sprite de pixels. Le pixel art (256 couleurs ou moins, sans pixels partiellement transparents) conserve jusqu’à 8 × 16 pixels par cellule, et les photos jusqu’à 4 × 8. Safari, les terminaux, les copies en texte brut et les pages avec [`runtime = "server"`](/docs/server-rendering) utilisent des demi-blocs `▀` : chaque cellule contient deux pixels, celui du haut au premier plan et celui du bas en arrière-plan. Passez `renderMode="halfblock"` pour dessiner des demi-blocs partout, comme le faisait `<Image>` en 1.3.

<!-- s:70bb4fc454 -->
| Prop | Description |
| :-- | :-- |
| `src` | URL de l’image (navigateur uniquement) |
| `pixels` | RGBA brut sous la forme `{ width, height, data }`, 4 octets par pixel dans l’ordre des lignes |
| `width` / `height` | Largeur en cellules, hauteur en lignes. Passez l’une des deux pour conserver les proportions, ou aucune pour 1 × 2 pixels par cellule (`src` redimensionne à 256 × 256 px maximum) |
| `fit` | `contain` (par défaut), `cover` ou `fill` |
| `alt` | Texte affiché pendant le chargement de `src` ou en cas d’échec |
| `renderMode` | `auto` (par défaut : sprite si pris en charge, demi-blocs `▀` ailleurs) ou `halfblock` |

<!-- s:c106665c64 -->
`<Image>` accepte aussi les props de layout.

<!-- s:20dac26bff -->
`src` charge les images via un canvas, les images d’une autre origine nécessitent donc CORS. `pixels` accepte du RGBA brut partout, y compris dans le terminal.

<!-- s:4e3b06ef0e -->
Une image est aussi dessinée en demi-blocs dans Chromium et Firefox lorsqu’elle ne peut pas former un seul sprite :

<!-- s:00d2e660eb -->
- Deux images côte à côte sur les mêmes lignes, comme dans une galerie.
- Une photo avec du texte à côté. Le pixel art à côté du texte reste un sprite.
- Une image rognée par une boîte `overflow="hidden"`, ou partiellement recouverte par une autre boîte.
- Des pixels transparents sur du texte ou sur plusieurs couleurs d’arrière-plan.

<!-- s:dd4fefaac0 -->
`<Pixels>` (expérimental)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` exporte `<Pixels>` pour les tampons de frame `0xRRGGBBAA` en temps réel, comme ceux des jeux, des émulateurs et de la vidéo. Écrivez les pixels compactés directement dans `source.data` et incrémentez `frame` pour redessiner.

<!-- s:2d12b69e81 -->
| Prop | Description |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` dans l’ordre `0xRRGGBBAA` |
| `frame` | Compteur de frames ; à incrémenter après modification de `source.data` |
| `width` / `height` | Taille de la boîte en cellules et en lignes |
| `fit` | `contain` (par défaut) ou `fill` |
| `pixelAspect` | Largeur affichée divisée par la hauteur d’un pixel source (par défaut `1`) |
| `palette` | Palette `PackedColor[]` facultative servant à quantifier les couleurs |
| `sample` | Filtre de repli en demi-blocs : `nearest` (par défaut) ou `average` |
| `renderMode` | `auto` (par défaut : sprite si pris en charge, demi-blocs `▀` ailleurs) ou `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` dessine un sprite pixellisé dans Chromium, et dans Firefox selon les règles de style de sa console (performances non mesurées), et utilise des demi-blocs `▀` en repli dans Safari, les terminaux, les copies en texte brut et les pages avec [`runtime = "server"`](/docs/server-rendering). Passez `renderMode="halfblock"` pour dessiner des demi-blocs partout.

<!-- s:5d2bbbc47b -->
Pour dessiner des pixels sans React, importez `drawPixels` depuis `@textjs/core/experimental` ainsi que `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` et `PixelRect`. Son option `encoding: "rgba"` conserve plus de 256 couleurs et les niveaux de transparence des images fixes, et `fallback` dessine vos propres cellules partout où le sprite ne peut pas être affiché. Consultez [Changements incompatibles](/docs/support-policy#breaking-changes) pour connaître les règles de versionnement des exports expérimentaux.
