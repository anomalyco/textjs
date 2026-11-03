<!-- s:e9f791b208 -->
`text run` affiche une application App Router dans un terminal. Le layout, les composants, les keymaps et les gestionnaires de route sont partagés avec le navigateur. La sortie utilise ANSI en couleurs vraies plutôt que des spans `%c`.

<!-- s:7d8aa376e3 -->
Appuyez sur `Ctrl+C` pour quitter. `text run` nécessite Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importe chaque fichier de `app/`, monte l’App Router avec un historique en mémoire et l’affiche en plein écran. `<Link>`, `useRouter()`, `notFound()` et `redirect()` fonctionnent sans modification.

<!-- s:75b65c161d -->
Les appels `fetch("/api/...")` de même origine exécutent vos gestionnaires `route.ts` dans le même processus, exactement comme le ferait `text dev`. Les autres URL passent par le réseau.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Pour un seul composant ou votre propre CLI :

<!-- s:e62e62bfaa -->
`useApp().exit()` démonte l’application et restaure le terminal.

<!-- s:082b75dda7 -->
| Option | Description |
| :-- | :-- |
| `stdin` / `stdout` | Par défaut : `process.stdin` / `process.stdout` |
| `cols` / `rows` | Taille fixe (par défaut : suivre le terminal) |
| `altScreen` | Restauration de l’historique de défilement à la sortie (par défaut `true`) |
| `mouse` | Défilement à la molette (par défaut `true`) |
| `exitOnCtrlC` | Par défaut `true` |
| `fps` | Limite de frames (par défaut `60`) |
| `patchConsole` | Mise en attente de `console.*` jusqu’à la sortie (par défaut `true`) |
| `theme` / `transparent` | Comme dans `createConsoleRoot` |

<!-- s:e34e364b9c -->
Sortie

<!-- s:2ac174afda -->
Chaque frame est comparée à la précédente, ligne par ligne. Seules les lignes modifiées sont écrites, entourées de marqueurs de sortie synchronisée pour que les terminaux qui les prennent en charge n’affichent jamais une frame partiellement dessinée. Les applications inactives n’écrivent rien.

<!-- s:99a3c4d459 -->
Entrée

<!-- s:4a9817d820 -->
L’entrée standard en mode brut est analysée pour produire les mêmes événements que le navigateur : flèches et touches de fonction avec modificateurs, combinaisons `Alt`, collage encadré, molette de souris SGR et protocole clavier kitty. `TerminalInputParser` et `parseTerminalInput` sont exportés si vous en avez besoin ailleurs.

<!-- s:6b688e229b -->
Différences

<!-- s:56ed51fed3 -->
| Fonctionnalité | DevTools | Terminal |
| :-- | :-- | :-- |
| Cadence des frames | ~15 fps | Jusqu’à `fps` |
| Taille de la grille | Console ancrée | Fenêtre du terminal |
| `<Image src>` | Chargement via canvas | Utilisation de `pixels` |
| `console.log` | Vos frames | Mise en attente jusqu’à la sortie |
