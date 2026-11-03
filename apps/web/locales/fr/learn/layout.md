<!-- s:b2d192945b -->
La console est une grille de cellules. Text.js utilise Yoga pour son layout, le même moteur flexbox que React Native, donc `<Box>` suit les règles CSS de flexbox. Les unités sont des cellules : `p-1` correspond à une colonne et une ligne de marge intérieure.

<!-- s:029cc40e38 -->
Une barre supérieure

<!-- s:4708298213 -->
La plupart des écrans forment une colonne : une barre d’une ligne, puis tout le reste. Donnez à la barre une hauteur fixe avec `h-1` et laissez le contenu occuper le reste avec `grow`.

<!-- s:5f781355bb -->
`<Spacer>` est une boîte qui s’étend : tout ce qui la suit est poussé vers le bord droit.

<!-- s:0c01f22e11 -->
Barre latérale et cartes

<!-- s:7bf034d9ab -->
Ajoutez une barre latérale de largeur fixe avec une bordure droite et trois cartes qui se partagent la largeur restante. `basis-0` associé à `grow` donne à chaque carte une part égale, quel que soit son contenu.

<!-- s:493f8816f0 -->
Appuyez sur `s` et `d` dans la console. Yoga recalcule le layout et seules les lignes modifiées sont redessinées, donc afficher ou masquer la barre latérale ne coûte qu’un seul `console.log`.

<!-- s:66bd0231a6 -->
Adaptation par défaut

<!-- s:7d3f8e46eb -->
La grille suit le panneau DevTools ancré. Élargissez ou agrandissez la console en faisant glisser son bord et les cartes se réorganisent. Lorsque vous avez besoin de points de rupture, `useBreakpoint()` renvoie le point de rupture actuel, en cellules.
