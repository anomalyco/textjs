<!-- s:8f3fd7167d -->
L’extension Text.js pour VS Code affiche la frame de votre console à côté du code. Elle reflète l’application exécutée avec `text dev`, ou effectue elle-même le rendu du fichier ouvert si rien n’est en cours d’exécution. Elle ajoute aussi la génération de fichiers App Router, des extraits de code et des liens pour les codes d’erreur `TX###`.

<!-- s:98304b8243 -->
Installation

<!-- s:80e247d2f7 -->
Installez [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) depuis le Visual Studio Marketplace. Dans VS Code, ouvrez la vue Extensions (`⌘⇧X`) et recherchez `textjs.vscode-textjs`, ou exécutez :

<!-- s:fd2344ec36 -->
Elle s’active dans tout dossier contenant une application Text.js : un fichier `text.config.ts`, ou un paquet qui dépend de `@textjs/app` et possède un répertoire `app/`. Les monorepos contenant plusieurs applications fonctionnent aussi.

<!-- s:74f1530aa8 -->
Aperçu en direct

<!-- s:d9807ea49d -->
Ouvrez un fichier `page.tsx`, `layout.tsx` ou un composant et lancez **Text.js: Open Preview** (`⌘K V`), ou cliquez sur le bouton d’aperçu dans la barre de titre de l’éditeur. Le panneau dessine la frame avec le même habillage DevTools et les mêmes cellules Menlo que la console de votre navigateur.

<!-- s:2f69f76b80 -->
L’aperçu reçoit ses frames de l’une de deux sources. Le badge de la barre d’outils indique laquelle est active :

<!-- s:f81cef21bf -->
| Source | Quand | Ce que vous voyez |
| :-- | :-- | :-- |
| **En direct** | `text dev` est en cours d’exécution et l’application est ouverte dans un onglet du navigateur | L’application réelle, avec son état, ses données et la taille de sa grille |
| **Sans navigateur** | Aucun serveur de développement ou aucun onglet ouvert | Le fichier ouvert, rendu par l’extension aux dimensions du panneau |

<!-- s:f40888c2bb -->
`auto` (par défaut) utilise le mode en direct si possible, et le mode sans navigateur sinon. Fixez l’un des deux depuis le badge ou avec `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Clavier

<!-- s:9ce66a1aa7 -->
Cliquez sur la console pour envoyer les touches à l’application : flèches, `Tab`, raccourcis, saisie et collage fonctionnent comme dans le navigateur. Cliquez en dehors de la console pour arrêter. Les raccourcis de l’éditeur tels que `⌘P` et `⌘⇧P` restent transmis à VS Code. Faire défiler au-dessus de la console envoie des événements de molette.

<!-- s:0910b5fd48 -->
Dans le champ d’adresse, vous pouvez saisir une route, telle que `/deployments/dpl_a1`, pour naviguer dans l’une ou l’autre source.

<!-- s:4507d73bb4 -->
Mode en direct

<!-- s:787b87d328 -->
Lorsqu’un aperçu est ouvert, le serveur de développement demande aux onglets connectés de transmettre leurs frames en continu. Les onglets n’envoient que les lignes modifiées et cessent tout envoi à la fermeture de l’aperçu, donc une application sans aperçu ouvert ne subit aucun surcoût. L’enregistrement d’un fichier passe par Fast Refresh, et l’aperçu se met à jour avec l’onglet.

<!-- s:86ae14b746 -->
Activez **Suivre** (`textjs.preview.followEditor`) pour déplacer l’onglet du navigateur vers la route du fichier `page.tsx` que vous modifiez.

<!-- s:68839106d6 -->
Les onglets en arrière-plan ne reçoivent aucune frame d’animation et conservent donc normalement leurs frames jusqu’à redevenir visibles. Lorsqu’un aperçu les observe, un onglet en arrière-plan dessine une frame dès qu’une entrée arrive, donc la saisie dans l’aperçu continue de déclencher des mises à jour. Les animations d’un onglet en arrière-plan se mettent à jour environ une fois par seconde. Placez l’application dans sa propre fenêtre pour conserver des animations régulières.

<!-- s:1ae6e7077f -->
Mode sans navigateur

<!-- s:1cddf967be -->
L’extension lance un petit programme d’exécution dans votre projet. Il charge les fichiers de route avec les versions de Vite et de `@textjs/app` du projet, donc les alias, TypeScript et JSX se comportent comme dans `text dev`. Il monte App Router à la route du fichier ouvert, avec ses layouts, en utilisant un historique en mémoire :

<!-- s:23d9451fef -->
| Fichier | Aperçu |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (les segments dynamiques utilisent leur nom) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | L’export par défaut, ou le premier export en PascalCase, sans props |

<!-- s:f111cbfc61 -->
Les appels `fetch("/api/...")` de même origine exécutent vos gestionnaires `route.ts` dans le même processus, comme avec [`text run`](/docs/terminal). La grille suit les dimensions du panneau, et l’enregistrement de n’importe quel fichier de l’application déclenche un nouveau rendu. Les erreurs s’affichent au-dessus de la frame, avec des liens vers leurs pages `TX###`.

<!-- s:36cd3f2bb4 -->
Commandes

<!-- s:d542a683ff -->
| Commande | Description |
| :-- | :-- |
| Text.js : Démarrer le serveur de développement | Exécute votre script `dev` (ou `text dev`) dans un terminal |
| Text.js : Arrêter le serveur de développement | Arrête un serveur de développement lancé depuis VS Code |
| Text.js : Ouvrir l’aperçu | Ouvre l’aperçu en direct du fichier actif |
| Text.js : Ouvrir dans la console du navigateur | Ouvre la route actuelle sur le serveur de développement. Ensuite, [ouvrez la console du navigateur](/docs/installation#open-the-console) |
| Text.js : Nouvelle page | `app/<route>/page.tsx` avec des métadonnées et des `params` typés |
| Text.js : Nouveau layout | `app/<route>/layout.tsx` |
| Text.js : Nouveau gestionnaire de route | `app/<route>/route.ts` avec `GET` et `POST` |
| Text.js : Nouvelle interface de chargement / Limite d’erreur / Page introuvable | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Les commandes de génération de fichiers figurent aussi dans le menu contextuel des dossiers de l’Explorateur. Elles acceptent les segments [App Router](/docs/routing) tels que `settings`, `blog/[slug]`, `docs/[...path]` et `(marketing)/about`, et refusent de placer une `page` et un `route.ts` dans le même segment. Les projets JavaScript (sans `tsconfig.json`) reçoivent des fichiers `.jsx` et `.js`.

<!-- s:9ba0c1b237 -->
Extraits de code

<!-- s:193db2a68e -->
| Préfixe | Insertion |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Fichiers de route nommés d’après leur dossier |
| `txc` | Composant de console nommé d’après le fichier |
| `txroute`, `txroutep` | Gestionnaires de route, avec ou sans paramètres |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Composants |
| `input`, `select`, `tabs` | Composants interactifs |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooks |
| `metadata`, `txconfig` | Métadonnées de route et `text.config.ts` |

<!-- s:a6e574a6aa -->
Codes d’erreur

<!-- s:5e9e2a4649 -->
Survolez un code `TX###` où qu’il soit : dans le code source, les journaux, le panneau Sortie ou une trace de pile collée. L’infobulle affiche son titre, son message et son paquet, avec un lien vers sa page sur textjs.org. Chaque code est aussi un lien (clic avec `⌘`).

<!-- s:b67d013d7e -->
Barre d’état

<!-- s:be63ef7ae2 -->
L’élément `▼` affiche l’état du serveur de développement et les dimensions de la grille de la console, par exemple `▼ :3000  120×36`. Les onglets signalent leurs dimensions au serveur de développement à chaque changement, même sans aperçu ouvert. Cliquez sur l’élément pour accéder aux commandes principales.

<!-- s:5b827aed4d -->
Paramètres

<!-- s:457ec968c0 -->
| Paramètre | Valeur par défaut | Description |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` ou `headless` |
| `textjs.preview.followEditor` | `false` | Mode en direct : suivre la route modifiée |
| `textjs.preview.fontSize` | `12` | Taille de police des cellules (DevTools utilise 12) |
| `textjs.preview.runtime` | | Binaire Node.js pour les aperçus sans navigateur (par défaut : celui fourni avec VS Code) |
| `textjs.devServer.url` | | URL du serveur de développement (par défaut : recherche sur les ports 3000–3010). Seules les adresses de bouclage `http://` sont utilisées |
| `textjs.devServer.command` | | Commande pour Démarrer le serveur de développement |

<!-- s:ea5e740ef1 -->
Confiance de l’espace de travail

<!-- s:ddcdd0b053 -->
L’aperçu et le serveur de développement exécutent le code de votre projet (sa configuration Vite, `text.config.*` et ses composants). En mode restreint, l’extension ne propose que les extraits de code, la génération de fichiers et les liens d’erreur, et ignore `textjs.preview.runtime`, `textjs.devServer.command` et `textjs.devServer.url` dans les paramètres de l’espace de travail. Accordez votre confiance à l’espace de travail pour activer l’aperçu. Les fichiers situés hors des dossiers de votre espace de travail ne sont jamais affichés en aperçu.

<!-- s:5ae438610c -->
Fonctionnement

<!-- s:857bac4692 -->
`text dev` expose trois points de terminaison pour les éditeurs. Ils répondent uniquement aux connexions de bouclage adressées à un hôte de bouclage (`localhost`, `127.0.0.1`, `[::1]`), et uniquement aux requêtes sans `Origin` ou avec l’origine du serveur de développement. Les requêtes intersites et `no-cors` des navigateurs sont rejetées :

<!-- s:2345c81baf -->
| Point de terminaison | |
| :-- | :-- |
| `GET /__textjs/status` | Racine du projet, onglets connectés, dimensions de la grille et route actuelle |
| `GET /__textjs/frames` | Événements envoyés par le serveur : un événement `frame` par changement, encodé sous forme de différences entre lignes |
| `POST /__textjs/input` | Une touche, un collage, du texte issu d’un IME ou d’une touche morte (`text`), un événement de molette ou une navigation pour l’onglet. Exige du JSON et l’en-tête `x-textjs-mirror: 1`, ce qui empêche les autres sites d’envoyer des frappes |

<!-- s:6693972af6 -->
Les onglets envoient leurs frames au serveur de développement via la socket HMR de Vite, qui exige un jeton propre à chaque serveur. Le format de transmission est exporté depuis `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) si vous souhaitez créer votre propre outil de visualisation. Rien de tout cela ne figure dans la sortie de `text build`.
