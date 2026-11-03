<!-- s:b7512b6ff1 -->
Au fil de dix chapitres, vous construirez **Acme Deploys**, un tableau de bord de déploiement qui s’affiche dans la console DevTools. Chaque chapitre se termine avec l’application exactement dans l’état où votre code la laisse, en cours d’exécution dans la console de cette page.

<!-- s:630c586fd9 -->
Créer l’application

<!-- s:fd9f176938 -->
`create-text-app` génère la structure d’un projet avec l’App Router, TypeScript et l’interface en ligne de commande `text`.

<!-- s:9eee556b8f -->
Ouvrez `http://localhost:3000`, puis [ouvrez la console du navigateur](/docs/installation#open-the-console). La page affiche une zone de capture du focus. Votre application s’affiche dans la console.

<!-- s:7d69bcfbda -->
Votre première page

<!-- s:77df233a57 -->
Chaque route est un fichier `page.tsx` dans `app/`. Remplacez la page de démarrage par l’encadré de titre du tableau de bord :

<!-- s:efd190e3b6 -->
Enregistrez le fichier. Fast Refresh redessine la frame et conserve l’état de votre composant.

<!-- s:f5e9f4301c -->
Réagir à une touche

<!-- s:a9111ae891 -->
`useInput` reçoit chaque frappe tant que la page a le focus. Comptez les salutations :

<!-- s:c766a57c22 -->
C’est une application Text.js complète. Elle possède un état React, une boîte de layout et un appel à `console.log` par frame modifiée, et ne produit aucun message au repos.
