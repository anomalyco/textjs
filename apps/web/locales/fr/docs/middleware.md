<!-- s:88013af27d -->
Le middleware exécute du code avant la fin d’une requête. Il peut rediriger, réécrire, définir des en-têtes et des cookies, ou renvoyer lui-même une réponse.

<!-- s:895d99d1b5 -->
Convention

<!-- s:9e6d75b727 -->
Créez `middleware.ts` à la racine du projet (ou dans `src/`), à côté de `app/`. Exportez une fonction `middleware` (ou un export par défaut) et un `config` facultatif.

<!-- s:a4d39cdaaf -->
Le middleware s’exécute avant les [gestionnaires de route](/docs/route-handlers), les fichiers statiques et les pages de console, avec `text dev`, `text start` et chaque [adaptateur de déploiement](/docs/deploying) serveur. Il utilise les API Web `Request` et `Response`, donc le même fichier s’exécute sur Node, Bun, Vercel Edge et Cloudflare Workers.

<!-- s:dda0880da2 -->
Correspondance des chemins

<!-- s:1e1ec8c339 -->
Sans `config.matcher`, le middleware s’exécute pour chaque requête. Les règles de correspondance utilisent la même syntaxe que Next.js :

<!-- s:473d472bc8 -->
| Règle | Correspondances |
| :-- | :-- |
| `/about` | `/about` et `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, pas `/a` |
| `/user/:id(\\d+)` | `/user/42`, pas `/user/ada` |
| `/((?!api/).*)` | Tout sauf `/api/*` |

<!-- s:256aeeefbc -->
Ajoutez des conditions avec `has` et `missing` (en-tête, cookie, requête ou hôte) :

<!-- s:d756420343 -->
Les règles de correspondance s’appliquent au chemin sans `basePath`. Avec `text dev`, les requêtes de modules propres à Vite (`/@vite/*`, fichiers sources) ne déclenchent jamais le middleware.

<!-- s:75cd7297e6 -->
Chaque hôte détermine un chemin canonique unique avant l’exécution du middleware et l’utilise pour la correspondance, `request.nextUrl` et la recherche de routes, de gestionnaires et de fichiers. Les séquences d’échappement en pourcentage sont décodées et le chemin est réencodé comme le fait `new URL()`, les segments `.` et `..` sont résolus, et les barres obliques répétées et finales sont supprimées. `/ad%6din//users/` parvient au middleware sous la forme `/admin/users`, tandis que `/café` reste `/caf%C3%A9`. Une règle écrite avec une barre oblique finale, comme `/admin/`, correspond à `/admin`. Les requêtes dont le chemin contient une barre oblique ou une barre oblique inverse encodée (`%2F`, `%5C`), un caractère de contrôle ou un encodage en pourcentage invalide reçoivent un `400`. Les routes sont sensibles à la casse : `/Admin` ne correspond pas à `/admin`, et les fichiers statiques ne sont servis que sous leur nom exact.

<!-- s:3f5746eb4e -->
Faites correspondre les URL auxquelles un fichier est servi, pas seulement son nom de fichier. Cloudflare Pages sert aussi `report.html` à l’URL `/report`, donc une règle pour `/report.html` ne protège pas `/report`. Listez les deux, `matcher: ["/report", "/report.html"]`, ou conservez les fichiers protégés dans un répertoire et ciblez-le, par exemple avec `/reports/:path*` pour les fichiers de `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Effet |
| :-- | :-- |
| `NextResponse.next()` | Continuer vers la route |
| `NextResponse.redirect(url, status?)` | `307` par défaut ; `url` doit être absolue |
| `NextResponse.rewrite(url)` | Servir un autre chemin ; les origines externes passent par un proxy |
| `NextResponse.json(body, init?)` | Répondre avec du JSON |
| `new Response(...)` | Répondre avec n’importe quel contenu |

<!-- s:a8292924c3 -->
Ne renvoyez rien pour continuer sans modification. `next()` et `rewrite()` acceptent `{ status }` pour modifier le statut de la réponse finale. Seules les réponses créées par `NextResponse.next()` / `NextResponse.rewrite()` orientent le routage : toute autre `Response`, y compris celle renvoyée par `fetch()`, est envoyée telle quelle au client après suppression de ses en-têtes `x-middleware-*`.

<!-- s:583e778785 -->
`request.nextUrl` exclut `basePath` de `pathname`, tandis que ses propriétés `href` et `toString()` l’incluent. Pour rester dans l’application, clonez-le : `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
En-têtes

<!-- s:37748fa2c3 -->
Passez `request.headers` pour modifier ce que reçoivent les gestionnaires en aval, et `headers` pour ajouter des en-têtes de réponse :

<!-- s:60bf4677c2 -->
Les en-têtes de réponse du middleware sont ajoutés à la réponse finale, sauf si le gestionnaire de route définit le même en-tête.

<!-- s:ef657b8fe3 -->
Cookies

<!-- s:5d3635224b -->
`request.cookies` lit l’en-tête `Cookie` ; `response.cookies` écrit `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Les cookies définis sur une réponse `next()` ou `rewrite()` sont aussi visibles par le gestionnaire de route dans la même requête.

<!-- s:a65a1ce099 -->
Travail en arrière-plan

<!-- s:de593dc070 -->
Le deuxième argument dispose de `waitUntil()`, qui maintient les environnements d’exécution serverless actifs après l’envoi de la réponse :

<!-- s:63e13e87b3 -->
Remarques

<!-- s:971c06c875 -->
- Les pages rendues côté client s’affichent dans le navigateur, donc une réécriture vers une autre page change le fichier servi, pas la route affichée par l’application console. Les réécritures vers des gestionnaires de route, des fichiers statiques et des origines externes fonctionnent comme prévu.
- Le middleware peut lire le corps de la requête ; les gestionnaires de route le reçoivent toujours. Le corps des requêtes exclues par une règle de correspondance n’est jamais touché.
- `request.url` a toujours l’origine du serveur : les cibles de requête telles que `//other.host/x` sont normalisées avec une seule barre oblique initiale.
- L’[adaptateur statique](/docs/deploying#static) ne peut pas exécuter de middleware.
