<!-- s:5f3abb073d -->
Les clients HTTP en terminal reçoivent la première frame d’une page sous forme de texte ANSI en couleurs vraies au lieu du document HTML. Vous n’avez rien à configurer.

<!-- s:f501ff55e0 -->
Requêtes recevant une frame

<!-- s:3384141bb9 -->
Une requête reçoit une frame lorsque toutes ces conditions sont réunies :

<!-- s:05a334e510 -->
- la méthode est `GET` ou `HEAD` ;
- le `User-Agent` commence par `curl/`, `Wget/`, `wget2/`, `HTTPie/` ou `xh/` ;
- l’en-tête `Accept` est absent ou ne mentionne pas `text/html`.

<!-- s:4af297e372 -->
Les navigateurs, les robots d’indexation et les aperçus de liens reçoivent la page HTML. Pour obtenir le HTML avec curl, demandez-le :

<!-- s:03dba887a9 -->
La frame est choisie au moment où la page serait servie : après les [middlewares](/docs/middleware), les `rewrites` et les [gestionnaires de route](/docs/route-handlers), et jamais pour les fichiers ou les chemins dont le dernier segment contient un point. Les redirections des middlewares, les réponses `401`, les en-têtes et les réécritures s’appliquent à curl comme aux navigateurs. `/api/health` exécute toujours son gestionnaire et `/robots.txt` sert toujours le fichier.

<!-- s:e0c4f5f416 -->
Contenu de la frame

<!-- s:50fa4581ec -->
La frame est le premier rendu de la page, comme dans une [coquille prérendue](/docs/server-rendering#partial-prerendering) : chaque limite `<Suspense>` encore en attente affiche son contenu de repli. Les composants serveur asynchrones ne s’exécutent pas et `fetch()` ne se résout jamais, donc les données chargées dans les effets restent dans leur état de chargement.

<!-- s:08efeec61a -->
- **Taille :** 80 × 24 cellules. Une application avec une zone d’affichage fixe (`viewport.responsive: false`) utilise plutôt `viewport.width × viewport.height`.
- **Couleurs :** codes d’échappement SGR sur 24 bits dans le `viewport.theme` de l’application. Chaque ligne se termine par une réinitialisation, et la frame se termine par un saut de ligne.
- **Statut :** `200`, ou `404` avec la page introuvable de l’application lorsqu’aucune page ne correspond ou que la page appelle `notFound()`. Une page qui appelle `redirect()` pendant le rendu sert du HTML.

<!-- s:1125803eb1 -->
Les réponses sont de type `text/plain; charset=utf-8` avec les en-têtes `Vary: User-Agent, Accept` et `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, afin que les caches partagés ne stockent jamais une frame pour la servir à un navigateur. La page HTML à un chemin où curl reçoit une frame porte le même en-tête `Vary`.

<!-- s:0e2aba0a67 -->
Environnements compatibles

<!-- s:d40234848f -->
| Hébergement | Pages statiques | Pages dynamiques, chemins inconnus |
| :-- | :-- | :-- |
| `text dev` | Rendu à la demande | Rendu à la demande |
| `text start`, `bun` | Prérendu par `text build` | Rendu à la demande |
| `vercel`, `cloudflare` | Prérendu par `text build` | Page HTML |
| `static` | Page HTML | Page HTML |

<!-- s:11c905d6a6 -->
Les pages avec rendu côté serveur nécessitent `text start` ou `bun` (voir [Déploiement](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Les hébergements statiques ne peuvent pas répondre différemment selon le client, donc l’adaptateur `static` ne prend pas en charge les frames. Sur Vercel et Cloudflare, les frames des pages statiques sont livrées avec le build. Les pages dynamiques (`[id]`, `force-dynamic`) y servent du HTML, car les adaptateurs `vercel` et `cloudflare` ne déploient pas de moteur de rendu.

<!-- s:022d3d5541 -->
`text start` et `bun dist/server.js` rendent les pages restantes à la demande avec `.text/server/live.mjs` et conservent les 128 dernières frames pendant 10 secondes. Chaque serveur rend au maximum 20 pages non mises en cache par tranche de 10 secondes. Au-delà, curl reçoit la page HTML jusqu’à ce que le quota se renouvelle. Si `live.mjs` ne peut pas être chargé sur le serveur, par exemple parce qu’un module de page lit `window` au niveau supérieur, ces pages servent du HTML.

<!-- s:2500855fbd -->
`text build` indique les frames prérendues :

<!-- s:37f210b46a -->
Configuration

<!-- s:ac46338e16 -->
Modifiez la taille pour toute l’application ou désactivez les frames :

<!-- s:36fb2e113c -->
Une page peut modifier sa propre taille ou servir du HTML aux terminaux également :

<!-- s:11c75396f6 -->
Les tailles sont limitées à 1–500 cellules. Avec `ansi: false` dans `text.config.ts`, les exports des pages sont ignorés.

<!-- s:17ae9b44af -->
HTTP en clair

<!-- s:e9b0dd23eb -->
curl ne suit pas les redirections à moins que vous ne passiez `-L`. Vercel redirige les requêtes `http://` vers `https://`, tout comme Cloudflare lorsque l’option **Always Use HTTPS** est activée, donc `curl http://…` affiche la redirection au lieu de la frame. Partagez des URL `https://`.

<!-- s:740b32f53f -->
Serveurs personnalisés

<!-- s:144c78c64b -->
`@textjs/app/ansi` exporte les fonctions utilitaires de détection et de réponse pour les serveurs et les fonctions qui n’exécutent ni `text start` ni un adaptateur :

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` accepte aussi `(method, headers)` avec les `Headers` de l’API Web ou les `IncomingHttpHeaders` de Node. `frameToAnsi(buffer, { theme })` encode un `CellBuffer` rendu de la même manière que le framework.
