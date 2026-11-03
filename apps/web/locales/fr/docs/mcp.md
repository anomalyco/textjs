<!-- s:c351b288ae -->
`text mcp` exécute votre répertoire `app/` sans interface graphique, dans le même processus, et le sert via le [Model Context Protocol](https://modelcontextprotocol.io) pour que les agents de programmation puissent l’utiliser sans DevTools. L’agent navigue, appuie sur des touches, lit les frames en texte brut et appelle les gestionnaires de route.

<!-- s:c66b3eaae7 -->
`text mcp` nécessite Bun. Lancé avec Node, il se relance avec Bun si `bun` figure dans votre `PATH`, et échoue avec `TX019` sinon. Les clients MCP le lancent pour vous, vous avez donc rarement à le lancer manuellement.

<!-- s:0ecddf15e1 -->
Configuration

<!-- s:91bda9ef42 -->
Chaque client lance `text mcp` depuis le répertoire de votre projet. Utilisez `bunx --bun` pour que les fichiers de route s’exécutent en TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Ou enregistrez cette configuration dans le dépôt pour l’équipe :

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Pour un projet dans un sous-répertoire, ajoutez le chemin à la suite : `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Outils

<!-- s:93ae76f73d -->
| Outil | Description |
| :-- | :-- |
| `list_routes` | Pages et gestionnaires de route dans `app/`, et emplacement actuel |
| `navigate` | Ajouter ou remplacer un chemin, ou aller en arrière (`back`) / en avant (`forward`) |
| `read_frame` | La frame en texte, avec la route, la taille, le focus et le curseur. `styles: true` ajoute les couleurs et attributs de chaque span |
| `press` | Combinaisons de touches : `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Saisir du texte avec une touche par caractère (jusqu’à 2000 ; utiliser `paste` au-delà). `submit: true` appuie ensuite sur Enter |
| `paste` | Un événement de collage, comme `⌘V` |
| `scroll` | Défilement à la molette de `rows` lignes (et `cols` colonnes). Un `<ScrollBox>` défile à la molette sans avoir le focus clavier |
| `resize` | Définir la taille de la grille en colonnes et en lignes |
| `inspect_tree` | L’arbre des composants avec leurs limites à l’écran, et tous les identifiants pouvant recevoir le focus |
| `find` | Limites de chaque correspondance et composant situé en dessous |
| `wait_for` | Attendre qu’un texte apparaisse ou disparaisse, ou que l’application soit inactive |
| `logs` | Sorties `console.*` capturées et erreurs React |
| `fetch` | Appeler un gestionnaire `route.ts` dans le même processus. Les corps sont lus jusqu’à `maxBytes` ; les flux d’événements pendant `streamMs`, puis annulés |
| `reload` | Réimporter l’application après modification des fichiers |

<!-- s:526235e5c5 -->
Les outils de saisie renvoient la nouvelle frame, l’agent n’a donc pas besoin d’un appel distinct à `read_frame` après chaque touche. La frame actuelle et la liste des routes sont aussi disponibles via les ressources `text://frame` et `text://routes`.

<!-- s:c30236f97d -->
Un échange typique :

<!-- s:45e18bfa25 -->
Frames et inactivité

<!-- s:f2e8fe0f06 -->
Avant de lire une frame, chaque outil attend que l’application soit inactive : aucune frame planifiée, aucun `fetch` en cours, et aucun commit ni aucune frame depuis 50 ms. L’agent voit donc le résultat de sa saisie, pas une frame au milieu d’une mise à jour.

<!-- s:fbad6f5c1a -->
Un `<Spinner>` ou un graphique actualisé une fois par seconde reste considéré comme inactif entre les actualisations, les pages avec des animations restent donc lisibles. Une application qui effectue un rendu plus souvent que toutes les 50 ms ne devient jamais inactive. Les lectures abandonnent après 1,5 seconde (`settleMs` modifie ce délai), émettent la dernière frame et la marquent `busy`. Sans texte, `wait_for` attend l’inactivité avec son propre `quietMs` et renvoie une erreur si l’inactivité ne survient jamais.

<!-- s:c5250c2f7a -->
Les coordonnées sont exprimées en cellules et commencent à zéro : `x` désigne la colonne, `y` la ligne. Les caractères larges, comme les caractères CJK et les emoji, occupent deux colonnes.

<!-- s:7ff82431c5 -->
Erreurs et journaux

<!-- s:6e07cf8702 -->
stdout transporte le protocole. Les sorties `console.*` de votre application, les appels parasites à `process.stdout.write` et les erreurs React sont dirigés vers `logs`, avec une numérotation pour qu’un agent puisse demander uniquement les nouvelles entrées avec `since`. Si des erreurs ont été journalisées depuis la dernière lecture, l’en-tête de la frame suivante le signale.

<!-- s:9102068439 -->
Les échecs sont renvoyés sous forme d’erreurs d’outil, sans jamais provoquer de plantage. Un outil qui dépasse son délai est annulé avant l’exécution de l’appel suivant, un appel lent ne saisit donc jamais de texte dans la frame de l’appel suivant. Les erreurs avec un code Text.js le conservent, par exemple `TX007` pour une touche inconnue. Si l’application ne se charge pas, chaque outil en explique la raison. Corrigez le fichier et appelez `reload`.

<!-- s:d3ad6f781e -->
Options

<!-- s:c9c30c0da4 -->
| Option | Description |
| :-- | :-- |
| `--path <pathname>` | Première route (par défaut `/`) |
| `--cols` / `--rows` | Taille de la grille (par défaut : `viewport` dans `text.config.ts`, sinon 100×32) |
| `--theme <name>` | Préréglage de thème |
| `--no-config` | Ignorer `text.config.ts` |
| `--verbose` | Écrire aussi les journaux capturés sur stderr |

<!-- s:5ae438610c -->
Fonctionnement

<!-- s:7c71219a13 -->
`text mcp` exécute votre application comme [`text run`](/docs/terminal) : chaque module de route est importé au préalable, App Router utilise un historique en mémoire, et les appels `fetch("/api/…")` de même origine exécutent vos gestionnaires dans le même processus. Les frames sont envoyées vers une grille de cellules hors écran plutôt que vers un terminal. Les pages avec rendu côté serveur (`export const runtime = "server"`) et leurs composants `async function` sont rendus dans le même processus, comme avec `text dev`, et la frame est lue une fois leur exécution terminée.

<!-- s:c965dcc0e4 -->
`reload` démonte l’application, supprime tous les modules du projet du cache de modules de Bun (y compris les fichiers en dehors de `app/`), analyse à nouveau `app/` et remonte l’application à l’emplacement actuel.

<!-- s:19d6f0da69 -->
Pour intégrer le serveur dans votre propre processus, ou utiliser un autre transport :

<!-- s:68c8d3995f -->
Limites

<!-- s:910af21777 -->
- L’application s’exécute dans Bun, pas dans un navigateur. `window` et `document` ne sont pas définis, comme dans `text run`.
- Chaque serveur exécute une application avec une grille. Chaque client MCP lance son propre serveur.
- `text mcp` exécute sa propre copie sans interface graphique de l’application. Il ne peut pas se connecter à un onglet de navigateur ouvert sous `text dev`.
