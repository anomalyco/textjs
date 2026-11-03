<!-- s:b808ed6cd6 -->
Text.js est distribué via trois dist-tags npm. Tous les paquets (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` et `eslint-plugin-textjs`) partagent la même version, de sorte qu’un seul numéro de version décrit l’ensemble du framework.

<!-- s:a2c3664770 -->
Canaux

<!-- s:6b5c5ba172 -->
| Canal | dist-tag | Version | Installation |
| :-- | :-- | :-- | :-- |
| Stable | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Publiée à la sortie de `2.0.0` | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Utilisez le canal stable en production. Utilisez le canal canary pour essayer les correctifs et les fonctionnalités dès leur arrivée sur `dev`. Dès qu’une branche LTS existe, utilisez-la si vous effectuez une mise à niveau par an.

<!-- s:abc686bd76 -->
Stable

<!-- s:df32c144c0 -->
Les versions stables suivent le [versionnage sémantique](https://semver.org) : les versions correctives corrigent des bugs, les versions mineures ajoutent des fonctionnalités rétrocompatibles et les versions majeures peuvent introduire des ruptures d’API après une période de dépréciation. Une version stable provient d’une version canary ayant passé l’intégralité de la suite de tests et est publiée avec une attestation de provenance npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Chaque push vers `dev` dans le dépôt officiel fait l’objet d’une vérification des types et de tests, puis est publié sous le numéro de la prochaine version corrective avec le suffixe `-canary.N` :

<!-- s:d8b8cffefe -->
| `latest` | Push vers `dev` | Version publiée |
| :-- | :-- | :-- |
| `1.0.0` | premier | `1.0.1-canary.0` |
| `1.0.0` | deuxième | `1.0.1-canary.1` |
| `1.0.1` | suivant | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` reprend à partir du numéro canary le plus élevé déjà présent sur npm, de sorte que les numéros ne se répètent jamais. Les versions canary ne sont pas enregistrées dans les commits du dépôt. Ajoutez `[skip canary]` à un message de commit pour éviter une publication.

<!-- s:762894d754 -->
Les versions canary sont des builds de `dev`, la branche dans laquelle toutes les pull requests sont fusionnées. Elles peuvent modifier ou supprimer sans préavis des API non encore publiées en version stable. Fixez une version canary exacte si vous en dépendez.

<!-- s:6999c4e986 -->
Provenance

<!-- s:18722b1d6c -->
Les versions sont publiées depuis GitHub Actions avec `npm publish --provenance`, ce qui relie chaque archive au commit et au workflow exacts qui l’ont produite. Vérifiez un paquet avec :

<!-- s:57d2e7b18d -->
Publier une version

<!-- s:a3217d58a6 -->
Les responsables de maintenance incrémentent la version de tous les paquets du workspace de manière synchronisée avec les scripts de publication :

<!-- s:614a1ea872 -->
`release:version` réécrit chaque `package.json` et les constantes de version qui le reflètent (`VERSION`, `rendererVersion` du réconciliateur), refuse de s’exécuter lorsque les versions des paquets divergent, et `--dry-run` affiche le plan. `release:publish` compile, crée les archives (en résolvant `workspace:*`), applique `publishConfig`, refuse de publier une préversion sur `latest` ou une version stable sur `canary`, et ignore les versions qui existent déjà sur npm.

<!-- s:ec6955472a -->
Consultez la [politique de support](/docs/support-policy) pour connaître la durée de maintenance de chaque branche de versions.
