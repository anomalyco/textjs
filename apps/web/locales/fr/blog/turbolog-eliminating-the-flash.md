<!-- s:fe58dc6ae4 -->
Chaque frame de Text.js correspond à un appel à `console.log`. Jusqu’à la version 0.4, chaque frame était aussi précédée de `console.clear()`. Sous charge, la console clignotait en devenant vide entre les frames.

<!-- s:7a82fe5fe2 -->
Mesurer un clignotement

<!-- s:1d16f5a106 -->
Pour le mesurer, nous avons créé `bench/devtools`. Il lance Chrome for Testing, ouvre la véritable interface de DevTools sous forme de page et l’instrumente :

<!-- s:4da6ef7009 -->
- À chaque `requestAnimationFrame` dans l’interface de DevTools, il vérifie si une frame complète de 32 lignes se trouve dans la zone visible de la console. Les affichages sans frame complète sont comptés comme des affichages vides.
- Il décode ensuite les frames de `Page.startScreencast` pour confirmer le résultat en pixels.
- Chaque frame contient `FRAME:<id> · T:<epochMs>` à la ligne 0, pour que l’interface puisse déterminer quelle frame elle affiche et avec quel retard.

<!-- s:cb3c553c37 -->
Avec `console.clear()` avant chaque frame, un tableau de bord de 100×32 à 15 fps était vide lors de **70,6 %** des affichages de DevTools. À 60 fps, **81,1 %**.

<!-- s:7076ddd27d -->
La cause

<!-- s:1e65554dc0 -->
Le composant `ConsoleView` de DevTools traite les deux appels différemment :

<!-- s:56484b5ac3 -->
1. `console.clear()` appelle `consoleCleared()`, qui invalide la zone visible **de manière synchrone**. Tous les messages disparaissent dans la même tâche.
2. `console.log()` appelle `addConsoleMessage()`, qui programme seulement un rafraîchissement via `viewportThrottler`, un `Throttler` avec un délai de **50 ms**.

<!-- s:8a656fe37a -->
Chaque frame supprime donc l’ancienne immédiatement et affiche la nouvelle plus tard. À 15 fps, environ 50 ms sur 66 ms n’affichent rien.

<!-- s:8bb24ac9a4 -->
Ajouter les frames à la suite

<!-- s:1092cc0920 -->
Depuis la version 0.4, Turbolog ajoute les frames à la suite. DevTools reste en bas de la console, si bien que la nouvelle frame remplace l’ancienne en un seul affichage. Un span initial de largeur nulle avec `margin-top:100vh` (le rideau) repousse les frames précédentes hors de la zone visible et termine sa propre ligne pour que le lien vers la source de DevTools ne réduise jamais la largeur de la ligne 0.

<!-- s:6e8cb684de -->
La console doit tout de même être vidée à un moment donné. L’effacement n’a lieu qu’à la première frame, après `invalidate()`, au repos une fois que 100 frames se sont empilées, et à la limite stricte de 300.

<!-- s:58637d56ab -->
Adapter la cadence au limiteur

<!-- s:14c65af87d -->
Envoyer des frames plus vite que DevTools ne peut les afficher n’accélère rien. Un message qui arrive pendant que le limiteur attend relance celui-ci, ce qui entraîne la perte de frames : à 60 fps, DevTools a affiché 67 des 295 frames émises. Turbolog espace les frames d’au moins **66 ms**, soit environ 15 fps, et continue de traiter les entrées discrètes par un rendu synchrone lorsque l’intervalle le permet.

<!-- s:8a90fd55c3 -->
Rompre le verrouillage de phase

<!-- s:e96505e7a5 -->
Les effacements ajoutaient aussi environ 50 ms de retard à chaque frame suivante. Après un effacement, DevTools insère une ligne synthétique `Console was cleared`. Elle occupe le créneau immédiat du limiteur et reporte la frame suivante sur le minuteur de 50 ms, et à une cadence régulière de 66 ms, chaque frame suivante reste calée sur ce minuteur.

<!-- s:57527b9818 -->
Le moteur de rendu attend désormais **110 ms** une seule fois après chaque effacement. Ensuite, chaque frame arrive plus de 50 ms après la fin du rafraîchissement précédent et emprunte le chemin immédiat de DevTools. Le retard médian d’affichage est passé de **63 ms à 10,4 ms**.

<!-- s:003645d0bf -->
Résultats

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, tableau de bord de 100×32, véritable interface de DevTools :

<!-- s:9ee75054af -->
| Mode | FPS | Affichages vides | Affichées / émises | Retard p50 |
| :-- | --: | --: | --: | --: |
| Effacement par frame | 15 | 70,6 % | 70 / 75 | 60,4 ms |
| **Ajout à la suite (1.0)** | **15** | **1,0 %** | **74 / 75** | **10,4 ms** |
| Effacement par frame | 60 | 81,1 % | 45 / 300 | 9,8 ms |
| Ajout à la suite, sans cadence imposée | 60 | 0,8 % | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Le 1 % restant correspond à la première frame, qui efface volontairement la console. Ses affichages vides correspondent à la ligne `Console was cleared`, pas à une console vide.

<!-- s:315471c65a -->
Moins de propriétés par span

<!-- s:e210e7e85d -->
Le code source de DevTools a révélé un coût supplémentaire. Il copie chaque *propriété détaillée* d’un style `%c` sur chaque conteneur de ligne, si bien que les raccourcis `font:` et `margin:` se développaient en environ 33 propriétés par span. Les spans n’utilisent désormais que des propriétés détaillées, environ 7 chacun, avec des couleurs hexadécimales.

<!-- s:5b341c4930 -->
Le mode d’ajout à la suite est sorti avec Text.js 0.4, et le correctif du verrouillage de phase arrive dans la version 1.0. Aucun des deux ne nécessite de modifier le code de l’application.
