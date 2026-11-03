<!-- s:c88a0b9074 -->
Succès

<!-- s:232761cbc8 -->
Aucune erreur ne s’est produite.

<!-- s:0dbfdefc62 -->
Aucune action n’est nécessaire.

<!-- s:5278892fa4 -->
Yoga non initialisé

<!-- s:3cc543df2e -->
Le layout repose sur Yoga, distribué sous forme de WebAssembly, qui doit être instancié avant la première frame. Un nœud de scène ou une racine a été créé de manière synchrone avant la résolution de `initYoga()`.

<!-- s:08db9c8a11 -->
Utilisez les fonctions de création de racine asynchrones, qui initialisent Yoga pour vous :

<!-- s:0cc02c96a3 -->
Si vous avez besoin de `createConsoleRootSync()` ou d’un accès direct au graphe de scène du cœur, attendez la résolution de `initYoga()` une fois au démarrage :

<!-- s:0f5cc351a1 -->
Les applications démarrées avec `text dev` ne rencontrent jamais cette erreur.

<!-- s:cebca37b05 -->
Rendu hors d’une racine de console

<!-- s:c3b259f977 -->
Un hook ou un composant Text.js (`useInput`, `<ScrollBox>`, …) a été rendu sous une racine React qui n’est pas une racine de console, le plus souvent parce que `react-dom` rend un composant destiné à la console.

<!-- s:6f1ee54e3e -->
Effectuez le rendu des composants de console avec `renderToConsole` (ou `createConsoleRoot`), et non avec `react-dom` :

<!-- s:c7cb019122 -->
Pour afficher la même interface sur la page, utilisez `<TextCanvas>` depuis `@textjs/react/dom`, qui crée sa propre racine de console.

<!-- s:b657e4704a -->
Élément hôte inconnu

<!-- s:a8bb5bc9a5 -->
Le réconciliateur ne reconnaît que deux éléments intrinsèques, `tx-box` et `tx-text`. Il a reçu un élément en minuscules tel que `<div>` ou `<span>`.

<!-- s:407e421c11 -->
Utilisez plutôt les composants exportés :

<!-- s:2381168639 -->
<Box> imbriqué dans <Text>

<!-- s:2e17219271 -->
`<Text>` dispose une séquence de texte en ligne ; il ne peut pas contenir de conteneur Flexbox. Un `<Box>` (ou un composant qui en rend un, tel que `<Spacer>` ou `<Divider>`) a été rendu à l’intérieur d’un `<Text>`.

<!-- s:cd12727fb7 -->
Déplacez le `<Box>` à l’extérieur et placez les éléments de texte frères côte à côte sur une ligne :

<!-- s:0346a73e37 -->
Un `<Text>` imbriqué est autorisé ; il est rendu sous forme de span en ligne.

<!-- s:32864d644a -->
Rendu après démontage

<!-- s:c194b81d64 -->
`root.render()` a été appelé sur une racine de console après `root.unmount()`. Une racine démontée a libéré son moteur de rendu et ses écouteurs d’entrée.

<!-- s:4d43c601c1 -->
Créez une nouvelle racine, ou gardez la racine montée et effectuez le rendu d’un autre arbre :

<!-- s:41d1a6160d -->
Dans les tests, vérifiez `root.unmounted` avant de lancer un rendu depuis des fonctions de rappel asynchrones.

<!-- s:c5d7700094 -->
Modificateur inconnu dans une combinaison de touches

<!-- s:7729dd7762 -->
Chaque partie d’une combinaison avant le dernier `+` doit être un modificateur : `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) ou `mod` (`⌘` sur Apple, `Ctrl` ailleurs).

<!-- s:d5ba2b08ed -->
Touche inconnue dans une combinaison de touches

<!-- s:a68eb32bc2 -->
La dernière partie d’une combinaison doit être un caractère unique, une touche nommée (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) ou une touche de fonction (`f1`–`f12`).

<!-- s:69f231367c -->
Les séquences sont des frappes séparées par des espaces (`"g g"`). Les alternatives sont séparées par des virgules (`"j, down"`).

<!-- s:92663abe8d -->
Combinaison de touches vide

<!-- s:aa16466cb6 -->
Une combinaison s’est terminée sans touche, par exemple `"ctrl+"` ou `""`.

<!-- s:13284de673 -->
Indiquez la touche. Pour associer la touche plus elle-même, écrivez `"ctrl++"` :

<!-- s:f329e5f580 -->
Une seule frappe attendue

<!-- s:95712ddbf5 -->
Un appui sur une touche correspond à une seule frappe concrète. `keyEventFromCombo()` a reçu une séquence telle que `"g g"`, ou l’outil MCP `press` a reçu des alternatives telles que `"a,b"`.

<!-- s:0348879743 -->
Créez un événement par frappe. Dans les tests, `app.press()` et l’outil MCP `press` découpent pour vous les séquences séparées par des espaces :

<!-- s:467193a3d5 -->
Absence de stdout pour renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` écrit par défaut des frames ANSI dans `process.stdout`. Il a été exécuté dans un environnement qui n’en dispose pas (un navigateur, un worker) et aucune option `stdout` n’a été fournie.

<!-- s:90c3d0ac1f -->
Exécutez-le sous Bun ou Node, ou passez un flux accessible en écriture :

<!-- s:d3a77e5829 -->
Dans le navigateur, utilisez plutôt `renderToConsole`.

<!-- s:f201fe8e80 -->
<Image src> sans DOM

<!-- s:b9f409f560 -->
`<Image src>` décode les images au moyen d’un `<img>` et d’un canvas. Il n’y a pas de `document` ici (terminal, serveur, tests), donc l’URL ne peut pas être chargée.

<!-- s:3c284cd278 -->
Décodez vous-même l’image et transmettez les pixels RGBA :

<!-- s:775d3d31e6 -->
Aucun canvas 2D pour <Image>

<!-- s:7da15f3e88 -->
Le navigateur a refusé un contexte canvas `2d`, généralement parce qu’une politique ou une protection contre le fingerprinting désactive le canvas, ou que la page manque de mémoire GPU.

<!-- s:59ad35999f -->
Transmettez des `pixels` décodés ailleurs, ou affichez un texte de remplacement `alt`. `<Image>` affiche déjà son texte `alt` en cas d’échec du chargement :

<!-- s:ca446b6432 -->
Échec du chargement de <Image>

<!-- s:f11b7bffe8 -->
La requête de l’image a échoué : une erreur 404, une erreur réseau ou un serveur d’une autre origine qui n’envoie pas `Access-Control-Allow-Origin`. Les pixels sont lus depuis un canvas, les images d’une autre origine nécessitent donc CORS.

<!-- s:5e5daf0ad8 -->
Servez l’image depuis votre propre origine (`public/`), ou activez CORS sur le serveur qui héberge l’image :

<!-- s:aca80fe237 -->
Utilisation en dehors de <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` et `<Link>` lisent l’état fourni par `<AppRouter>`. Le composant a été rendu en dehors de celui-ci, généralement dans un appel autonome à `renderToConsole` ou un test unitaire.

<!-- s:0dd134139b -->
Exécutez l’application avec `text dev`, `text start` ou `text run`, qui montent `<AppRouter>` pour vous. Pour un rendu manuel (tests, intégrations), montez le routeur plutôt que la page :

<!-- s:f72dd41076 -->
Aucun composant par défaut dans le fichier de route

<!-- s:bb105b223b -->
Les fichiers `page`, `layout`, `loading`, `error` et `not-found` doivent exporter un composant React avec `export default`. Ce fichier n’exporte rien par défaut, ou exporte une valeur qui n’est pas une fonction.

<!-- s:737da9f930 -->
Aucune Response renvoyée par le gestionnaire de route

<!-- s:cb8f799843 -->
Un gestionnaire `route.ts` a renvoyé `undefined` (ou une autre valeur qui n’est pas une `Response`), généralement à cause d’un `return` manquant dans une branche.

<!-- s:ec7e161fb3 -->
Renvoyez une `Response` dans chaque branche :

<!-- s:62e5198b56 -->
Aucun build de production

<!-- s:6668a2f9b4 -->
`text start` sert la sortie de `text build`, et le répertoire de sortie (`outDir`, par défaut `dist`) ne contient aucun build.

<!-- s:498f1313ed -->
Si vous avez modifié `outDir` dans `text.config.ts`, exécutez les deux commandes depuis la même racine du projet.

<!-- s:dfda64bc1d -->
Aucun répertoire app/

<!-- s:38ac920023 -->
`text run` affiche l’App Router dans votre terminal et n’a pas trouvé le répertoire des routes.

<!-- s:6853e006ef -->
Exécutez la commande depuis la racine du projet, ou transmettez le répertoire du projet :

<!-- s:5a6362131f -->
text run / text mcp nécessitent Bun

<!-- s:773405124b -->
`text run` et `text mcp` importent directement vos fichiers de route `.tsx`, ce qui nécessite le chargeur TypeScript natif de Bun. Lancée avec Node, la CLI se relance avec Bun lorsque `bun` se trouve dans le `PATH` ; cette erreur signifie qu’il ne s’y trouve pas.

<!-- s:6f7a84fdc6 -->
Installez [Bun](https://bun.sh), ou exécutez directement la commande avec Bun :

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` et `text start` fonctionnent sur Node.

<!-- s:89a2fef8aa -->
Commande CLI inconnue

<!-- s:eba41925ed -->
La CLI `text` propose six commandes : `dev`, `build`, `start`, `run`, `proxy` et `mcp`.

<!-- s:8399f0df32 -->
La commande `text deploy` n’existe pas. Compilez pour votre plateforme avec `text build --adapter <name>` et déployez la sortie avec la CLI de la plateforme. Consultez [Déploiement](/docs/deploying).

<!-- s:ca76fd96a5 -->
URL du serveur OpenCode invalide

<!-- s:486a7eb67b -->
`--target` (ou `OPENCODE_SERVER_URL`) doit être une origine HTTP(S) seule. La valeur contenait un chemin, une requête, un fragment ou des identifiants. Les identifiants dans les URL se retrouvent dans les journaux et l’historique du navigateur.

<!-- s:a2f7bb7ff8 -->
Définissez plutôt le mot de passe du serveur avec `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Conflit entre le port du pont et celui d’OpenCode

<!-- s:8780127b8f -->
Le pont a reçu l’instruction d’écouter sur le même port local que le serveur OpenCode auquel il transmet les requêtes.

<!-- s:0b359d8121 -->
Pont déjà en cours d’exécution

<!-- s:76e9990092 -->
Un autre pont (`bunx @textjs/opencode@latest proxy` ou `text proxy`) écoute déjà sur ce port. Vous pouvez vous y connecter au lieu d’en démarrer un autre.

<!-- s:d5c7dd3e92 -->
Connectez-vous au pont en cours d’exécution, ou démarrez-en un second sur un autre port :

<!-- s:20a5f0b929 -->
Port du pont déjà utilisé

<!-- s:4fb3fcf34c -->
Un programme autre qu’un pont Text.js écoute sur le port demandé.

<!-- s:4a35b098e4 -->
Ou identifiez l’autre processus : `lsof -i :4096`.

<!-- s:f694899be6 -->
Modèle inconnu

<!-- s:13309ae8df -->
`--template` doit désigner l’un des modèles fournis : `starter`, `dashboard` ou `opencode`.

<!-- s:162e762178 -->
Répertoire cible non vide

<!-- s:24518256d0 -->
create-text-app génère la structure du projet uniquement dans un répertoire nouveau ou vide pour ne jamais écraser vos fichiers. Un répertoire `.git` et des dossiers d’éditeur (`.vscode`, `.idea`) sont acceptés.

<!-- s:2d505908ff -->
Choisissez un nouveau nom de répertoire :

<!-- s:0c1a816fb9 -->
Nom de projet invalide

<!-- s:46e6e56ab7 -->
Le nom du répertoire devient le nom dans `package.json`, qui doit être un nom de paquet npm valide : en minuscules, compatible avec les URL, de 214 caractères au maximum et différent de `textjs`, `react`, `react-dom`, `node_modules` ou `favicon.ico`.

<!-- s:5aa32a2677 -->
Hôte bloqué

<!-- s:7c7e94bc6b -->
`text dev`, ainsi que `text start` lorsqu’il est lié à l’interface de bouclage (par défaut), ne répondent qu’aux requêtes adressées à `localhost`, à un nom `*.localhost` ou à une adresse IP. Cela les protège contre les attaques par DNS rebinding. Une requête est arrivée avec un autre en-tête `Host`, généralement via un tunnel, un proxy inverse ou un nom d’hôte du réseau local.

<!-- s:8caece973a -->
Autorisez l’hôte dans `text.config.ts`. `text dev` lit `vite.server.allowedHosts` de Vite, et `text start` lit `server.allowedHosts`. Un `.` initial autorise les sous-domaines :

<!-- s:2c7d7369a1 -->
`text start --host` avec une adresse autre que celle de bouclage ignore cette vérification. Consultez [Derrière un proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Option text.config inconnue

<!-- s:5117146873 -->
`text.config.ts` a exporté une clé que Text.js ne lit pas, généralement une faute de frappe (`basepath` au lieu de `basePath`) ou une option Vite au premier niveau.

<!-- s:31ae46d91d -->
Corrigez l’orthographe ou déplacez les options Vite sous `vite` :

<!-- s:7f45c35d94 -->
`defineConfig` vérifie les types de la configuration et signale ces erreurs dans votre éditeur.

<!-- s:d1de5d5931 -->
Nécessité d’un serveur persistant pour les routes avec rendu côté serveur

<!-- s:d06541fc12 -->
Une page exporte `runtime = "server"` : son rendu s’exécute sur le serveur et elle transmet les frames en continu à chaque onglet ouvert via une session qui dure aussi longtemps que l’onglet. Les hébergeurs statiques, Vercel Functions et Cloudflare Workers ne peuvent pas maintenir ces sessions, donc `text build --adapter static|vercel|cloudflare` refuse l’application au lieu de livrer des routes dont le rendu ne peut pas s’exécuter.

<!-- s:27f8e0c99e -->
Déployez avec un serveur qui reste actif :

<!-- s:3ba9e63872 -->
Ou effectuez le rendu de la route dans le navigateur en supprimant l’export :

<!-- s:b39194c0e6 -->
Export dynamic invalide

<!-- s:218844a290 -->
Un gestionnaire de route exporte `dynamic` avec une valeur que Text.js ne prend pas en charge. Next.js accepte aussi `"error"`, qui effectue un rendu statique de la route et fait échouer le build si elle lit des données de la requête. Text.js ne peut pas détecter les lectures de la requête, il rejette donc `"error"`.

<!-- s:78a6bdcb90 -->
Utilisez `"force-static"` pour mettre le gestionnaire en cache. Un gestionnaire mis en cache reçoit une requête sans chaîne de requête, en-têtes, cookies ni corps :

<!-- s:95d0435b57 -->
Utilisez `"force-dynamic"`, ou supprimez l’export, si le gestionnaire lit la requête. Consultez [Mise en cache](/docs/caching).
