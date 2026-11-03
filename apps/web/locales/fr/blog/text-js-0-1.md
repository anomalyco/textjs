<!-- s:00c66df67a -->
Le tag Text.js 0.1 est publié. C’est la première version qui réunit les trois couches : `@textjs/core` dessine des frames dans la console, `@textjs/react` effectue le rendu de React 19 dans ces frames, et `textjs` ajoute un App Router et une CLI.

<!-- s:1aa5bba86a -->
L’App Router

<!-- s:4631fd1deb -->
Les routes sont des dossiers dans `app/`, selon les conventions de l’App Router de Next.js. Voici le modèle `dashboard` de `create-text-app` :

<!-- s:18fa0019a3 -->
Un layout enveloppe toutes les pages qu’il contient et conserve son état au fil de la navigation. `<Link>` accepte un `shortcut`, ce qui permet de suivre le lien avec une seule touche, et `activeClassName` définit le style du lien vers la route actuelle :

<!-- s:5587be498a -->
Les segments dynamiques fonctionnent comme dans Next.js. `[id]` devient un paramètre, `[...slug]` capture le reste du chemin et `[[...slug]]` correspond aussi au parent. Les segments statiques ont priorité sur les segments dynamiques, et les groupes de routes comme `(marketing)` organisent les fichiers sans rien ajouter à l’URL.

<!-- s:3a9a93d850 -->
`loading.tsx` et `error.tsx` enveloppent un segment dans une limite Suspense et une limite d’erreur. Le composant d’erreur reçoit l’erreur et une fonction `reset` :

<!-- s:142b529e3f -->
Les gestionnaires de route se trouvent dans `app/api` et renvoient une `Response` standard :

<!-- s:fe0c29445c -->
Le routeur synchronise `window.location` via `history.pushState`, pour que les boutons « Précédent » et « Suivant » ainsi que les liens profonds fonctionnent, et écrit `metadata.title` dans `document.title`. L’application dessine dans la console, et la page héberge une zone de focus qui recueille les saisies.

<!-- s:6109f13d80 -->
La CLI

<!-- s:bbc9d4be2d -->
- `text dev` démarre Vite avec React Fast Refresh. L’enregistrement d’un fichier met à jour la console sur place.
- `text build` génère un build de production de l’application et de ses gestionnaires de route.
- `text start` sert le build et les gestionnaires de route.

<!-- s:1e1161891f -->
`create-text-app` génère la structure d’un projet à partir du modèle `starter` ou `dashboard`.

<!-- s:e2a33d088a -->
L’inspecteur

<!-- s:cdb3155210 -->
Appuyez sur `` Ctrl+` `` ou `F2` dans une application en cours d’exécution pour ouvrir l’inspecteur `[▼]` dans la console. Il affiche la route correspondante et ses paramètres, la taille de la frame, le nombre de spans et les durées des phases, ainsi que le nombre de frames ignorées par le filtre de modifications. `W` dessine le layout Yoga sous forme filaire.

<!-- s:c2600ceabc -->
Également dans la version 0.1

<!-- s:289b0a9973 -->
`@textjs/react` fournit des composants en PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), des utilitaires `className` de style Tailwind qui fonctionnent en cellules, et des thèmes. Le layout repose sur Yoga en WebAssembly.

<!-- s:8ad0f2154c -->
La liste complète se trouve dans le [journal des modifications](/changelog#v0-1-0).
