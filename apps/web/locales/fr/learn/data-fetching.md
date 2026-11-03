<!-- s:23fef6717c -->
Acme Deploys a besoin de données réelles. Les gestionnaires de route se trouvent à côté de vos pages dans `app/`, utilisent les API Web `Request` et `Response` et s’exécutent avec `text dev` et `text start`. Ils partagent l’origine de l’application, les requêtes ne nécessitent donc aucune configuration CORS.

<!-- s:c6876ef862 -->
Un gestionnaire de route

<!-- s:b226d3ca25 -->
Appelez-le depuis l’invite de la console pendant que `text dev` s’exécute :

<!-- s:9ce3eb974c -->
Récupération de données dans une page

<!-- s:c02131685f -->
Récupérez les données dans un effet et affichez un `<Spinner>` jusqu’à leur arrivée. `r` relance la récupération ; `n` crée un nouveau déploiement par une requête POST, qui apparaît en cours de build et passe à l’état prêt une fois le build terminé.

<!-- s:34de603227 -->
États de chargement et d’erreur

<!-- s:8b95fe08be -->
Au lieu de gérer `loading` manuellement, un fichier `loading.tsx` placé à côté de la page s’affiche pendant sa suspension, et `error.tsx` intercepte toutes les erreurs qu’elle lève. Ce sont deux composants ordinaires :

<!-- s:6c694827e4 -->
Streaming

<!-- s:c16e24a117 -->
Les gestionnaires peuvent renvoyer un `ReadableStream`, qui transmet les journaux de build au tableau de bord ligne par ligne. Consultez [Gestionnaires de route](/docs/route-handlers) pour les événements envoyés par le serveur et la mise en place d’un proxy vers un démon local.
