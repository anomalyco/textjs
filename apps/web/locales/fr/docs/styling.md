<!-- s:581711536b -->
Stylisez les composants avec les utilitaires `className` ou des props typées. Les applications Text.js n’ont pas de feuilles de style.

<!-- s:e0ac1db626 -->
Utilitaires

<!-- s:2de571e2bf -->
`className` accepte des utilitaires de type Tailwind. Une unité correspond à une cellule.

<!-- s:785b2c3db0 -->
| Catégorie | Exemples |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Espacement | `p-1` `px-2` `mt-1` |
| Bordures | `border` `rounded` `border-accent` |
| Couleur | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Props typées

<!-- s:4963259a42 -->
Chaque utilitaire possède une prop. Les props ont priorité sur `className`.

<!-- s:15a3834a24 -->
Couleurs

<!-- s:d333dad27a -->
Utilisez des valeurs hexadécimales, des noms Tailwind ou des tokens de thème comme `fg`, `muted`, `surface`, `accent`, `success` et `danger`. Les tokens suivent le thème actif.

<!-- s:087abce968 -->
Thèmes

<!-- s:abba2a3188 -->
Cinq thèmes prédéfinis sont intégrés : `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` et `amberCrt`.

<!-- s:5dc490305b -->
Zones d’affichage adaptatives

<!-- s:419fb844db -->
Les applications remplissent par défaut la console DevTools ancrée (`viewport.responsive`) et se redimensionnent lorsque vous faites glisser le panneau. Organisez le layout avec flex et lisez ses dimensions au besoin :

<!-- s:3d847eadf9 -->
La page ne peut voir qu’un panneau ancré. Les DevTools détachés, le zoom des DevTools et la barre latérale de « Console » lui sont invisibles, donc l’application utilise `viewport.width × viewport.height` (par défaut `120×36`) ou les dimensions que vous fixez :
