<!-- s:f0ba49aa8c -->
Text.js 0.4 a ajouté un second emplacement pour le rendu d’une page. Par défaut, l’arbre React d’une page s’exécute dans l’onglet du navigateur. Une page qui exporte `runtime = "server"` s’exécute sur le serveur à la place, et le navigateur reçoit ses frames.

<!-- s:1a12ccffbb -->
`Load` est un composant `async function`. Sur le serveur, il suspend le rendu jusqu’à la limite `<Suspense>` ou au fichier `loading.tsx` le plus proche en attendant la résolution de sa promesse, et il peut lire directement des fichiers, des bases de données et des modules `node:*`. Les composants asynchrones chargent des données et ne peuvent pas utiliser de hooks. Les composants ordinaires qui les entourent conservent les hooks, le focus, `useInput`, `<Link>` et `useRouter()`, qui se comportent de la même façon dans les deux environnements d’exécution.

<!-- s:f6c454b214 -->
Ce que le navigateur télécharge

<!-- s:6764f4bb25 -->
Une page avec rendu côté serveur n’embarque ni React, ni Yoga, ni vos routes. Le navigateur charge un lecteur de frames d’environ 21 kB compressé avec gzip, qui contient un `CellBuffer` et le même `CssConsoleDriver` que le moteur de rendu client. Il cadence les frames aux mêmes 15 images par seconde, de sorte qu’une frame avec rendu côté serveur produit le même appel `console.log` que le client.

<!-- s:c1c4090983 -->
Le protocole

<!-- s:20c7e299b3 -->
Chaque onglet ouvre sa propre session sur le serveur : une racine React, un historique de routeur en mémoire et un tampon de cellules. Un même point de terminaison assure les deux sens de communication :

<!-- s:0cce1c98cc -->
Le serveur envoie uniquement les lignes dont le hachage a changé depuis la dernière frame reçue par cette connexion. Chaque ligne est transmise sous forme de segments de texte associés à une table de styles alimentée uniquement par ajout à la suite. Les graphèmes larges, les groupes d’émojis et les couleurs translucides arrivent intacts.

<!-- s:bff22f361e -->
Les frames sont espacées d’au moins 66 ms, et chacune est comparée à ce que le socket a accepté en dernier. Lorsqu’une connexion lente cesse d’évacuer les données, les états intermédiaires sont ignorés et la frame suivante passe directement à l’état le plus récent.

<!-- s:f0809ea8c7 -->
Si le flux est interrompu, le lecteur se reconnecte avec son identifiant de session dans l’en-tête `x-textjs-live` et reprend la même session à partir d’une nouvelle frame clé, en conservant son état. Les identifiants de session sont des valeurs aléatoires de 192 bits conservées en mémoire, jamais dans l’URL. Une session sans connexion cesse le rendu et est démontée après 30 secondes.

<!-- s:2c75bd5d29 -->
Les deux points de terminaison rejettent les requêtes intersites, et chaque événement d’entrée est validé selon un schéma fixe. Une session accepte au maximum 64 événements par POST et environ 240 par seconde.

<!-- s:a36b73dab0 -->
Composants asynchrones et données

<!-- s:2620366315 -->
La promesse de chaque composant asynchrone est mise en cache par session, avec le composant et ses props comme clé, afin qu’une nouvelle tentative de rendu réutilise la requête déjà en cours. Le cache est vidé lorsque la route change et lorsque vous appelez `router.refresh()` :

<!-- s:64ce138e40 -->
Les modules réservés au serveur sont nommés `*.server.ts`. La compilation échoue si du code envoyé au navigateur importe l’un d’eux ou un module natif `node:*`, et elle indique le module à l’origine de l’import.

<!-- s:981308ad14 -->
Prérendu partiel

<!-- s:9142a7d770 -->
Le prérendu partiel fonctionne sans serveur. `text build` effectue désormais un rendu de chaque route statique et intègre sa première frame au HTML de la route sous forme d’un petit `<script>` classique, afin que la console s’affiche avant le chargement de tout module.

<!-- s:d51b081ec7 -->
La structure initiale regroupe tout ce qui est rendu de façon synchrone. Une limite `<Suspense>` encore en attente affiche son contenu de repli, y compris pour les composants asynchrones, et `fetch()` ne se résout jamais pendant le rendu de la structure initiale.

<!-- s:33ba4145a3 -->
Au démarrage de JavaScript, le moteur de rendu client ou le lecteur de frames transmet la frame réelle en streaming. Comme la version 0.4 ajoute aussi les frames à la suite au lieu d’effacer la console, le moteur de rendu chargé de l’hydratation démarre avec `initialClear: false` et écrit sous la structure initiale, puis son rideau masque cette structure lors du même rafraîchissement de DevTools. La console est effacée exactement une fois, par la structure initiale.

<!-- s:f6986897ee -->
La structure initiale est rendue à la taille `viewport` configurée, `120 × 36` par défaut, car la compilation ne peut pas connaître la taille de la console du visiteur. Lorsque `viewport.responsive` est activé, la première frame en direct s’adapte à la console ancrée. Les routes dynamiques ne produisent aucune structure initiale, et `ppr: false` dans `text.config.ts` désactive le prérendu.

<!-- s:c61865edfd -->
Choisir un environnement d’exécution

<!-- s:aa5baec7ef -->
L’environnement d’exécution client reste celui par défaut. Les frappes s’affichent dans la même tâche, et l’application se déploie sur n’importe quel hébergement statique. L’environnement d’exécution serveur convient aux tableaux de bord et aux vues d’administration qui lisent des données privées, ainsi qu’aux routes dont vous ne voulez pas inclure les dépendances dans le bundle du navigateur. Une même application peut combiner les deux, et la navigation de l’un à l’autre charge l’URL cible comme un nouveau document.

<!-- s:68f8c75df7 -->
La référence complète se trouve dans [Rendu côté serveur](/docs/server-rendering).
