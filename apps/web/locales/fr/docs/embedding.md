<!-- s:7e7d3cb07e -->
`text build --embed` compile votre application pour qu’un autre site puisse l’ajouter avec une seule balise script, par exemple une page marketing, un site de documentation, une page WordPress ou Webflow, ou une application React 18. Les visiteurs qui ouvrent DevTools retrouvent votre application dans la console. Les autres visiteurs téléchargent `embed.js` (environ 3 ko avec gzip) et rien d’autre, sauf si la page contient un `<text-console>`.

<!-- s:2aa1d07d89 -->
Les intégrations sont expérimentales. `text build --embed`, l’option `embed`, `<text-console>` et les exports de `@textjs/app/experimental` peuvent changer dans une version mineure. Consultez [Changements incompatibles](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Ajouter une application à un site

<!-- s:f296ccaeef -->
Compilez l’application :

<!-- s:2198c52791 -->
Téléversez `dist/` sur un hébergement statique ou un CDN, ou copiez-le dans le dossier `public/` du site, puis ajoutez une balise aux pages du site :

<!-- s:aa94ef1985 -->
`embed.js` charge ses autres fichiers relativement à sa propre URL, donc `dist/` fonctionne depuis n’importe quel chemin ou origine. Il contient uniquement `embed.js` et `assets/`, sans `index.html` ni `404.html` qui pourraient remplacer ceux du site. Une application avec des [routes avec rendu côté serveur](#server-rendered-routes), des gestionnaires de route ou des middlewares nécessite un serveur plutôt qu’un simple téléversement statique. Les adaptateurs `vercel` et `cloudflare` exécutent les gestionnaires de route et les middlewares, et les routes avec rendu côté serveur nécessitent `text start` ou l’adaptateur `bun`.

<!-- s:5c139759a2 -->
Pour montrer aux visiteurs où se trouve l’application, ajoutez [`<text-console>`](#text-console) n’importe où dans la page. Tout élément avec `data-textjs-engage` démarre aussi l’application lorsqu’on appuie dessus :

<!-- s:6a70ec16e1 -->
Pour l’essayer en local, exécutez `text dev --embed`. Il sert `/embed.js` avec une nouvelle première frame à chaque requête, et une page d’aperçu à `/` (`/__textjs/embed` avec `standalone`) qui le charge comme le ferait un autre site. Un site sur un autre port local peut aussi charger `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Configuration

<!-- s:aa9630bf92 -->
`text build --embed` équivaut à `embed: true` dans `text.config.ts`. Passez un objet pour modifier les valeurs par défaut :

<!-- s:fbe8efc9f4 -->
| Option | Valeur par défaut | Description |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | La route sur laquelle la console s’ouvre. Doit commencer par `/` |
| `globalName` | `"text"` | La variable globale sous laquelle l’application installe son API de console au démarrage. `false` n’en installe aucune |
| `initialClear` | `false` | Effacer la console de la page avant la première frame. Par défaut, les messages précédents de la page restent au-dessus de l’application |
| `standalone` | `false` | Compiler aussi les propres pages de l’application (`index.html`), comme le fait `text build` sans `embed` |
| `allowOrigins` | `[]` | Sites dont les pages peuvent exécuter des routes avec rendu côté serveur depuis ce serveur. Consultez [Routes avec rendu côté serveur](#server-rendered-routes) |
| `credentials` | `false` | Envoyer les informations d’authentification du navigateur pour ce serveur avec les requêtes de session en direct provenant de `allowOrigins`, au lieu de supprimer les cookies et `Authorization`. Nécessite des origines exactes |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (120 × 36 par défaut) définit la taille de la première frame. `title`, `hints` et `action` sont les valeurs par défaut de `<text-console>`. `embed.js` ne contient pas de première frame prérendue avec `ppr: false`, ou lorsque `middleware.ts` pourrait correspondre à `initialPath`, car tout le monde peut télécharger `embed.js`. Un miroir reste vide jusqu’à ce que l’application effectue son rendu.

<!-- s:7ca27066c7 -->
Comportement

<!-- s:1fe89ec57c -->
- **Rien d’autre ne se charge avant une [intention d’utiliser la console](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` affiche la première frame prérendue dans la console, puis attend. L’application se charge lorsque DevTools est ancré (au chargement ou plus tard), lorsque le visiteur utilise un raccourci DevTools sur la page (F12, Ctrl+Shift+J, I, C ou K, ou ⌘⌥J, I, C ou K sur Mac), ou lorsqu’il appuie sur un `<text-console>` ou un élément `[data-textjs-engage]`. Ensuite, les rechargements dans le même onglet la démarrent immédiatement. DevTools dans sa propre fenêtre ne modifie pas la taille de la page : les visiteurs qui l’ont ouvert depuis un menu voient donc la première frame jusqu’à ce qu’ils appuient sur l’un de ces éléments.
- **Sur les écrans tactiles, l’application ne démarre pas.** Sur un appareil correspondant à `(hover: none) and (pointer: coarse)`, `embed.js` n’affiche rien dans la console et n’ajoute aucun écouteur. Le seul fichier qu’il charge est celui de `<text-console>`, pour un miroir.
- **Les touches ne parviennent à l’application qu’après son activation par le visiteur.** Pour l’activer, il appuie sur un `<text-console>` ou un élément `[data-textjs-engage]`, ou clique sur la page (pas sur un lien, un bouton ou un champ) pour reprendre le focus à DevTools. La saisie dans les champs de la page ou dans un élément `[data-textjs-bypass]` ne parvient jamais à l’application, et la molette fait toujours défiler la page.
- **L’URL, l’historique et le titre de la page ne changent jamais.** Les routes, `<Link>` et `useRouter()` naviguent dans la console. Dans les applications avec rendu côté client, les URL absolues s’ouvrent dans un nouvel onglet.
- **Une application Text.js sur la page est prioritaire.** Lorsqu’elle démarre, une intégration en cours d’exécution se démonte, cesse de lire les touches et supprime sa variable globale. Une intégration qui se charge alors qu’une autre application occupe la console affiche un avertissement et ne démarre pas.
- **L’intégration embarque sa propre version de React 19.** Elle n’a ni `react-dom` ni imports nus, donc la version de React de la page, une table d’importation pour `react` et React DevTools n’ont aucun effet sur elle.

<!-- s:5bd6dcbe49 -->
Chargement des fichiers

<!-- s:631a37c837 -->
| Fichier | Chargement | gzip |
| :-- | :-- | --: |
| `embed.js` | Avec la page | 2,9 ko |
| `assets/text-console-[hash].js` | Lorsque la page contient un `<text-console>` | 4,0 ko |
| `assets/embed-client-[hash].js` et `assets/yoga-[hash].wasm` | À l’intention d’utiliser la console | 112,8 ko + 29,0 ko |
| `assets/embed-player-[hash].js` | À l’intention d’utiliser la console, à la place du client, pour une [route avec rendu côté serveur](#server-rendered-routes) | 22,7 ko |
| `assets/bidi-[hash].js` | La première fois que l’application affiche du texte de droite à gauche (voir [Chargement du moteur bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 ko |

<!-- s:d86aa9b2e1 -->
Les tailles correspondent à un encadré d’état avec bordure de 120 × 36. `text build --embed` affiche celles de votre application. `assets/embed-[hash].js` est une copie de `embed.js` sous un nom qui ne change jamais (voir [Déploiements](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` définit `<text-console>` et ne charge son fichier que lorsqu’un élément est présent sur la page. Il utilise le Shadow DOM, donc le CSS de la page n’atteint pas son contenu, et une politique `style-src 'self'` ne nécessite aucune modification.

<!-- s:9ceead3eca -->
Sans attributs, c’est une barre d’une ligne. Elle affiche le raccourci du navigateur pour ouvrir la console, puis demande un clic, puis liste les touches de l’application, qui s’illuminent lorsqu’elles lui parviennent. Dans Safari, la première étape indique d’activer « Afficher les fonctionnalités pour les développeurs web » dans les réglages de Safari.

<!-- s:899e0c7fe3 -->
Avec `mirror`, l’élément affiche la frame de l’application sur la page : la première frame prérendue avant tout autre chargement, puis l’application en cours d’exécution. Appuyer dessus démarre l’application et lui transmet les touches du visiteur, donc l’application fonctionne avec DevTools fermé. `chrome` dessine une fenêtre DevTools autour du miroir et implique `mirror`.

<!-- s:fefcb3e495 -->
| Attribut | Description |
| :-- | :-- |
| `mirror` | Afficher les frames de l’application |
| `chrome` | Afficher les frames dans une fenêtre DevTools |
| `title` | Le titre de la barre (par défaut : `title` dans `text.config.ts`) |
| `hints` | Les touches à lister, sous la forme `"← →:switch region, Enter:open"` (par défaut : `hints` dans `text.config.ts`) |
| `action` | La première action à effectuer, affichée sous la forme « Cliquez ici et… » (par défaut : `action` dans `text.config.ts`, ou appuyer sur la première touche indiquée) |

<!-- s:392012169b -->
Sur les écrans tactiles, un miroir affiche la première frame sans démarrer l’application, et la barre est masquée. Le texte de l’élément est en anglais.

<!-- s:13ff4ec1f4 -->
Réserver son espace

<!-- s:0f4e2c234d -->
`text build --embed` affiche une ligne de CSS pour la grille de votre application. Collez-la dans la feuille de style de la page. Elle dimensionne `<text-console>` avant le chargement du fichier de l’élément, donc rien sur la page ne bouge lorsque le fichier arrive. Pour la grille par défaut de 120 × 36, la ligne est :

<!-- s:a2d2741417 -->
La barre mesure 58 px de haut. Un miroir conserve les proportions de la grille, jusqu’à sa largeur naturelle (885 px pour 120 colonnes), et `chrome` ajoute 43 px. La taille ne dépend pas des polices. `reserveCss(cols, rows)` de `@textjs/app/experimental` renvoie la même ligne.

<!-- s:a1260c10c3 -->
Un miroir visible sans défilement est généralement le plus grand élément de la page, il détermine donc le Largest Contentful Paint (LCP) de la page. Sa première frame s’affiche après le chargement de `embed.js` puis du fichier de l’élément, l’un après l’autre. Le reste de la page s’affiche comme il le ferait sans l’intégration. Un miroir plus bas dans la page n’affecte pas le LCP. Sur une page ayant ses propres scripts différés, comme une application React, `<script type="module" async src="…">` exécute `embed.js` sans les attendre, donc un miroir visible sans défilement s’affiche plus tôt.

<!-- s:4206a424a5 -->
Mise en forme

<!-- s:834fbf40e6 -->
Pour centrer un miroir, donnez-lui des marges en ligne automatiques :

<!-- s:6dde2b2766 -->
Il est sombre par défaut. Définissez `color-scheme: light` pour des couleurs claires, ou définissez les deux couleurs dont le mélange produit toutes les autres nuances. `::part(frame)` met en forme la frame elle-même. `chrome` conserve l’arrière-plan de DevTools.

<!-- s:f5e077273b -->
Routes avec rendu côté serveur

<!-- s:eb293d9fb4 -->
Lorsque `initialPath` est une route avec `export const runtime = "server"`, `embed.js` charge le lecteur de frames à la place de l’environnement d’exécution client. Il diffuse les frames depuis le serveur d’où provient `embed.js` : exécutez donc `text start` ou l’adaptateur `bun`. Les autres adaptateurs font échouer la compilation. Consultez [Rendu côté serveur](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Une page sur un autre site ne peut ouvrir une session en direct que si son origine figure dans `allowOrigins` :

<!-- s:6ec7048857 -->
- Une session ne répond qu’à l’origine qui l’a ouverte.
- Par défaut, Text.js supprime les cookies et l’en-tête `Authorization` des sessions provenant d’autres sites, donc le [middleware](/docs/middleware) voit un visiteur déconnecté. `credentials: true` les conserve et nécessite des origines exactes. Le navigateur les envoie lorsque la page et le serveur partagent un domaine enregistrable (`www.example.com` et `console.example.com`) et que le cookie couvre le serveur (`Domain=example.com`, ou défini sur `console.example.com`). Depuis d’autres sites, il envoie uniquement les cookies définis avec `SameSite=None; Secure`, et les navigateurs qui bloquent les cookies tiers n’en envoient aucun.
- Une session en direct envoie des requêtes préliminaires `OPTIONS` à `/__textjs/live` dès sa connexion et lors de ses reconnexions. Les requêtes préliminaires ne contiennent ni cookies ni `Authorization`, donc un middleware qui correspond à ce chemin doit laisser passer les requêtes `OPTIONS` sans authentification.
- Derrière un proxy inverse ou un CDN, définissez `server.trustProxy` (voir [Derrière un proxy](/docs/deploying#behind-a-proxy)). Sans cela, tous les visiteurs ont l’adresse du proxy, donc ils partagent tous une même limite de sessions par client.

<!-- s:f739524722 -->
`text dev` accepte les pages sur `localhost`, `127.0.0.1` et `[::1]` sur n’importe quel port sans `allowOrigins`, sauf si `credentials` est défini.

<!-- s:d5df7bf60f -->
Hébergement

<!-- s:4bef54c1c0 -->
`text start` et les adaptateurs `bun`, `vercel` et `cloudflare` servent une compilation d’intégration avec ces en-têtes. L’adaptateur `static` les écrit dans `_headers`, que Cloudflare Pages et Netlify lisent. Sur tout autre hébergement, comme un bucket de stockage ou le dossier `public/` du site, définissez-les vous-même :

<!-- s:be81a4c5ec -->
| Chemin | En-têtes |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Les deux, lorsque le site est sur une autre origine | `Access-Control-Allow-Origin: *` et `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Les navigateurs récupèrent les scripts de module et WebAssembly avec CORS, donc les fichiers sur une autre origine nécessitent `Access-Control-Allow-Origin`. Servez `yoga-[hash].wasm` en tant que `application/wasm`, compressé (voir [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Déploiements

<!-- s:01b888e293 -->
`embed.js` est revalidé à chaque chargement de page, donc les nouveaux visiteurs reçoivent immédiatement un nouveau déploiement. Un onglet qui a chargé le précédent `embed.js` importe toujours les fichiers du build précédent lorsque le visiteur ouvre la console, parfois des heures plus tard. Gardez le dossier `assets/` du déploiement précédent en ligne : copiez les nouveaux fichiers par-dessus les anciens au lieu de synchroniser avec suppression, puis supprimez les anciens fichiers après un jour ou deux. Pour figer un build, placez son fichier `assets/embed-[hash].js` dans la balise. Les fichiers de ce build doivent aussi rester en ligne.

<!-- s:b748b07652 -->
Lorsque les fichiers ne sont plus disponibles, `embed.js` affiche un avertissement qui demande au visiteur de recharger la page, sans démarrer l’application ni recharger la page lui-même.

<!-- s:fce19037b3 -->
Politique de sécurité du contenu

<!-- s:de8e30a920 -->
`embed.js` ne nécessite aucun script ni style en ligne. Ajoutez ces valeurs à la politique de la page hôte, avec `'self'` à la place de l’origine lorsque `dist/` est sur la même origine :

<!-- s:2da4077ce0 -->
| Directive | Valeur | Usage |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` et ses fragments |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, dans les applications rendues côté client |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`, et `/__textjs/live` pour les routes avec rendu côté serveur |
| `img-src` | `data:` | Uniquement un `<text-console mirror>` dont l’application dessine `<Image>` ou `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Charger l’application vous-même

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` exporte les éléments qui composent `embed.js`, pour les pages qui chargent une application à leur manière :

<!-- s:238cbf53ee -->
| Export | Description |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Ce que `embed.js` exécute : afficher la première frame dans la console, attendre une intention d’utiliser la console, puis appeler `boot` |
| `bootEmbedClient(options)` | Démarrer une application rendue côté client avec un routage en mémoire et une saisie clavier soumise aux règles de la page |
| `bootEmbedPlayer(options)` | Démarrer le lecteur de frames pour une route avec rendu côté serveur |
| `createHostInput(options)` | Saisie clavier qui suit les règles ci-dessus |
| `createTextConsoleMount(config)` | Renvoie une fonction `mount(element, shell?)` pour `<text-console>` |
| `reserveCss(cols, rows)` | Le CSS qui réserve l’espace de `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` et `BYPASS_SELECTOR` sont les sélecteurs des éléments qui démarrent l’application et des éléments qui conservent leurs propres touches.
