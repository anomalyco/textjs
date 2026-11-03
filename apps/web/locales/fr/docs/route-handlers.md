<!-- s:da329a4f1b -->
Les gestionnaires de route définissent des points de terminaison d’API dans le répertoire `app` avec les API Web `Request` et `Response`.

<!-- s:895d99d1b5 -->
Convention

<!-- s:ac1d1b9fcb -->
Exportez `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` ou `OPTIONS`. Les gestionnaires s’exécutent avec `text dev`, `text start` et chaque [adaptateur de déploiement](/docs/deploying) côté serveur, après le [middleware](/docs/middleware). Mettez les gestionnaires `GET` en cache avec la [configuration des segments de route](/docs/caching).

<!-- s:53eeba0ff3 -->
Gestionnaires dynamiques

<!-- s:bfa759b36e -->
Les valeurs de `params` sont décodées. Un chemin contenant une barre oblique ou une barre oblique inverse encodée (`%2F`, `%5C`) reçoit un `400`, alors transmettez les identifiants susceptibles de contenir `/` dans un paramètre de requête ou encodez-les en base64url.

<!-- s:6c694827e4 -->
Diffusion en continu

<!-- s:734a652dda -->
Renvoyez un `ReadableStream` pour les événements envoyés par le serveur :

<!-- s:9ff4b304cc -->
Réécritures

<!-- s:7ca1bb6854 -->
Le serveur relaie les requêtes vers les destinations externes, le navigateur n’effectue donc aucune requête interorigine.

<!-- s:82320e9df7 -->
Accès à un démon local par proxy

<!-- s:7730eaa5fb -->
Utilisez `proxy` pour accéder à un processus sur votre machine :

<!-- s:c00af013ff -->
C’est ainsi que le [modèle OpenCode](/docs/opencode) se connecte à un serveur local.
