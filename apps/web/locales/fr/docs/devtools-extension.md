<!-- s:263d7e4a86 -->
L’extension Text.js pour DevTools ajoute un panneau **Text.js** à côté de « Console ». Elle inspecte l’application dont le rendu s’affiche dans la console.

<!-- s:becd3b25ff -->
- **Composants :** l’arbre React de chaque racine de console, avec les props, les hooks, les clés et les nœuds de scène `tx-box` / `tx-text` sous-jacents, disposés en cellules.
- **Frame :** la frame actuelle sous forme de grille de cellules. Survolez une cellule pour voir quel composant l’a peinte. Cliquez pour sélectionner le nœud. Il est mis en surbrillance dans la console en direct.
- **Chronologie :** les temps React, de layout, de peinture et d’encodage par frame, les frames ignorées et émises, la cadence des frames et les spans `%c`.
- **Commandes :** mettre en pause et reprendre la sortie, activer ou désactiver la vue filaire du layout, fixer ou ajuster la taille de la grille, copier la frame sous forme de texte.

<!-- s:98304b8243 -->
Installation

<!-- s:2452819f12 -->
L’extension est compilée depuis `packages/devtools-extension` et chargée sans être empaquetée :

<!-- s:3754c750b3 -->
1. Ouvrez `chrome://extensions` et activez **« Mode développeur »**.
2. Cliquez sur **« Charger l’extension non empaquetée »** et sélectionnez `packages/devtools-extension/dist`.
3. Rechargez votre application et ouvrez DevTools. Le panneau **Text.js** apparaît dès que la page crée une racine de console.

<!-- s:e0c59fa53a -->
La compilation génère aussi `release/textjs-devtools-<version>.zip`, prêt pour le Chrome Web Store.

<!-- s:364bc3ef6f -->
Composants

<!-- s:e1204a3559 -->
Sélectionnez un composant pour voir ses props, ses hooks dans l’ordre des appels (`State`, `Ref`, `Memo`, `Effect`, etc., avec leurs valeurs actuelles) et le nœud de scène qu’il rend, avec sa position, sa taille et les retraits de sa boîte en cellules. Le survol d’une ligne met le nœud en surbrillance dans la console. **Nœuds hôtes** affiche ou masque les éléments `tx-box` et `tx-text` entre les composants.

<!-- s:77b62adc9c -->
L’arbre s’actualise après les commits tant que le panneau est ouvert. Les valeurs sont des résumés destinés à l’affichage, pas des objets actualisés en direct.

<!-- s:a0d819048c -->
Frame

<!-- s:2cceea6000 -->
L’inspecteur de frame dessine le tampon de cellules du moteur de rendu : chaque glyphe, couleur de premier plan, arrière-plan et attribut. Le survol d’une cellule indique son caractère et ses couleurs, le nœud de scène qui la recouvre dans l’ordre de peinture (en respectant `overflow`, les décalages de défilement et `zIndex`), ainsi que les composants qui ont rendu ce nœud. Un clic sélectionne le nœud dans **Composants** et le met en surbrillance dans la console en direct avec la superposition de surbrillance du moteur de rendu.

<!-- s:57a8990372 -->
Chronologie

<!-- s:2187cf7a17 -->
Chaque barre représente une frame du moteur de rendu :

<!-- s:f53def4922 -->
| Phase | Mesure |
| --- | --- |
| React | Travail React synchrone exécuté au début de la frame |
| Layout | Layout Yoga |
| Peinture | Rastérisation de la scène dans le tampon de cellules |
| Encodage | Construction de la chaîne de format `%c` et appel à `console.log()` |

<!-- s:9b988f3cfb -->
Les frames ignorées sont estompées : rien n’a changé, donc rien n’a été écrit dans la console. Le graphique de cadence montre l’écart entre les frames émises par rapport à l’intervalle minimal de 66 ms.

<!-- s:8abccb04ec -->
Les mesures de temps s’arrêtent à `console.log()`. Le formatage et la peinture du message ont lieu dans DevTools et ne sont pas observables depuis la page, donc la chronologie ne les affiche pas. Les rendus concurrents qui effectuent un commit entre les frames sont comptés comme des commits, sans mesure de durée.

<!-- s:5ae438610c -->
Fonctionnement

<!-- s:1dda342130 -->
Comme React DevTools, l’extension installe un hook global avant l’exécution de la page :

<!-- s:9a7af3e89c -->
Chaque racine de console s’y enregistre. La première racine d’une page charge le code qui communique avec le panneau (environ 5 ko gzip) et s’enregistre une fois ce code chargé. Les racines suivantes s’enregistrent à leur création. Sans l’extension, le hook n’existe pas : une racine vérifie donc sa présence une fois, ne charge rien et n’effectue aucun travail par frame. Lorsque l’extension est installée mais que le panneau est fermé, chaque frame coûte une lecture de propriété. Les arbres et les frames ne sont calculés que lorsque le panneau les demande.

<!-- s:843fc9a8ad -->
Les messages circulent de la page → script de contenu → service worker → panneau. Les scripts de contenu s’exécutent sur chaque page pour que le hook existe avant le démarrage de votre application. C’est le seul accès demandé par l’extension. Elle ne charge aucun code distant et n’envoie rien hors de la machine.

<!-- s:e425f181df -->
Confidentialité

<!-- s:f2cd52a110 -->
L’extension ne collecte aucune donnée. Elle n’effectue aucune requête réseau, ne stocke rien et n’intègre aucun outil d’analyse. Les arbres de composants, les frames et les mesures de temps circulent uniquement entre la page et le panneau DevTools du même navigateur, et sont supprimés lorsque vous fermez DevTools. **Copier la frame** écrit le texte de la frame dans votre presse-papiers lorsque vous cliquez dessus.

<!-- s:639d5ea4c0 -->
Limites

<!-- s:05616a1196 -->
- Chrome et navigateurs basés sur Chromium, version 111 ou ultérieure.
- Les applications démarrées avant l’installation de l’extension nécessitent un rechargement.
- Seule la frame principale d’un onglet est inspectée.
- La chronologie enregistre les frames une fois le panneau connecté.
- Les durées proviennent de `performance.now()`, dont les navigateurs réduisent la précision à environ 0,1 ms.
