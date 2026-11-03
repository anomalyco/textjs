<!-- s:d2d5ef69d7 -->
Cette page décrit la durée pendant laquelle chaque branche de Text.js reçoit des correctifs et ce qui constitue un changement incompatible.

<!-- s:80371443b7 -->
Branches de versions

<!-- s:19aa9fdfd3 -->
| Statut | Mises à jour reçues | Durée |
| :-- | :-- | :-- |
| Active | Fonctionnalités, correctifs, correctifs de sécurité | Jusqu’à la prochaine version majeure |
| LTS en maintenance | Correctifs critiques et correctifs de sécurité | 12 mois après la sortie de la prochaine version majeure |
| Fin de vie | Aucune | — |

<!-- s:d5987f6ecf -->
Seule la dernière version mineure d’une version majeure reçoit des correctifs : à la sortie de `1.5.0`, les correctifs sont intégrés à `1.5.x`, pas à `1.4.x`. À la sortie de `2.0.0`, la dernière version mineure de `1.x` devient la branche LTS en maintenance et est publiée sous les dist-tags `lts` et `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Version | Statut | Prise en charge jusqu’à |
| :-- | :-- | :-- |
| 1.x | Active | 12 mois après 2.0.0 |

<!-- s:d71377bf9c -->
Correctifs apportés aux versions LTS

<!-- s:043b92b499 -->
- Vulnérabilités de sécurité dans les paquets Text.js
- Plantages, pertes de données et échecs de compilation sans solution de contournement
- Compatibilité avec les nouvelles versions de Chrome, Edge, Firefox et Safari qui perturbent le rendu dans la console
- Compatibilité avec les environnements d’exécution et les cibles de déploiement pris en charge

<!-- s:e01d1121d2 -->
Les nouvelles fonctionnalités, les travaux sur les performances et les refactorisations sont intégrés uniquement à la branche active.

<!-- s:d1c69ba9bc -->
Changements incompatibles

<!-- s:82596fcd52 -->
Les éléments suivants ne changent que dans une version majeure, après un avertissement de dépréciation dans au moins une version mineure :

<!-- s:4ca9fd7807 -->
- Exports publics de `@textjs/app`, `@textjs/react` et `@textjs/core`, y compris `@textjs/app/server` et `@textjs/app/cache`
- Options de `text.config.ts`, commandes et options de la CLI `text`
- Conventions de fichiers dans `app/`, `middleware.ts` et configuration des segments de route
- Layouts de sortie des adaptateurs (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
Ne sont pas couverts : les API marquées comme expérimentales ou `unstable_`, y compris tout ce qui se trouve sous `@textjs/core/experimental` et `@textjs/react/experimental` (elles peuvent changer dans une version mineure, avec des notes dans le journal des modifications), les éléments internes tels que `@textjs/core/internal`, les en-têtes `x-middleware-*` et les métadonnées de compilation de `.text/`, les versions canary, ainsi que les chaînes de format et le CSS exacts de `console.log` (les frames restent visuellement identiques ; leur encodage peut devenir plus rapide).

<!-- s:5c7d9aae9b -->
Environnements d’exécution pris en charge

<!-- s:30122ce1bb -->
| Environnement d’exécution | Versions prises en charge |
| :-- | :-- |
| DevTools de Chrome / Edge | Version stable actuelle et les deux précédentes |
| Consoles de Firefox et Safari | Version stable actuelle |
| Node.js | Versions LTS actives et en maintenance (`text start`, fonctions Vercel) |
| Bun | Dernière version 1.x |
| Cloudflare Workers | `compatibility_date` au 2025-01-01 ou ultérieure, `nodejs_compat` |

<!-- s:509c18536b -->
L’abandon d’une version d’un environnement d’exécution ayant atteint sa propre fin de vie ne constitue pas un changement incompatible.

<!-- s:52543dba9b -->
Sécurité

<!-- s:2aff0514c5 -->
Signalez les vulnérabilités de manière confidentielle à [security@textjs.org](mailto:security@textjs.org) ou via les [avis de sécurité GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Les correctifs sont publiés simultanément pour toutes les branches prises en charge, et l’avis est publié une fois les versions corrigées disponibles sur npm.

<!-- s:b933131934 -->
Consultez [Canaux de publication](/docs/release-channels) pour savoir comment les versions et les dist-tags sont produits.
