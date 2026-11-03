<!-- s:04615ef523 -->
`text build` produit un `dist/` portable. Un adaptateur le transforme au format attendu par une plateforme.

<!-- s:087f8d3137 -->
Adaptateurs

<!-- s:04908c6c09 -->
| Adaptateur | Sortie | Exécution |
| :-- | :-- | :-- |
| *(aucun)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Tout hébergeur statique |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
L’adaptateur peut aussi être défini par `TEXTJS_ADAPTER`. Lorsque `text build` s’exécute sur Vercel (`VERCEL=1`) ou Cloudflare Pages (`CF_PAGES=1`), l’adaptateur correspondant est sélectionné automatiquement.

<!-- s:9d8df946e5 -->
Les adaptateurs serveur (`bun`, `vercel` et `cloudflare`) exécutent le même pipeline que `text start` : [middleware](/docs/middleware), `rewrites`, [gestionnaires de route](/docs/route-handlers) avec le [cache des routes](/docs/caching), ressources statiques, puis le document de la console pour les URL des pages. Les clients de terminal comme curl reçoivent à la place la première frame de la page sous forme de texte ANSI. Sur `vercel` et `cloudflare`, cela ne concerne que les pages statiques (voir [curl et les clients de terminal](/docs/curl)). Les adaptateurs serveur servent les fichiers dont le nom contient un hachage sous `/assets/` avec `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Statique

<!-- s:9ebd0d2866 -->
Utilisez cet adaptateur pour les hébergements sans serveur, comme GitHub Pages, S3 ou un CDN. Les gestionnaires de route `GET` avec `dynamic = "force-static"` ou `revalidate` font l’objet d’un prérendu dans des fichiers : `app/api/feed.json/route.ts` devient `dist/api/feed.json`. Une copie de `index.html` est écrite dans `404.html` pour que les liens profonds ouvrent l’application console. Les hébergeurs statiques ne peuvent pas distinguer curl d’un navigateur, donc curl reçoit la page HTML.

<!-- s:1e90536a2a -->
Le build échoue en énumérant toutes les raisons si l’application a besoin d’un serveur : `middleware.ts`, [routes avec rendu côté serveur](/docs/server-rendering), gestionnaires de route dynamiques, gestionnaires de route avec des segments dynamiques ou méthodes autres que `GET`. Configurez plutôt `rewrites` sur l’hébergement.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
L’adaptateur `bun` écrit un serveur unique et autonome qui n’a pas besoin de `node_modules` à l’exécution. Il lit `PORT` (`3000` par défaut) et `HOSTNAME` (`0.0.0.0` par défaut), et ne sert jamais `server.js` ni `.text/`. Comme il s’agit d’un processus à longue durée de vie, il héberge aussi les [routes avec rendu côté serveur](/docs/server-rendering) (`export const runtime = "server"`) et leurs sessions actives, comme `text start`. Utilisez-le dans un conteneur :

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Ou poussez vers un dépôt Git connecté à Vercel : le build exécute `text build`, détecte Vercel et écrit `.vercel/output`.

<!-- s:3ee6894582 -->
| Sortie | Contenu |
| :-- | :-- |
| `static/` | Le build client (sous `basePath`) |
| `functions/_textjs/server.func` | Une fonction Node.js 22 qui sert tous les gestionnaires de route, avec streaming |
| `functions/_middleware.func` | Middleware de routage Edge : `middleware.ts` et chemins canoniques pour chaque application |
| `config.json` | En-têtes des ressources, règles de correspondance du middleware, réécritures, routes des gestionnaires et document de la console |

<!-- s:3f3ba93b7d -->
Le middleware edge utilise le protocole `x-middleware-next` / `x-middleware-rewrite`, donc les remplacements d’en-têtes et les réécritures ont lieu dans le routeur de Vercel avant d’atteindre la fonction ou le CDN. Toutes les règles de correspondance partagent un même motif de route `src`. Les requêtes qu’aucune règle ne couvre ignorent le middleware, sauf si leur chemin risque de ne pas être sous forme canonique (échappements en pourcentage, caractères encodés par un analyseur d’URL, `//`, segments `.` ou `..`, barre oblique finale). Le middleware compare alors le chemin canonique, vérifie `has` / `missing`, puis réécrit la requête vers ce chemin pour que Vercel la route de la même manière. Les applications sans `middleware.ts` reçoivent la même fonction edge, qui effectue uniquement la réécriture. Puisque chaque build inclut une fonction Edge, déployez depuis un compte Vercel connecté : les déploiements anonymes (`vercel deploy --temporary`) n’acceptent pas les fonctions Edge.

<!-- s:b5af065e25 -->
La fonction de gestion est interne. Chaque route de gestionnaire lui transmet le chemin correspondant dans l’en-tête de requête `x-textjs-path`. Cet en-tête est supprimé de chaque requête avant et après le middleware, et le middleware edge n’en transmet jamais (qu’il provienne du client ou de `middleware.ts`), donc seules les routes des gestionnaires peuvent le définir. Les requêtes vers `/_textjs/*` renvoient `404` sans exécuter la fonction, avant et après le middleware et les réécritures. Les routes générées respectent la casse, comme les règles de correspondance et les réécritures sur tous les autres hébergements.

<!-- s:5e18b8a450 -->
Les tests de l’adaptateur exécutent cette sortie avec une émulation locale du routeur de Vercel. Son comportement pour la correspondance de `src`, les captures de `dest`, les transformations d’en-têtes et les routes `status` a été vérifié sur des déploiements réels ; celui du middleware Edge ne l’a pas été, car il ne peut pas être déployé anonymement.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
La sortie utilise le mode avancé de Pages :

<!-- s:9f0923168f -->
| Fichier | Rôle |
| :-- | :-- |
| `_worker.js` | Middleware, réécritures, gestionnaires de route et document de la console |
| `_routes.json` | Envoie chaque requête au worker. Sans middleware ni `basePath`, `/assets/*` reste sur le CDN statique de Pages |
| `_headers` | Mise en cache immuable pour `/assets/*` (ajoutée à la suite de vos en-têtes) |
| `404.html` | Fait répondre Pages avec `404` pour les fichiers manquants au lieu de l’application (conservé si vous en avez un) |

<!-- s:9bc2b010d1 -->
`.text/` (bundles serveur et manifestes de build) est supprimé de `dist/`, car Pages publie le répertoire tel quel.

<!-- s:1200dbc88d -->
Activez l’option de compatibilité `nodejs_compat` dans le projet Pages (Paramètres → Exécution) ou dans `wrangler.toml` ; le cache de données utilise `AsyncLocalStorage`. Les fichiers statiques sont servis via la liaison `ASSETS`, et la revalidation en arrière-plan utilise `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Avec un middleware, chaque requête exécute le worker, y compris pour les ressources dont le nom contient un hachage, afin que le middleware voie tous les chemins donnant accès à un fichier. Chaque requête qui exécute le worker constitue une invocation Functions et compte dans votre quota de requêtes Workers. Pour un chargement de page, cela correspond au document et à chaque fichier qu’il récupère (2 pour une petite application de test avec un seul bundle JavaScript ; davantage pour les applications ayant plus de fichiers). Avec l’offre Workers Free, Pages sert les fichiers statiques sans le worker une fois le quota quotidien épuisé, ce qui contourne le middleware. Si le middleware protège quoi que ce soit dans `dist/`, réglez Paramètres → Exécution → Échec ouvert / fermé sur **Échec fermé**.

<!-- s:600050383d -->
Mise à niveau

<!-- s:e8733a2bfb -->
Les correctifs de sécurité de `@textjs/app` n’atteignent un déploiement qu’après sa reconstruction et son redéploiement :

<!-- s:c74adc728a -->
- Vercel : déployez le nouveau `.vercel/output`.
- Cloudflare Pages : déployez le nouveau `dist/`, avec `_worker.js` et `_routes.json`.
- Bun : déployez tout le nouveau `dist/` (`server.js`, ressources et bundles des sessions actives), puis redémarrez le serveur.
- `text start` : exécutez `text build`, puis redémarrez.

<!-- s:8047727085 -->
Les anciens déploiements restent accessibles à leurs propres URL (les URL de prévisualisation de Vercel et de Cloudflare Pages, par exemple). Supprimez-les ou placez-les derrière la protection d’accès de la plateforme.

<!-- s:f5e077273b -->
Routes avec rendu côté serveur

<!-- s:049ef31493 -->
Les [routes avec rendu côté serveur](/docs/server-rendering) conservent une session par onglet ouvert et nécessitent donc un serveur à longue durée de vie : `text start` ou l’adaptateur `bun`. Les adaptateurs `static`, `vercel` et `cloudflare` font échouer le build avec `TX030` lorsqu’une page exporte `runtime = "server"`.

<!-- s:eb19728e6b -->
Derrière un proxy

<!-- s:21a17d0b45 -->
`text start` écoute sur `127.0.0.1` et, tant qu’il utilise l’interface de bouclage, ne répond qu’aux hôtes `localhost`, `*.localhost` et aux adresses IP (protection contre le DNS rebinding). Les autres hôtes reçoivent un `403` avec `TX028`. Placez les paramètres publics dans `text.config.ts` :

<!-- s:43bd5471c8 -->
Sans `origin` ni `trustProxy`, `request.url` est construit à partir de l’en-tête `Host` validé, en `http`.

<!-- s:689cebe287 -->
Points de vigilance

<!-- s:f45e3fb003 -->
- `proxy` dans `text.config.ts` ne s’exécute que dans `text dev` et `text start` ; les adaptateurs ne l’incluent pas. Utilisez `rewrites`, que tous les adaptateurs serveur prennent en charge.
- Chaque instance serverless possède son propre cache en mémoire. Voir [Mise en cache](/docs/caching#platform-notes).
- Les `rewrites` qui utilisent des groupes d’expressions régulières bruts sont convertis en routes Vercel dans la mesure du possible ; les paramètres nommés (`:slug`, `:path*`) sont exacts.
