<!-- s:3ddc060411 -->
`text run` exécute la même application dans un terminal. Le layout, les composants, les keymaps et les gestionnaires de route sont partagés, et la sortie utilise des séquences ANSI truecolor au lieu de spans CSS `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Ajoutez un script et exécutez-le :

<!-- s:ad1db08664 -->
`text run` importe chaque fichier de `app/`, monte l’App Router avec un historique en mémoire et l’affiche en plein écran. `<Link>`, `useRouter()`, `notFound()` et `redirect()` fonctionnent sans modification, et les appels `fetch("/api/…")` de même origine exécutent vos gestionnaires de route dans le même processus. `Ctrl+C` quitte l’application et restaure votre historique de défilement. Bun est requis.

<!-- s:86d6034750 -->
Quitter avec `q`

<!-- s:f06966bd5c -->
Les utilisateurs de terminaux s’attendent à pouvoir utiliser `q`. `useApp().exit()` démonte l’application et restaure le terminal ; dans le navigateur, il démonte l’application de la console.

<!-- s:62111506f4 -->
Votre propre CLI

<!-- s:e5f8a30037 -->
Pour un composant seul, utilisez `renderToTerminal`. Cette fonction monte un élément sans l’App Router, et `fetch("/api/…")` n’atteint vos gestionnaires de route que sous `text run`, alors transmettez ses données au composant :

<!-- s:718df08aaf -->
Exécutez-le avec `bun cli.tsx`. `DeploymentsPage` récupère ses lignes, il lui faut donc `text run`.

<!-- s:76d0fa5082 -->
Les différences

<!-- s:505bd1bfa2 -->
Les terminaux rafraîchissent l’affichage plus vite (jusqu’à 60 fps au lieu d’environ 15) et adaptent la grille à la fenêtre plutôt qu’à la console ancrée. Les images nécessitent des données de pixels au lieu d’une URL. Tout le reste, y compris ce tableau de bord, utilise le même code.
