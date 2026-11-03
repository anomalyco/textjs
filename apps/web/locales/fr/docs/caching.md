<!-- s:5b67b32177 -->
Mettez en cache les réponses des gestionnaires de route et les données, puis revalidez-les à intervalles réguliers ou à la demande. Les entrées périmées sont servies immédiatement pendant qu’une actualisation s’exécute en arrière-plan.

<!-- s:be697310c8 -->
Gestionnaires de route

<!-- s:e85fc29fe2 -->
Les gestionnaires de route `GET` sont dynamiques par défaut. Activez la mise en cache avec la configuration du segment de route :

<!-- s:e4ccf65c67 -->
| Export | Comportement |
| :-- | :-- |
| *(aucun)* | Exécution à chaque requête |
| `dynamic = "force-static"` | Mise en cache jusqu’à revalidation |
| `revalidate = N` | Mise en cache ; péremption après `N` secondes |
| `revalidate = 0` ou `dynamic = "force-dynamic"` | Exécution à chaque requête |

<!-- s:274c053db6 -->
Les autres valeurs de `dynamic` provoquent l’erreur `TX031`. Cela inclut `"error"` de Next.js, car Text.js ne peut pas détecter quand un gestionnaire lit la requête.

<!-- s:0fae4045f6 -->
Les gestionnaires mis en cache disposent d’une entrée par chemin, et leur `request` se présente comme au moment du build : sans chaîne de requête, en-têtes, cookies ni corps. Lisez plutôt ces éléments dans un gestionnaire dynamique. Seuls `GET` et `HEAD` sont mis en cache. Les réponses avec un statut `5xx`, un en-tête `Set-Cookie` ou `Cache-Control: private` / `no-store` sont renvoyées, mais jamais stockées.

<!-- s:b618d4732f -->
En-têtes

<!-- s:c0a6cf7351 -->
Les réponses mises en cache contiennent :

<!-- s:b5f8cfecb4 -->
| En-tête | Valeur |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` ou `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, ou `s-maxage=31536000` pour `force-static` |

<!-- s:c1fb73c64a -->
Quand le [middleware](/docs/middleware) définit des cookies, effectue des réécritures ou remplace des en-têtes de la requête, l’en-tête généré devient `private, no-cache, no-store, max-age=0, must-revalidate`, afin que les caches partagés ne réutilisent jamais une décision propre à un visiteur. Un en-tête `Cache-Control` défini par le gestionnaire est conservé.

<!-- s:ae27ba22c7 -->
Avec `text dev`, la configuration du segment s’applique, mais rien n’est stocké : chaque requête exécute donc le gestionnaire.

<!-- s:64841df645 -->
Cache de données

<!-- s:2187e2262b -->
Mettez en cache toute fonction asynchrone avec `unstable_cache` de `@textjs/app/cache` :

<!-- s:4c26e099ff -->
La clé se compose des éléments de clé et des arguments, encodés par valeur (les arguments `undefined` et `null`, `Map`, `Set`, `Date` et `URL` restent distincts). Sans éléments de clé, le code source de la fonction et son lieu de création l’identifient ; fournissez des éléments de clé dès que la fonction capture des valeurs, par exemple lorsqu’elle est créée à chaque requête ou dans une boucle. Les résultats sont sérialisés en JSON, donc chaque appel renvoie une nouvelle copie (et les objets `Date` reviennent sous forme de chaînes) ; un résultat impossible à sérialiser lève une exception. `cache(fn, { key, tags, revalidate })` accepte les mêmes paramètres sous forme d’objet d’options.

<!-- s:608eee0e9b -->
Dans un gestionnaire de route mis en cache, les entrées de données transmettent leurs tags et leur plus court `revalidate` à la route : revalider `"posts"` actualise aussi `/api/posts`. Un appel de données avec `revalidate: 0` rend la route dynamique.

<!-- s:5537f337ee -->
Servir les données périmées pendant la revalidation

<!-- s:7d23e84252 -->
Dès que l’âge d’une entrée dépasse `revalidate` :

<!-- s:d4dd1966dd -->
1. La requête suivante reçoit immédiatement la valeur périmée (`STALE`).
2. Une actualisation s’exécute en arrière-plan ; les requêtes simultanées la partagent.
3. Si l’actualisation lève une exception, la valeur périmée continue d’être servie et l’erreur est journalisée.

<!-- s:e6db7819cc -->
Sur Vercel et Cloudflare, les actualisations en arrière-plan sont enregistrées avec `waitUntil()`. Les entrées de plus d’un an sont toujours recalculées au premier plan.

<!-- s:5854b096d2 -->
Revalidation à la demande

<!-- s:686aa7f2f3 -->
| Appel | Invalidation |
| :-- | :-- |
| `revalidateTag("posts")` | Tout ce qui porte le tag `posts` ; recalcul à la requête suivante |
| `revalidateTag("posts", "max")` | Marquage comme périmé ; valeur périmée servie à la requête suivante pendant l’actualisation |
| `revalidatePath("/api/feed")` | Ce chemin |
| `revalidatePath("/api/posts/[id]")` | Tous les chemins d’une route dynamique |
| `revalidatePath("/api", "layout")` | Tout ce qui se trouve sous `/api` |

<!-- s:b132bd50eb -->
Les deux renvoient une promesse. Avec le stockage en mémoire, l’invalidation est immédiate ; attendez-la avec `await` lorsqu’un [stockage personnalisé](#custom-cache-stores) est asynchrone.

<!-- s:2aab4b4d00 -->
Stockages de cache personnalisés

<!-- s:7bee24a364 -->
Le stockage par défaut est un cache LRU en mémoire (1000 entrées, environ 50 Mo) par instance de serveur. Pour partager un cache entre les instances, faites pointer `cacheHandler` vers un module qui exporte un `CacheStore` par défaut :

<!-- s:593c57fca5 -->
Les entrées sont au format JSON brut. `setCacheStore(store)` installe un stockage à l’exécution à la place.

<!-- s:fe2404de51 -->
Notes sur les plateformes

<!-- s:5418a08901 -->
- Chaque instance serverless (fonctions Vercel, isolats Cloudflare) possède son propre cache en mémoire. `Cache-Control: s-maxage` autorise aussi le CDN de la plateforme à mettre les réponses en cache ; la revalidation à la demande ne purge pas un CDN. Utilisez un `cacheHandler` partagé lorsque `revalidateTag` doit atteindre toutes les instances.
- Cloudflare exige le flag `nodejs_compat` (le cache utilise `AsyncLocalStorage`). Consultez [Déployer](/docs/deploying).
