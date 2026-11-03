<!-- s:5c794493de -->
Effectuez le rendu de l’arbre React d’une route sur le serveur et diffusez ses frames vers la console. Intégrez par prérendu la première frame de chaque route statique dans son HTML.

<!-- s:f5f9690d9e -->
Deux environnements d’exécution

<!-- s:26b5b0c1e5 -->
Chaque page est rendue à l’un de ces deux endroits :

<!-- s:2b217df435 -->
| | Client (par défaut) | Serveur (`runtime = "server"`) |
| --- | --- | --- |
| Exécution de l’arbre React | L’onglet du navigateur | `text dev` / `text start` / l’adaptateur `bun` (Bun ou Node) |
| Téléchargement par le navigateur | L’application complète : React, Yoga WASM, vos routes | Le lecteur de frames, environ 21 kB gzip |
| Accès aux données | `fetch()` vers les gestionnaires de route | Directement : bases de données, fichiers, `node:*`, secrets |
| Composants asynchrones | Utilisation de `use()` ou d’effets | Prise en charge des composants `async function` |
| Latence des frappes | Même tâche, synchrone | Un aller-retour vers le serveur |
| Fonctionnement sur un hébergement statique | Oui | Non, nécessite `text start` ou `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Les deux environnements d’exécution produisent les mêmes frames. Le lecteur de frames encode les cellules avec le même `CssConsoleDriver` et adopte la même cadence d’environ 15 fps, de sorte qu’une frame rendue côté serveur correspond octet pour octet à l’appel `console.log` du client.

<!-- s:70a0b18bdd -->
Activation

<!-- s:660b2936b0 -->
Exportez `runtime` depuis une page :

<!-- s:567f4b3d2b -->
`runtime` est lu pour chaque page sous forme d’une chaîne exportée statiquement (une annotation de type, `as const` ou une réexportation conviennent ; une valeur calculée ne convient pas). Les layouts, `loading.tsx`, `error.tsx` et `not-found.tsx` sont rendus là où leur page est rendue : un layout partagé par des pages client et serveur s’exécute aux deux endroits et est envoyé au navigateur, tandis que les layouts et les limites d’un segment qui ne contient que des pages serveur restent sur le serveur. Les hooks, le focus, `useInput`, `<Link>` et `useRouter()` se comportent comme côté client.

<!-- s:43c4fa1dac -->
Choisir l’environnement d’exécution

<!-- s:ac38ce3c55 -->
Utilisez l’environnement d’exécution **client** (par défaut) pour :

<!-- s:ced9e65891 -->
- Les interfaces avec beaucoup de saisie où chaque frappe doit être affichée dans la même tâche, comme les éditeurs et les filtres.
- Les applications déployées sur un hébergement statique ou un CDN.
- Les outils utilisables hors ligne.

<!-- s:54292284aa -->
Utilisez l’environnement d’exécution **serveur** pour :

<!-- s:bb8a20e6e2 -->
- Les tableaux de bord et les vues d’administration qui lisent des bases de données, des fichiers, des files d’attente ou des API privées. Les identifiants restent sur le serveur.
- Les routes avec des dépendances lourdes (SDK, analyseurs, tables de syntaxe) que vous ne voulez pas inclure dans le bundle du navigateur.
- Les pages qui doivent se charger rapidement sur des réseaux lents. Le navigateur télécharge le lecteur de 21 kB (gzip) au lieu de l’application complète.

<!-- s:920f4ad7e8 -->
Vous pouvez combiner les environnements d’exécution dans une même application. La navigation entre eux charge l’URL cible comme un nouveau document. Le bundle du navigateur remplace chaque page serveur par un substitut minimal, de sorte que les modules serveur et tout ce qu’ils importent ne sont jamais envoyés au client.

<!-- s:2de98cc507 -->
Nommez les modules réservés au serveur `*.server.ts`. Le build échoue si du code envoyé au navigateur (une page client, ou un layout utilisé par une page client) importe un module `*.server.*` ou un module intégré `node:*`, en indiquant le module à l’origine de l’import.

<!-- s:1c109f371d -->
Le [middleware](/docs/middleware) protège les routes serveur de la même manière que les documents : il s’exécute pour la route cible avant l’ouverture d’une session, avant chaque navigation au sein de la session (`router.push`, Précédent et Suivant), puis chaque fois que les cookies ou l’en-tête `Authorization` de la session changent. Lorsqu’il devrait rediriger, rejeter ou réécrire, le navigateur charge à la place l’URL comme un document, et le middleware répond à cette requête.

<!-- s:44ec23073a -->
Composants serveur asynchrones

<!-- s:491e80d70d -->
Sur le serveur, tout composant `async function` suspend son rendu jusqu’au `<Suspense>` ou au `loading.tsx` le plus proche, jusqu’à la résolution de sa promesse :

<!-- s:155b6ae10f -->
Chaque promesse est mise en cache par session avec une clé fondée sur le composant et ses props, de sorte qu’une nouvelle tentative de rendu réutilise la requête déjà en cours. Le cache est vidé lors d’un changement de route et lors d’un appel à `router.refresh()`. Pour relancer l’accès aux données après une saisie, appelez `router.refresh()` :

<!-- s:abfa753a7c -->
Les props transmises aux composants asynchrones doivent être sérialisables : chaînes, nombres, objets simples, tableaux, `Date`, `URL`, `Map`, `Set` et éléments. Les props de type fonction ne font pas partie de la clé (transmettez des données, pas des fonctions de rappel). Chaque session met en cache au maximum 256 promesses. Vous pouvez aussi envelopper manuellement un composant avec `serverComponent(fn)` depuis `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Les hooks (`useState`, `useInput`, …) ne fonctionnent pas dans un composant `async function`. Pour les interactions, rendez un composant classique autour de celui-ci ou en dessous.

<!-- s:5ae438610c -->
Fonctionnement

<!-- s:ec3e56dbc6 -->
- **Une session par onglet.** Chaque chargement de page ouvre sa propre session : une racine React, un historique de routeur en mémoire et un tampon de cellules sur le serveur. Les identifiants de session sont des valeurs aléatoires de 192 bits que le navigateur conserve uniquement en mémoire.
- **Deltas de cellules.** Le serveur n’envoie que les lignes dont le hachage a changé depuis la dernière frame reçue par cette connexion. Chaque ligne est envoyée sous forme de séquences de texte associées à une table de styles alimentée uniquement par ajout à la suite, et les graphèmes larges, les groupes d’emoji et les couleurs translucides sont conservés à l’identique.
- **Contre-pression.** Les frames sont espacées d’au moins 66 ms, et chacune est comparée au dernier contenu accepté par le socket. Lorsqu’une connexion lente cesse d’évacuer les données, les états intermédiaires sont ignorés et la frame suivante passe directement au plus récent.
- **Reconnexions.** Si le flux est interrompu, le lecteur se reconnecte avec son identifiant de session dans l’en-tête `x-textjs-live` (jamais dans l’URL) et reprend la même session, avec son état intact, à partir d’une nouvelle frame clé. Les mises à jour manquées de la barre d’adresse sont rejouées. Une session sans connexion cesse son rendu et est démontée après 30 secondes ; si le serveur l’a oubliée, le lecteur en ouvre une nouvelle.
- **Historique.** Précédent et Suivant déplacent les deux historiques du même nombre d’entrées, et `router.back()` sur le serveur déplace aussi l’historique du navigateur.
- **Sécurité.** Les deux points de terminaison rejettent les requêtes intersites (`Sec-Fetch-Site` et `Origin` ; `X-Forwarded-Host` ne compte qu’avec `server.trustProxy`). Les requêtes POST d’entrée nécessitent un corps JSON et l’en-tête `x-textjs-live`. Chaque événement est validé selon un schéma fixe, et les cibles de navigation doivent être des chemins sur votre origine. Seules les pages de votre manifeste `app/` peuvent être rendues. Les sessions sont liées aux cookies avec lesquels elles ont été ouvertes.
- **Limites.** Au maximum 64 événements par POST et environ 240 par seconde et par session (`429` au-delà), un délai maximal de 5 secondes pour le corps, 32 sessions par adresse client et `maxSessions` par processus (la session déconnectée depuis le plus longtemps est évincée en premier).

<!-- s:981308ad14 -->
Prérendu partiel

<!-- s:294fed5642 -->
`text build` effectue une fois le rendu de chaque route statique, à la taille `viewport` configurée, et intègre cette première frame dans le HTML de la route sous forme d’un petit `<script>` classique. La console s’affiche avant le chargement de tout module :

<!-- s:7eb15c9cc8 -->
1. **La coque statique.** Tout ce qui est rendu de manière synchrone. Chaque limite `<Suspense>` encore en attente affiche son contenu de repli, y compris les composants serveur asynchrones (qui ne s’exécutent pas pendant le rendu de la coque), `use()` et les modules chargés à la demande. `fetch()` ne se résout jamais pendant le rendu de la coque, donc les données chargées dans les effets restent elles aussi dans leur état de chargement.
2. **Les zones dynamiques.** Au démarrage de JavaScript, le moteur de rendu client ou le lecteur de frames diffuse la frame réelle. Elle est ajoutée à la suite, sous la coque, et le rideau propre à la frame d’hydratation fait sortir la coque de la vue lors du même affichage DevTools. La coque enregistre son instant d’affichage, de sorte que la première frame d’hydratation attend la fin de la fenêtre qui suit l’effacement dans DevTools au lieu d’emprunter son chemin lent.

<!-- s:94c6827f2c -->
Pendant le chargement, seule la coque efface la console. Le moteur de rendu d’hydratation démarre en mode d’ajout à la suite (`initialClear: false`), donc rien ne clignote, et la coque ne s’affiche que sur le chemin pour lequel elle a été rendue. Les routes dynamiques (`[id]`, `force-dynamic`) ne rendent aucune coque.

<!-- s:1eef464bae -->
Désactivez cette fonction avec `ppr: false` dans `text.config.ts`. Le prérendu exécute vos composants au moment du build : évitez donc les variables globales propres au navigateur dans le code de premier niveau des modules. Une route qui lève une exception, appelle `redirect()` / `notFound()` ou déclenche une navigation pendant le prérendu ne reçoit aucune coque (un écran d’erreur n’est jamais intégré au HTML), et le build vous en indique la raison.

<!-- s:c50a022df3 -->
La coque est rendue à la taille `viewport.width × viewport.height` (par défaut `120 × 36`), car le build ne peut pas connaître la taille de la console du visiteur ; la frame d’hydratation s’adapte ensuite à la console réelle. La coque est un `<script>` intégré : avec une politique de sécurité du contenu qui interdit les scripts intégrés, autorisez-le par son hachage ou définissez `ppr: false`.

<!-- s:ff96d35008 -->
Déploiement

<!-- s:e8a05a5448 -->
`text build` écrit les fichiers suivants :

<!-- s:8e75669ec0 -->
| Fichier | Rôle |
| --- | --- |
| `index.html`, `<route>/index.html` | Routes client avec leurs coques. Fonctionne sur tout hébergement statique. |
| `assets/player-[hash].js` | Le lecteur de frames. |
| `.text/server/live.mjs` | Les routes serveur, l’App Router et le moteur de rendu de la console. |
| `.text/pages/…`, `.text/live.html` | Les documents des routes serveur. |
| `.text/ansi/…` | Les premières frames pour [curl et les autres clients terminal](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` et l’[adaptateur `bun`](/docs/deploying#bun) les servent tous. Les routes serveur nécessitent un processus de longue durée : les adaptateurs `static`, `vercel` et `cloudflare` font échouer le build (`TX030`).
