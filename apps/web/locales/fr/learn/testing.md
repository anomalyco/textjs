<!-- s:329a4263b5 -->
`@textjs/app/testing` effectue le rendu de votre application hors écran, simule des appuis sur les touches et renvoie la frame en texte brut. Les tests s’exécutent sans navigateur ni DevTools.

<!-- s:22ea22bed4 -->
Votre premier test

<!-- s:79e830f1ed -->
La page récupère `/api/deployments`, qui n’a pas de serveur sous `bun test`, donc `beforeEach` remplace `fetch` par un simulacre renvoyant les mêmes données. `render` utilise par défaut une grille de 80×24. `lastFrame()` renvoie la frame entière sous forme de texte, `lines()` la renvoie ligne par ligne, et `cell(x, y)` vous donne le caractère et les couleurs d’une seule cellule.

<!-- s:e8fdbe8cac -->
Simuler des appuis sur les touches

<!-- s:8db83c740c -->
`press` accepte les mêmes chaînes de touches que `useKeymap`. Chaque appel s’exécute dans `act()` et traite toutes les frames résultantes, pour que l’assertion suivante voie la mise à jour.

<!-- s:7c6ee6548f -->
Le tableau affiche `›` devant la ligne en surbrillance, ce qui permet au test ↓ de trouver cette ligne et de vérifier son commit. Les chiffres trient selon une colonne, et la quatrième colonne est Build.

<!-- s:5350d592a4 -->
Exécuter les tests

<!-- s:88993d5c83 -->
Cela fonctionne avec tout outil d’exécution prenant en charge les tests `async` : Bun, Vitest ou Jest. Dans la console, appuyez sur `Enter` pour exécuter la suite et sur `f` pour faire échouer un test et voir à quoi ressemble un échec.

<!-- s:26f93acae3 -->
Snapshots

<!-- s:b458212c22 -->
`toAnsi()` renvoie la frame au format ANSI truecolor, ce qui produit des snapshots détectant aussi les régressions de couleur :
