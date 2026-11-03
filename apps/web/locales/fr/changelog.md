<!-- s:f70688822a -->
Tous les changements notables de Text.js sont documentés dans ce fichier.

<!-- s:1ab5f276ed -->
Le format repose sur [Tenir un journal des modifications](https://keepachangelog.com/en/1.1.0/), et ce projet respecte le [versionnage sémantique](https://semver.org/spec/v2.0.0.html). Les versions 0.1.0 à 0.4.0 ont été étiquetées dans git sans être publiées sur npm.

<!-- s:2e16922cfc -->
Ajouts

<!-- s:c5e3c4b381 -->
- textjs.org : les versions en espagnol, français, allemand, portugais brésilien, coréen, chinois simplifié et chinois traditionnel ne sont plus en brouillon sur textjs.org/es, /fr, /de, /pt-br, /ko, /zh-cn et /zh-tw. Le sélecteur et le bouton de langue du navigateur les proposent comme le japonais, et les moteurs de recherche indexent leurs pages traduites.

<!-- s:f71df9184f -->
- `@textjs/react` : `<FocusPad messages>` remplace les chaînes intégrées du pavé de focus pour les sites traduits. Cela couvre chaque ligne, les libellés pour les lecteurs d’écran et le contrôle de taille de la console. `<TextCanvas>` et `<ViewportControl>` acceptent aussi `messages`. `<ViewportControl>` utilise uniquement les clés du contrôle de taille. Les chaînes contenant une valeur, comme « Puis cliquez ici et appuyez sur ↑ ↓. », sont des fonctions qui renvoient la phrase entière. `defaultFocusPadMessages` contient le texte anglais. Consultez [Traduire le pavé de focus](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react` : sur les pages de droite à gauche, le pavé de focus conserve de gauche à droite les touches telles que ⌘ ⌥ J et les tailles de console telles que 120×36, et inverse son contrôle de taille et sa barre d’étapes. Sur les pages en chinois et en japonais, il supprime l’espace entre ses deux phrases ; le coréen le conserve.
- textjs.org : textjs.org/ja n’est plus en brouillon. Le sélecteur de langue du pied de page ouvre la même page en anglais ou en 日本語. Un navigateur configuré en japonais affiche un bouton 日本語で読む, et un navigateur en anglais sur textjs.org/ja affiche Read in English. Le bouton cesse d’apparaître une fois que vous choisissez une langue ou le fermez. Les moteurs de recherche indexent les pages traduites en japonais et associent chacune à sa version anglaise.
- textjs.org : sur textjs.org/ja, le pavé de focus est en japonais sur chaque page, y compris les libellés sous les touches de chaque démo.

<!-- s:5b88618770 -->
Modifications

<!-- s:27b507a9de -->
- `@textjs/core` : les consoles Chromium et Firefox effacent la sortie des sprites animés à 16 Mo au lieu de 4 Mo, donc textjs.org/doom affiche « La console a été effacée » environ toutes les 19 secondes au lieu de toutes les 4,5 secondes. Safari et les sprites dessinés en demi-blocs `▀` conservent la limite de 4 Mo. Le pic d’utilisation du tas de la page textjs.org/doom passe de 10,8 Mo à environ 12–13 Mo.
- textjs.org : une page de documentation télécharge uniquement son propre Markdown au lieu des 33 pages, donc les pages de documentation en anglais chargent 43–47 ko de JavaScript en moins (gzip), et les pages de documentation /ja 60–64 ko de moins. Survoler un lien vers une autre page de documentation ou lui donner le focus déclenche le chargement anticipé de cette page, qui s’ouvre donc toujours immédiatement.

<!-- s:afe76b8d59 -->
Corrections

<!-- s:b3d1adfa39 -->
- textjs.org/ja : la recherche ⌘K affiche les titres de la documentation en japonais et y recherche les requêtes en japonais. Elle affichait auparavant des titres de section en anglais sous les titres de page en japonais. Les noms en anglais trouvent toujours les pages : `routing` trouve ルーティング et `open the console` trouve コンソールを開く.
- textjs.org : un exemple de la documentation exécuté dans votre console affiche à nouveau ses modifications dans l’aperçu de la page sur textjs.org/ja, ainsi que pour l’exemple Texte bidirectionnel sur textjs.org/docs/internationalization. La ligne au-dessus d’un exemple dans la console indique désormais « ▼ Docs › Counter » au lieu de « ▼ Docs › Introduction › Counter ».

<!-- s:125517f5e0 -->
- textjs.org/doom joue les effets sonores de Doom, avec sa propre spatialisation stéréo et son atténuation selon la distance. Le son démarre au premier clic ou à la première touche sur la page, se met en pause avec le jeu et suit le réglage Sfx Volume du menu Options → Sound Volume de Doom. Il n’y a pas de musique.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app` : l’indication de focus (« Cliquez sur la page pour utiliser le clavier ») est une barre ambrée avec du texte noir en gras dans chaque thème. Elle utilisait auparavant les couleurs inversées du thème. À chaque apparition, elle clignote 4 fois en environ 6 secondes, puis reste ambrée. Elle ne clignote pas lorsque la réduction des animations est activée. Chaque cycle de clignotement ajoute jusqu’à 8 frames supplémentaires à la console.
- textjs.org : Doom a été déplacé vers textjs.org/doom. textjs.org/playground/doom y redirige.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react` : le panneau « Problèmes » de Chrome ne signale plus « Un élément de champ de formulaire doit avoir un attribut id ou name » sur chaque page. Le `<textarea>` masqué du clavier porte le nom `textjs-input`, et le `<select>` de taille de console de `ViewportControl` (également présent dans le `sizeControl` de `FocusPad`) possède un `id` et le nom `textjs-console-size`. Le `<textarea>` du clavier désactive aussi l’intervention de 1Password, LastPass, Bitwarden et Dashlane.
- textjs.org : l’en-tête de console sur textjs.org/doom affiche « Text.js / doom » au lieu de « Text.js / playground / doom ».
- textjs.org/doom : une fenêtre étroite ne laisse plus de « · » isolé après « Voir le code source ».
- textjs.org : dans une fenêtre étroite, le sélecteur de démos du Playground s’estompe sur un bord lorsqu’il reste des démos à faire défiler, au lieu de couper la dernière au milieu d’un mot.
- textjs.org/doom tourne aux 35 tics par seconde de Doom. Dans un niveau, il tournait 3,8× trop vite sur un écran à 60 Hz (131 tics par seconde) et 5,5× à 120 Hz (192), car la page prenait les lectures d’horloge supplémentaires effectuées par Doom lors du dessin d’un niveau pour une attente active et avançait l’horloge de Doom d’un tic à chaque frame d’animation et à chaque rappel de minuteur.

<!-- s:14d523690c -->
- `@textjs/react` : `<Image renderMode="halfblock">` dessine des demi-blocs `▀` partout, comme le faisait `<Image>` en 1.3.
- `@textjs/core/experimental` : `drawPixels` accepte `encoding: "rgba"` pour un sprite sans perte avec un canal alpha progressif et plus de 256 couleurs, ainsi qu’une fonction `fallback` qui dessine les cellules là où le sprite ne peut pas être affiché.
- `@textjs/app` : curl, Wget, HTTPie et xh reçoivent la première frame d’une page sous forme de texte ANSI en couleurs vraies au lieu de la page HTML, avec `text dev`, `text start` et les adaptateurs `bun`, `vercel` et `cloudflare`. `text build` prérend les frames des pages statiques. `text start` et `bun` effectuent à la demande le rendu des pages dynamiques et des pages avec rendu côté serveur, et répondent aux chemins inconnus avec la page introuvable de l’application et un `404`. Les frames font 80 × 24 par défaut. Modifiez la taille ou désactivez les frames avec `ansi` dans `text.config.ts` ou `export const ansi` dans une page. L’adaptateur `static` sert la page HTML à curl. Consultez [curl et les clients terminal](https://textjs.org/docs/curl).
- `@textjs/app/ansi` exporte `wantsAnsi` et `ansiResponse` pour les serveurs qui n’utilisent ni `text start` ni adaptateur, et `@textjs/react` exporte `frameToAnsi`.
- textjs.org : une ébauche de version japonaise sur textjs.org/ja, en commençant par les pages Introduction, Installation et Routage de la documentation et l’interface du site. Les paragraphes non traduits s’affichent en anglais. Elle n’est pas encore indexée ni proposée dans le sélecteur de langue.

<!-- s:f489f8e451 -->
- `@textjs/react` : `<Image>` dessine désormais un sprite de pixels dans les consoles Chromium et Firefox, avec jusqu’à 8 × 16 pixels par cellule pour le pixel art et 4 × 8 pour les photos. Cela rompt délibérément la promesse de la [politique de prise en charge](https://textjs.org/docs/support-policy) selon laquelle les frames gardent le même aspect entre les versions mineures. Passez `renderMode="halfblock"` pour conserver les demi-blocs de la version 1.3. Safari, les terminaux (dont `text run`), les sorties ANSI et texte brut, ainsi que les pages avec rendu côté serveur (`runtime = "server"`) dessinent toujours des demi-blocs.
- `@textjs/app` : les scripts et les contrôles de disponibilité qui récupèrent des pages avec curl, Wget, HTTPie ou xh reçoivent désormais du texte ANSI. Pour continuer à recevoir du HTML, envoyez `Accept: text/html` ou définissez `ansi: false` dans `text.config.ts`.
- `@textjs/app` : les composants serveur asynchrones ne s’exécutent plus pendant que `text build` prérend la structure initiale d’une page. Ils affichent leur contenu de repli `<Suspense>`, comme avant, sans lancer leurs requêtes de données à la compilation.
- `@textjs/app` : le lecteur de frames des pages avec rendu côté serveur est réduit de 3 Ko, soit 22,4 Ko gzip au lieu de 25,4 Ko pour `examples/dashboard`. Il n’embarque plus les méthodes de dessin de `CellBuffer`, les bordures de boîtes ni la troncature du texte.

<!-- s:ba0b1ea778 -->
- `@textjs/core` : les graphiques et les indicateurs de chargement conservent leur grille sous Windows 10. Sa police de console est Consolas, qui ne possède ni blocs en huitièmes ▁▂▃▅▆▇, ni quadrants, ni braille, ni ▶, ni ✓, et leurs glyphes de repli faisaient dépasser les lignes du bord droit de la frame. `CssConsoleDriver` mesure désormais une fois lesquels de ces glyphes la police de console dessine avec un écart de plus d’un cinquième de cellule, et les remplace par le glyphe disponible dans Consolas le plus proche : `_` `▄` `▌` `█` pour les huitièmes, des demi-blocs pour les quadrants et le braille, `►` `◄` `√` `×` pour les flèches, coches et croix. Les polices qui les affichent aux bonnes dimensions, comme Cascadia Mono sous Windows 11 et Menlo sous macOS, dessinent les originaux. `measureText: false` désactive ce comportement.
- `@textjs/core` : plus de traits verticaux de 1 px entre les arrière-plans voisins dans les DevTools de Chrome et Edge, par exemple à côté de « account » et « qty » sur textjs.org/coffee. Chromium aligne séparément chaque span `%c` sur les pixels physiques et pouvait n’attribuer à aucun le pixel où deux spans se rejoignaient. `CssConsoleDriver` étend désormais l’arrière-plan d’un span de 1 px sous son voisin opaque de droite (`padding-right:1px;margin-right:-1px`). Les frames de Firefox et Safari ne changent pas.
- `@textjs/core` : les sprites `<Image>` dans Chrome et Edge suivent la même règle de 1 px que le texte. Le texte à gauche d’un sprite transparent ne dessine plus une bande de 1 px de son arrière-plan sur le bord gauche du sprite, et un sprite se joint sans interstice au texte opaque situé à sa droite, y compris au texte inversé. Un sprite seul sur ses lignes atteint désormais le bord droit de la frame, comme les lignes de texte au-dessus et au-dessous.
- `@textjs/react` : `<ConsoleMirror>` dessine une photo à côté du texte sous forme de demi-blocs, comme la console, au lieu d’afficher l’image.

<!-- s:757b866128 -->
- `@textjs/react/experimental` exporte `<Pixels>` pour les tampons d’image en direct et `useKeyState` pour les touches maintenues ; `@textjs/core/experimental` exporte `drawPixels`. Ces API peuvent changer dans une version mineure.
- textjs.org/playground/doom : jouez à l’épisode shareware de Doom dans la console DevTools.
- `@textjs/react`, `@textjs/app` : lorsque la page n’a pas le focus, la dernière ligne de la frame de console affiche « Cliquez sur la page pour utiliser le clavier », afin qu’un visiteur qui clique sur l’application dans la console sache pourquoi les touches ne répondent plus. Cette indication apparaît lorsque l’application possède un gestionnaire `useInput` ou `usePaste` ou une cible de focus, uniquement dans la console du navigateur, y compris sur les routes avec rendu côté serveur. Les miroirs intégrés et l’aperçu VS Code ne l’affichent pas. Désactivez-la avec `focusHint: false` dans `text.config.ts` ou `createConsoleRoot`.
- `@textjs/react` : `usePageFocus()` indique si la page a le focus. Pour décider vous-même quand l’application souhaite utiliser le clavier, définissez `focusHint: false` et affichez `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` marque un raccourci toujours actif qui ne déclenche pas à lui seul l’affichage de l’indication.

<!-- s:c96685f5e0 -->
- `@textjs/core` : pendant l’animation d’un sprite `<Pixels>`, `ConsoleRenderer` regroupe les images clés toutes les 51 ms dans Chromium, espace les frames de 33 ms dans Safari et efface la sortie ajoutée à la suite dans `CssConsoleDriver` à 4 Mo (`SPRITE_MAX_BYTES`). Les sprites statiques et les applications purement textuelles conservent le rythme existant et la limite d’effacement de 300 frames.

<!-- s:34e1835d0a -->
- `@textjs/core` : `bindTextSink(element, onText)` lit le texte validé par un IME ou une touche morte depuis une zone de texte ou un champ masqué, une fois par validation et jamais en cours de composition. `engine.bindTextSink(element)` relie une zone de texte que vous affichez vous-même à un `InputEngine`. Les deux renvoient une fonction qui supprime les écouteurs.
- `@textjs/app` : `POST /__textjs/input` accepte `{ type: "text", text }` pour le texte issu des IME et des touches mortes. `InputMessage` et `parseInputMessage` dans `@textjs/app/frame-protocol` l’incluent.

<!-- s:60239a49b7 -->
- `@textjs/app` : les middlewares et les gestionnaires de route reçoivent le chemin canonique. `/docs/` et `/docs//intro` arrivent sous les formes `/docs` et `/docs/intro`, si bien qu’un middleware qui redirige pour ajouter une barre oblique finale redirige désormais indéfiniment. Supprimez cette redirection. Un segment dynamique ne peut pas contenir de barre oblique encodée : `/files/a%2Fb` renvoie `400`.
- `@textjs/app` : avec un middleware, `--adapter cloudflare` envoie chaque requête au worker, y compris les ressources avec empreinte, et avec un `basePath`, il envoie aussi les requêtes hors du chemin de base. Chaque requête qui exécute le worker constitue une invocation Functions et compte dans votre quota de requêtes Workers. Avec l’offre Workers Free, configurez le projet Pages pour bloquer en cas d’échec (Settings → Runtime → Fail open / closed), sinon Pages sert vos fichiers sans middleware une fois le quota quotidien épuisé.

<!-- s:cb257a7494 -->
- Les IME chinois, japonais et coréens et les touches mortes fonctionnent dans les consoles intégrées de textjs.org. Les consoles vidaient la zone de texte en cours de composition, si bien que l’application recevait les lettres brutes ou le mauvais caractère.
- `<FocusPad>` conserve le focus clavier sur l’application après un clic. Il perdait auparavant le focus immédiatement, empêchant les IME chinois, japonais et coréens de composer du texte.
- Les touches mortes qui ne composent pas (sous Windows et sous Linux sans IME) parviennent à l’application lorsque la zone de texte masquée a le focus. Avec la disposition US-International, `'` puis `e` donne `é` et `'` puis `t` donne `'t`. `InputEngine` bloquait l’événement keydown qui complète une touche morte, si bien que le navigateur n’insérait rien. `DeadKeyTracker` dans `@textjs/core` laisse passer cet événement, et l’aperçu VS Code l’utilise aussi.
- L’aperçu VS Code transmet le texte issu des IME et des touches mortes, qu’il ignorait auparavant, et ne transmet plus à l’application les touches mortes ni les frappes de composition des IME. Avec un serveur `text dev` de `@textjs/app` 1.1.0 ou antérieur, il envoie le texte sous forme de frappes ou de collage.
- `@textjs/core` : `InputEngine.handleTextInput` ignore le texte tant que `shouldCapture` renvoie `false`, comme c’était déjà le cas pour les touches et le collage.
- `text dev` précompile `@textjs/app/live-stub` et `@textjs/app/live-player`. Une application possédant une page `runtime = "server"` ne les trouvait qu’après le premier chargement de page, si bien que Vite les regroupait à nouveau en cours de chargement, provoquant des erreurs 404 pour les fragments périmés et une erreur « Appel de hook invalide » due à deux copies de React.
- Les graphiques et les indicateurs de chargement tiennent dans la frame sous Windows. Consolas ne possède ni blocs ▁▂▃▅▆▇, ni quadrants, ni braille, ni ▶, ni ✓, si bien que Windows les dessinait avec des polices de repli jusqu’à 1,8 cellule de large et que les lignes des graphiques dépassaient le bord droit de la frame. La pile de polices de la console est désormais `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, et Windows 11 dessine toute la frame en Cascadia Mono. `<ConsoleMirror>`, l’aperçu VS Code et la vue des frames de l’extension DevTools placent aussi Cascadia Mono avant Consolas.
- `@textjs/opencode` : sous Node sur Windows, le pont trouve une installation d’OpenCode effectuée avec `npm i -g opencode-ai`. Node ne peut pas lancer le relais `opencode.cmd` de npm par son nom, si bien que le pont se comportait comme si OpenCode n’était pas installé. Il recherche désormais dans `PATH` avec chaque extension de `PATHEXT` et exécute les relais `.cmd` via `cmd.exe`. Sous Bun (`bunx`), cela fonctionnait déjà.
- `text build` fonctionne sous Windows. Il échouait pour chaque modèle, avec `Could not resolve entry module "virtual:textjs/api"` ou sans message d’erreur.
- `text build` affiche l’erreur lorsque le prérendu des structures initiales de console ou la compilation des routes avec rendu côté serveur échoue. Auparavant, il quittait avec le code 1 après la ligne « Échec de la compilation » de Vite, sans en donner la raison.
- `text dev` sous Windows recalcule le rendu des routes avec rendu côté serveur lorsque vous modifiez un fichier, et recharge le navigateur lorsqu’une page modifie son export `runtime`.
- `text dev` sous Windows n’exécute plus `middleware.ts` pour les fichiers source que Vite sert comme modules, tels que `/app/page.tsx`, si bien qu’une redirection d’authentification ne casse plus le client de développement.
- `text run` et `text mcp` fonctionnent lorsque le chemin du projet contient un nom court Windows 8.3, tel que `C:\Users\RUNNER~1`. Ils affichaient « Erreur de l’application » parce que la CLI et l’application chargeaient `@textjs/app` deux fois.
- Un `dist/` compilé sous Windows sert ses pages prérendues sous Linux et macOS. Le manifeste des routes en direct stockait ses chemins avec des barres obliques inverses.
- `text build` fonctionne lorsque l’option `vite` de `text.config.ts` définit `build.rollupOptions.input`. Cette entrée remplaçait celles des bundles de l’API, des routes avec rendu côté serveur et des adaptateurs, et la compilation échouait.
- `text dev` se termine lorsque vous l’arrêtez dans les premières secondes suivant le chargement d’une page, et `server.close()` se résout. La fermeture de Vite pendant l’optimisation de dépendances nouvellement découvertes n’aboutissait jamais (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Sécurité

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 et les versions antérieures laissaient une requête contourner `middleware.ts` en écrivant autrement un chemin protégé, par exemple `/ad%6din`, `/api//admin` ou `/admin%2Fx`. Le middleware comparait le chemin tel qu’il était envoyé, tandis que les pages, gestionnaires de route et fichiers statiques étaient recherchés après son décodage (deux fois pour les gestionnaires de route). Cela affectait `text dev`, `text start` et les compilations `--adapter bun`, `vercel` et `cloudflare`. Les compilations statiques ne peuvent pas utiliser de middleware et ne sont pas affectées. Passez à la version 1.2.0, puis recompilez et redéployez : `.vercel/output` pour Vercel, `dist/` pour Cloudflare Pages et l’intégralité de `dist/` pour Bun (redémarrez le serveur). Supprimez les anciens déploiements encore accessibles à leurs propres URL, ou protégez-les.
- Chaque hôte calcule désormais un chemin canonique par requête et l’utilise pour le sélecteur, `request.nextUrl` et chaque recherche. Il décode les séquences d’échappement en pourcentage et réencode le chemin comme le fait `new URL()`, résout les segments `.` et `..` et supprime les barres obliques répétées et finales. Les chemins contenant `%2F`, `%5C` ou un encodage en pourcentage invalide reçoivent un `400`. `text dev`, `text start` et l’adaptateur Bun ne servent les fichiers statiques que sous leur nom exact, si bien que sous macOS et Windows, `/ADMIN/report.txt` ne sert plus `public/admin/report.txt`.
- Les sélecteurs, sources de réécriture, segments de route et `basePath` sont comparés sous la même forme encodée que les chemins des requêtes, si bien que `matcher: "/café/:path*"` et `"/caf%c3%a9/:path*"` protègent `/caf%C3%A9`, et que `"/ops%40corp/:path*"` protège `/ops@corp`. Un middleware sans sélecteur ne s’exécute pas hors de `basePath`. Un sélecteur avec une barre oblique finale, tel que `/admin/`, correspond à `/admin`, et une condition `host` ignore un point final dans le nom d’hôte.
- Une session en direct pour une route `runtime = "server"` n’effectue pas le rendu d’une page qu’un middleware a réécrite vers un autre chemin ou une autre requête, par exemple une réécriture de `/restricted` vers `/login`, ou à laquelle il a répondu avec un statut d’erreur tel que `NextResponse.next({ status: 403 })`.
- `--adapter vercel` : la fonction de gestionnaire de route reçoit son chemin dans un en-tête de requête que seules les routes générées définissent, si bien que `/api/x/%252e%252e/admin` n’atteint plus `/api/admin` et qu’aucune variante de `/_textjs/*` n’exécute la fonction. La correspondance des routes générées respecte la casse, si bien que `/LEGACY/x` ne déclenche plus une réécriture pour `/legacy/:path*` que le middleware n’avait jamais vérifiée. Tout chemin potentiellement non canonique, y compris les caractères bruts comme `{`, passe par le middleware edge, désormais inclus dans chaque compilation Vercel, qui réécrit la requête vers son chemin canonique.
- `--adapter cloudflare` : les fichiers statiques sont recherchés avec le chemin encodé, si bien que `/x/%252e%252e/admin/report.txt` ne sert plus `/admin/report.txt`. Avec un `basePath`, les fichiers situés en dehors ne sont plus servis sans le worker.
- `text dev` ne sert pas les fichiers de `public/` sous `/public/…` ou `/@fs/…`, les sources réservées au serveur telles que `middleware.ts` et `text.config.ts` avec une autre casse, sous un chemin `/@fs/` encodé, comme requêtes de modules sans extension (`/text.config?import`) ou via une réécriture de configuration, ni les gestionnaires de route hors de `basePath`.

<!-- s:a0125c854e -->
- Text.js effectue le rendu dans les consoles Firefox et Safari. `CssConsoleDriver` détecte le navigateur par des tests de fonctionnalités CSS. Lorsque les spans `%c` restent en ligne, il définit des hauteurs de ligne de 14 px sans marges, désactive le retour automatique à la ligne et utilise un rideau `line-height: 100vh`.
- Le dimensionnement adaptatif laisse de la place pour la colonne des liens source de Firefox. Safari place Menlo en tête de la pile de polices : ses pages ne peuvent pas utiliser une police SF Mono installée par l’utilisateur, avec laquelle Web Inspector peut dessiner.
- Passez `browser: "chromium" | "firefox" | "safari"` à `createConsoleRoot`, `ConsoleRenderer` ou `CssConsoleDriver` pour choisir une console.
- Les structures initiales prérendues contiennent le CSS des deux types de console.
- `<FocusPad>` affiche le raccourci de console du navigateur du visiteur : ⌘⌥K ou Ctrl+Shift+K dans Firefox, et ⌘⌥C dans Safari avec une indication pour activer « Afficher les fonctionnalités pour les développeurs web ».
- Un `<FocusPad>` prérendu affiche le raccourci de chaque navigateur. Définissez `data-browser` (`firefox` ou `safari`) et `data-os` (`mac`) sur `<html>` avant le premier affichage pour ne montrer que celui du visiteur ; sans ces attributs, il affiche le raccourci Windows et Linux de Chrome jusqu’à son hydratation.

<!-- s:74de7c87f7 -->
- ⌘⌥K et Ctrl+Shift+K (le raccourci de console de Firefox) sont transmis au navigateur au lieu de parvenir à l’application.
- Le dimensionnement adaptatif apprend la hauteur des barres d’outils du navigateur de moins de 60 px (celles de Safari et Firefox) lorsque DevTools est fermé, afin qu’une console ancrée en bas utilise toutes les lignes disponibles. `<FocusPad>` utilise la hauteur apprise pour déterminer si DevTools est ancré.
- `<FocusPad>` écrit les raccourcis Windows et Linux dans son état d’attente de clic sous la forme `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode` : le pont affiche un code d’appairage au démarrage, et textjs.org/opencode le demande à la première connexion. Tant qu’une page n’envoie pas le code, le pont répond `428` et ne transmet rien à OpenCode, même pour les origines autorisées. Chaque code est valable pour une exécution du pont, le jeton renvoyé ne fonctionne que depuis l’origine appairée, et dix codes erronés bloquent l’appairage jusqu’au redémarrage du pont.
- `@textjs/opencode` : les déploiements d’aperçu Cloudflare Pages de textjs.org ne sont plus autorisés par défaut. Passez `--allow-origin` pour en utiliser un.
- textjs.org/opencode refuse les ponts de `@textjs/opencode` 1.0.x. Exécutez `bunx @textjs/opencode@latest proxy`.
- textjs.org envoie une Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` et `Cross-Origin-Resource-Policy`. La page OpenCode se connecte uniquement aux serveurs sur `127.0.0.1` ou `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite : examinez les différences par fichier, parcourez l’historique des prompts, configurez les raccourcis à touche préfixe et gérez les comptes fournisseurs et les serveurs MCP. Le bac à sable comprend un volet de terminal scripté.
- OpenCode Lite : saisissez `/` pour rechercher des commandes ou `@` pour joindre un fichier du projet. Tab ouvre un répertoire dans le menu des fichiers. Les sessions connectées recherchent dans le projet du serveur ; le bac à sable recherche dans son dépôt d’exemple.
- textjs.org/coffee : la démo terminal.shop suit la taille de la console comme l’application SSH, avec ses layouts petit, moyen et grand et le message « votre terminal est trop petit » en dessous de 20 × 10. Le compte ajoute des moyens de paiement, un profil dont le nom est modifiable et des modifications du calendrier hebdomadaire des abonnements. Sans connexion, le panier ainsi que la FAQ, la présentation et les informations de débogage du compte s’ouvrent sans authentification.

<!-- s:d106fb27b3 -->
Performances

<!-- s:f59d215740 -->
- `@textjs/react` : `Box` et `Text` transmettent au réconciliateur les props de scène déjà filtrées au lieu de copier les objets de props au montage et à la mise à jour.
- `@textjs/core` : `SceneNode.getTextModel()` évite les parcours de l’arbre inline pour les feuilles `<Text>` contenant une seule chaîne et réutilise les tampons `runOf` de type `Uint16Array`, mis en cache et remis à zéro. `CssConsoleDriver` parcourt les cellules BMP consécutives de même style dans une boucle interne, et `ConsoleRenderer` évite `countYogaNodes()` sur les frames inchangées.
- textjs.org : les routes et les onglets du compagnon de console sont répartis en chunks JS et CSS par route. Les photos de la boutique sont réencodées à partir des originaux de `photos/final`, et les vues secondaires des produits se chargent au survol ou au changement de diapositive.

<!-- s:6909c337fb -->
- `<ViewportControl>` utilise un `minWidth` en pixels au lieu de `20ch` et répertorie les polices de repli aux métriques correspondantes comme `<FocusPad>`, afin que le sélecteur de taille conserve sa largeur au chargement de `Geist Mono`.

<!-- s:517ba6caf6 -->
- `@textjs/opencode` : le pont de textjs.org/opencode dans son propre paquet sans dépendances. Exécutez `bunx @textjs/opencode proxy` (ou `npx`) pour le démarrer sans installer Vite, React et le SDK MCP. `text proxy` fonctionne toujours et exécute le même pont.

<!-- s:884a8abcf6 -->
- Le paquet du framework et de la CLI s’appelle désormais `@textjs/app`, renommé depuis `@textjs/next` pour que son nom ne suggère pas une intégration officielle de Next.js. `@textjs/next` est obsolète au profit de `@textjs/app` et ne reçoit plus de nouvelles versions. Pour migrer, exécutez `bun remove @textjs/next && bun add @textjs/app` et remplacez `@textjs/next` par `@textjs/app` dans les imports, y compris les sous-chemins tels que `@textjs/app/link`. La CLI reste `text`, et les modèles create-text-app dépendent de `@textjs/app`.
- La pastille `[▼]` et l’inspecteur dans la console s’appellent Dev Overlay, et le titre de l’inspecteur affiche `▼ Dev Overlay · Turbolog`. Text.js DevTools désigne uniquement l’extension Chrome. `<TextDevOverlay>` et ses props restent inchangés.
- Les gestionnaires de route qui exportent `dynamic = "error"` échouent avec `TX031`. Text.js traitait cette valeur comme `"force-static"` sans vérifier si le gestionnaire lit la requête, ce qui est le sens de cette valeur dans Next.js. Utilisez `"force-static"`.

<!-- s:e21d3058df -->
- `text start` répond à un `Host` bloqué par `TX028`, comme `text dev`. Chaque serveur nomme le paramètre qu’il lit : `vite.server.allowedHosts` pour `text dev` et `server.allowedHosts` pour `text start`.
- textjs.org : le chapitre Livraison d’Apprendre ne vous demande plus d’ajouter une réécriture `vercel.json`. Sur Vercel et Cloudflare Pages, `text build` écrit lui-même le fichier de repli `index.html`. L’exemple de réécriture utilise désormais le fichier `_redirects` de Netlify.
- `eslint-plugin-textjs` : `route-handler-exports` autorise les exports `dynamic` et `revalidate` dans `route.ts`, et `valid-route-module` y vérifie les valeurs de `dynamic`.

<!-- s:9fc693fec9 -->
- textjs.org : une vidéo de chapitre d’Apprendre en cours de lecture passe dans un mini-lecteur dans le coin lorsque vous la dépassez en faisant défiler la page. Le bouton Sous-titres sous chaque vidéo active ou désactive les sous-titres et mémorise le choix.
- `<TextDevOverlay>` accepte les props `pill`, `shortcut` et `shell`, afin que les applications sans App Router puissent monter l’inspecteur avec leurs propres touches et commandes de thème.
- `<FocusPad>` accepte une `banner`, affichée comme première ligne du message (par exemple le logotype d’une application) et au-dessus de l’avis sur les appareils tactiles.

<!-- s:45920d8903 -->
- textjs.org : le sélecteur du Playground répertorie Tableau de bord, Streaming, Snake, OpenCode et Café (terminal.shop). Chaque démo possède sa propre URL : OpenCode se trouve sur `/opencode` et terminal.shop sur `/coffee`, et leurs logotypes figurent en tête du message. Compteur et Formulaire ont quitté le Playground ; la documentation continue de les exécuter comme exemples interactifs.
- `<FocusPad>` possède un nouveau layout. Chaque état affiche une barre de progression en trois parties, un titre, un grand élément et une ligne de texte. Avant l’ouverture de la console, le grand élément est le raccourci DevTools. En attente d’un clic, c’est un pointeur. Une fois l’application active, ce sont ses `hints` sous forme de touches qui s’allument à la réception des frappes, et les touches sans indication sont reproduites en dessous. Les libellés d’étapes, le badge « En direct » séparé et la ligne « Regardez la console. » ont disparu. Les lignes apparaissent en fondu lors des changements d’état, jamais au premier affichage, et les animations sont désactivées avec `prefers-reduced-motion`. Le texte secondaire respecte le contraste WCAG AA dans les deux apparences, et le sélecteur de taille de console affiche un anneau de focus lorsqu’on l’atteint au clavier.
- textjs.org : le Playground utilise le nouveau layout de `<FocusPad>`. La démo actuelle du sélecteur reprend la surface des touches, le champ de commande OpenCode adopte les angles et la taille de texte du champ URL, la note terminal.shop occupe deux lignes au lieu de trois, « Voir le code source » s’aligne sur la ligne de base du contrôle de taille, et le texte discret du panneau respecte le contraste AA.

<!-- s:01075dcc87 -->
- `text dev` sert les chemins `proxy` via le proxy pour chaque requête. `fetch()` envoie `Accept: */*`, si bien que le serveur de développement y répondait d’abord avec le HTML de l’application, et le modèle opencode échouait au premier lancement avec « Jeton inattendu '<' ».
- `text dev` ne charge plus une seconde copie de React lorsque l’analyse des dépendances de Vite lit un fichier réservé au serveur. L’analyse déclenchait la vérification des imports réservés au serveur, qui affichait une trace de pile, puis « Appel de hook invalide » dans la console, et cassait Fast Refresh.
- `text dev` gère les URL de page avec une chaîne de requête, telles que `/?demo`. Vite les traitait comme le dossier du projet et surveillait tout le disque, si bien que sous Linux, la page ne se chargeait jamais.
- create-text-app : la pastille de développement ne masque plus la première indication de touche sur le premier écran des modèles, le nom de projet par défaut est `my-app` comme dans la documentation, les modèles respectent la configuration recommandée d’`eslint-plugin-textjs`, et le README du tableau de bord explique la compilation `--adapter static`.
- `<FocusPad>` et `<ViewportControl>` définissent les bordures uniquement avec des propriétés détaillées. React affichait l’avertissement « Mise à jour d’une propriété de style pendant un nouveau rendu (border) » en développement chaque fois qu’une indication de touche clignotait.
- Le texte en dernière position d’une ligne conserve désormais sa place lorsqu’il raccourcit. Après un `<Spacer>`, il restait là où le texte le plus long l’avait laissé, et les éléments frères réduits pour tenir dans une ligne débordante restaient réduits.
- `<FocusPad>` remplace ses étapes, son sous-titre et ses lignes de touches lorsque `action` ou `hints` changent, afin qu’un changement de démo dans un même panneau ne soit pas signalé comme un décalage de layout.
- `@textjs/react/testing` charge Yoga à l’import, afin qu’un test puisse remplacer `fetch` par un bouchon avant son premier `render()`.

<!-- s:64f8dbac91 -->
La première version stable. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Rupture de compatibilité :** le paquet du framework et de la CLI s’appelle désormais `@textjs/next` (`textjs` est déjà pris sur npm). Remplacez les imports de `textjs` par `@textjs/next`.
- Le pont OpenCode est `bunx @textjs/app proxy` et s’exécute depuis n’importe quel répertoire.
- La console s’adapte par défaut au panneau DevTools ancré (en bas, à gauche ou à droite, zoom de page, retour à la ligne de la barre d’outils). Les DevTools non ancrés utilisent la taille de repli `120×36`. Les panneaux disposent désormais d’un contrôle de taille.

<!-- s:dd18fee429 -->
- `useKeymap` avec un écran d’aide `?` automatique, des indications de touches et une palette de commandes `Ctrl+K`.
- Composants de données : `List` (virtualisée), `Table`, `Tree`.
- Graphiques : `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, ainsi que `Gradient` et `Image`.
- Contrôles : `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` et notifications temporaires.
- Layout : `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks pour les minuteurs, l’animation, la mesure, les points de rupture, le stockage et le presse-papiers.
- Texte de droite à gauche. Text.js implémente l’algorithme bidirectionnel Unicode (UAX #9, Unicode 18.0) et réussit les 770 241 cas de `BidiTest.txt` et les 91 707 cas de `BidiCharacterTest.txt`. L’arabe reçoit sa mise en forme contextuelle, et `<Text dir>` isole un span.
- Codes d’erreur `TX###` stables. Les erreurs du framework comportent un code et un lien vers `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` pour le rendu des composants en texte dans les tests.
- `@textjs/react/terminal` et `text run`, qui effectue le rendu d’une application App Router dans un vrai terminal.
- `text mcp`, qui sert une application via le Model Context Protocol afin que les agents de programmation puissent y naviguer, appuyer sur des touches et lire des frames sans navigateur.
- L’extension Text.js DevTools, un panneau à côté de « Console » avec l’arbre des composants, un inspecteur de frames et une chronologie.
- `eslint-plugin-textjs` et une extension VS Code avec des aperçus en direct.
- `apps/terminal-shop` : la boutique terminal.shop dans la console, connectée à la véritable API (bac à sable de développement par défaut, production à double verrouillage).
- textjs.org : Apprendre, un cours de 10 chapitres qui s’exécute dans la console. Prérendu à la compilation avec hydratation, polices auto-hébergées aux métriques correspondantes, routes `.html` sans barre oblique finale et nouvelles pages de documentation avec aperçus en direct.

<!-- s:25c8658848 -->
- Suppression du verrouillage de phase de la limitation DevTools après effacement. Après une frame qui efface la console, le moteur de rendu attend une fois 110 ms pour que les frames suivantes empruntent le chemin immédiat de DevTools. La latence d’affichage p50 est passée de 63 ms à 10 ms.
- Dessin partiel par bandes modifiées : seules les bandes de lignes touchées par une mutation sont redessinées.
- Empreintes par ligne en cache, identifiants de style entiers et frames inactives sans allocation.
- Aucun minuteur d’inactivité lorsque la page est masquée ou n’a pas le focus.

<!-- s:2f477ecf74 -->
- Plus de spans vides fantômes dans la couche de dessin aux sauts de ligne, ni de rideau doublé.
- Le rideau occupe sa propre ligne, si bien que le lien source de DevTools (`VM12:1`) ne provoque jamais de retour à la ligne sur la ligne 0.
- L’indicateur de chargement par défaut respecte exactement les cellules (Menlo ne possède pas de glyphes braille). La variante `braille` est optionnelle.
- `text build` sous Node n’inclut plus les versions de développement de React dans les bundles.
- textjs.org : le décalage cumulatif de layout est de 0 sur chaque route. Playground et OpenCode partagent un même layout de panneau.
- textjs.org : les barres latérales de la documentation et d’Apprendre restent fixées en bas des longues pages.
- textjs.org : les onglets de fichiers, blocs de code et tableaux de texte défilent uniquement à l’horizontale, afin qu’iOS Safari n’intercepte jamais les balayages verticaux de la page.
- textjs.org : `scrollbar-gutter: stable` s’applique uniquement aux appareils avec souris. Sur iOS Safari, il faisait sauter le premier défilement.
- textjs.org : l’ancrage du défilement est désactivé. Sur iOS Safari, il bloquait le bandeau principal sous l’en-tête fixe.

<!-- s:986367c89f -->
Frames sans clignotement et rendu côté serveur.

<!-- s:f92fe85dce -->
- Les frames sont ajoutées à la suite au lieu d’appeler `console.clear()` + `console.log()` par frame. DevTools applique un effacement de façon synchrone mais limite le dessin des nouveaux messages à un intervalle de 50 ms, si bien que l’effacement laissait la console vide dans 70,6 % des affichages de DevTools à 15 images/s et 81,1 % à 60 images/s. Un span de rideau de largeur nulle en tête masque les frames précédentes. La console est effacée uniquement à la première frame, après `invalidate()`, au repos une fois 100 frames empilées, ou à 300.
- Les frames émises sont espacées d’au moins 66 ms (environ 15 images/s). Les frames plus rapides relancent la limitation de DevTools et sont abandonnées : à 60 images/s, DevTools a dessiné 67 des 295 frames émises.
- Playground et OpenCode sont des panneaux de focus en plein écran.

<!-- s:79bc055b31 -->
- CSS des spans limité aux propriétés détaillées, ce qui réduit d’environ 33 à environ 7 les propriétés que DevTools copie sur chaque ligne. Couleurs hexadécimales et séquences vides indexées uniquement par arrière-plan.
- Analyse Markdown incrémentale et lignes `Markdown`, `Code` et `Diff` mémoïsées.
- Props hôtes traitées en un seul passage, mises à jour ciblées des props et aucun recalcul du layout Yoga lorsque la taille du texte ne peut pas changer.
- Une frame en streaming est passée de 0,79 ms à 0,14 ms, une étape d’indicateur de chargement de 0,90 ms à 0,056 ms. La sortie est identique bit pour bit.

<!-- s:52e989e27d -->
- Rendu côté serveur. Une page qui exporte `runtime = "server"` effectue son rendu sur le serveur, y compris pour les composants `async function`, et transmet en continu les deltas de cellules par ligne via des événements envoyés par le serveur à un lecteur de frames d’environ 19 ko gzip.
- Prérendu partiel. `text build` intègre la première frame de chaque route statique dans son HTML, afin que la console s’affiche avant le chargement de tout module.
- `middleware.ts`, configuration des segments de route (`dynamic`, `revalidate`) et `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools` : un banc de test qui pilote la véritable interface de DevTools et mesure les affichages vides, les frames perdues, le retard d’affichage et l’utilisation du processeur par DevTools.

<!-- s:7932537f20 -->
- DevTools ne transforme plus les textes `path:line`, `//host:port` et `data:` en liens.
- Le pont OpenCode trouve le démon géré (port éphémère, authentification Basic), envoie l’en-tête CSRF lors des écritures et signale les échecs sur une seule ligne.

<!-- s:6dddbd2f6c -->
- Une saisie ponctuelle (une touche pressée, un collage) déclenche un rendu synchrone dans la même tâche au lieu d’attendre la prochaine frame d’animation.
- Une interface textuelle OpenCode allégée qui correspond à l’originale.
- Une révision complète de textjs.org pour les mobiles et l’adaptation aux tailles d’écran.

<!-- s:1d66ad9bc5 -->
- `@textjs/font` : un analyseur et moteur de rendu de polices FIGlet avec 17 polices incluses, pour `<FigletText>` et `<AsciiFont>`. La sortie correspond à 273 références enregistrées à partir du binaire `figlet` 2.2.5.
- `text proxy` : un pont CORS local pour que textjs.org puisse communiquer avec votre serveur OpenCode.

<!-- s:1331e4db42 -->
- `apps/opencode-console` : un client OpenCode connecté dont le rendu s’effectue dans `console.log`, avec une démo de secours lorsqu’aucun serveur ne tourne.
- Un modèle `opencode` pour `create-text-app`.
- textjs.org : une nouvelle page d’accueil, le compagnon de console en direct, le Playground, la page OpenCode et la documentation.
- Un workflow de déploiement GitHub Pages avec génération de routes statiques.

<!-- s:a1b0bb2bf5 -->
Le premier jalon.

<!-- s:67e64392c2 -->
- `@textjs/core` : `CellBuffer` sur des tableaux typés plats, layout Yoga WASM, mesure du texte avec `Intl.Segmenter` et pilote d’encodage par plages `%c`. Un `console.log` par frame modifiée et aucun au repos.
- `@textjs/react` : un réconciliateur React 19, des composants PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` et d’autres), des utilitaires `className` de style Tailwind à l’échelle de la cellule, des thèmes et le `FocusPad` DOM.
- `textjs` : l’App Router basé sur le système de fichiers (`layout`, `page`, `loading`, `error`, `not-found`, segments dynamiques, gestionnaires de route), `text dev`, `text build`, `text start` et l’inspecteur `[▼]` dans la console.
- `create-text-app` avec les modèles `starter` et `dashboard`.
