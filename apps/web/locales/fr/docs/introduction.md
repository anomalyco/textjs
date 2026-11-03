<!-- s:b3d5e86364 -->
Text.js est un framework React pour les applications qui s’affichent dans la console DevTools avec `console.log`.

<!-- s:34bf1ea7dd -->
L’aperçu est interactif. Cliquez dessus et appuyez sur `↑`.

<!-- s:0bccbd98be -->
Fonctionnalités incluses

<!-- s:d3708efc68 -->
- **React 19** : rendu concurrent, Suspense et périmètres d’erreurs.
- **App Router** : layouts, pages, segments dynamiques et gestionnaires de route.
- **Layout Yoga** : flexbox en WebAssembly, aligné sur des cellules entières.
- **Turbolog** : un appel à `console.log` par frame modifiée.
- **Interface de la console** : la page héberge uniquement une zone de focus et un champ de saisie masqué.

<!-- s:5ae438610c -->
Fonctionnement

<!-- s:75f47f9f8c -->
L’état se propage vers le bas : React, puis le layout, puis un tampon de cellules, puis la console.

<!-- s:25c55610d2 -->
Les frames inchangées sont ignorées, donc les applications inactives n’écrivent rien dans la console.

<!-- s:3a5d9cbc49 -->
Étapes suivantes

<!-- s:b849362c77 -->
- [Installation](/docs/installation) : créez votre première application.
- [Routage](/docs/routing) : pages, layouts et navigation.
- [Turbolog](/docs/turbolog-engine) : encodage des frames.
- [OpenCode](/docs/opencode) : une interface textuelle d’agent conçue avec Text.js.
