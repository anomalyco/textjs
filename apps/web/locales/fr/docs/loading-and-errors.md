<!-- s:510651334f -->
Les états de chargement et les limites d’erreur s’affichent dans la console. Définissez-les par segment de route avec `loading.tsx` et `error.tsx`.

<!-- s:28d65d04f2 -->
Interface de chargement

<!-- s:d64d19effc -->
Ajoutez `loading.tsx` pour afficher une interface de remplacement lorsqu’une page est suspendue.

<!-- s:4445f6cf6c -->
Erreurs

<!-- s:3834711277 -->
Ajoutez `error.tsx` pour intercepter les erreurs de rendu. Il reçoit l’erreur et une fonction `reset`.

<!-- s:5b439d0e88 -->
Page introuvable

<!-- s:c01c20f824 -->
Appelez `notFound()` pour afficher le `not-found.tsx` le plus proche.

<!-- s:dc40d65e00 -->
La Redbox dans la console

<!-- s:2ec3bf8f2e -->
En développement, les erreurs non interceptées ouvrent un panneau superposé dans la console avec le message et l’emplacement dans le code source. La correction du fichier ferme ce panneau.

<!-- s:35c9c3ef6b -->
Panneau de développement

<!-- s:e2a34a83d6 -->
En développement, la pastille `[▼]` dans le coin inférieur gauche de la console correspond au panneau de développement. Appuyez sur `F2` ou `` Ctrl+` `` pour l’ouvrir et examiner la route, les temps des frames et le layout. Désactivez-le avec `devIndicators: false`.
