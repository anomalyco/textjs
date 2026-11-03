<!-- s:ce06f5c491 -->
L’App Router associe les fichiers de `app/` à des URL, selon les conventions de l’App Router de Next.js. La barre d’adresse et l’historique du navigateur restent synchronisés : le retour, l’avance et les liens profonds fonctionnent pendant que l’interface s’affiche dans la console.

<!-- s:00fe1aba85 -->
Les fichiers sont des routes

<!-- s:8bae70ad43 -->
Déplacez la liste dans sa propre route et ajoutez une page de paramètres :

<!-- s:141a7c73d4 -->
Un layout partagé

<!-- s:cffa0eef2d -->
`layout.tsx` enveloppe chaque page et conserve son état au fil de la navigation. Placez-y la barre supérieure et la navigation.

<!-- s:9d98f5e58a -->
`shortcut` associe une seule touche au lien. Appuyez sur `1`, `2` et `3` dans la console ; l’URL d’une véritable application changerait à chaque pression.

<!-- s:53af99b059 -->
Revenir en arrière

<!-- s:d77cce0a86 -->
`useRouter()` déclenche la navigation depuis le code. Associez `Backspace` à `router.back()` dans le layout :

<!-- s:c2b3ba00ff -->
Segments dynamiques

<!-- s:6a1dcfdf25 -->
Les dossiers `[id]` reçoivent leur valeur dans `params` :

<!-- s:8294e77b63 -->
Sur un hébergement statique, les segments dynamiques comme celui-ci nécessitent une réécriture vers `index.html`. Le chapitre 10 traite de ce sujet.
