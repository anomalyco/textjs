<!-- s:d7ae3c23f0 -->
Chaque cellule possède un caractère, une couleur de premier plan, un arrière-plan et un ensemble d’attributs. Text.js les compile en spans CSS `%c`, pour que la console affiche de vraies couleurs, du gras et de l’italique.

<!-- s:45433c474e -->
Attributs du texte

<!-- s:32c37753d8 -->
`<Text>` accepte `bold`, `dim`, `italic`, `underline` et `strikethrough`. Les éléments `<Text>` imbriqués deviennent des spans stylisés au sein d’une même ligne.

<!-- s:661b7c60b6 -->
Tokens de thème

<!-- s:f312d78237 -->
La prop `color` accepte les valeurs hexadécimales, les noms de couleurs simples (`emerald`) et les tokens de thème ; les nuances de la palette Tailwind passent par des classes (`text-emerald-400`). Les tokens suivent le thème actif, privilégiez-les donc pour tout ce qui est sémantique. Ajoutez un composant de statut :

<!-- s:4d4d36a0bd -->
Une carte de déploiement

<!-- s:108bb076c9 -->
`bg-surface` détache la carte de l’arrière-plan. L’identifiant du déploiement reprend la couleur du statut, passe en italique pendant la compilation et est barré en cas d’erreur.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` termine les longs messages de commit par `…` au lieu de les faire passer sur une deuxième ligne.

<!-- s:087abce968 -->
Thèmes

<!-- s:8f993e0ab8 -->
Cinq thèmes sont fournis avec Text.js : Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT et Geist Light. Appuyez sur `t` dans la console pour passer de l’un à l’autre. Toute la frame est redessinée avec la nouvelle palette, car chaque couleur ci-dessus est un jeton de thème.
