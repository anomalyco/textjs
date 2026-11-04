<!-- s:32f8804e6b -->
Text.js est un framework React pour les applications qui s’affichent dans la console du navigateur.

<!-- s:814ee9e9d7 -->
[Documentation](https://textjs.org/docs) · [Apprendre](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Une application Text.js affichée dans la console DevTools de Chrome

<!-- s:9535b10be9 -->
Démarrage rapide

<!-- s:c7a467af05 -->
Ouvrez [localhost:3000](http://localhost:3000) et [ouvrez la console du navigateur](https://textjs.org/docs/installation#open-the-console). Text.js nécessite Bun 1.2+ ou Node.js 22+ et Chrome, Edge, Firefox ou Safari sur ordinateur.

<!-- s:9bf34f44c9 -->
Exemple

<!-- s:3f1f0605f9 -->
Le layout de chaque frame est calculé avec Yoga, puis la frame est encodée par plages en spans `%c` et écrite en un seul appel à `console.log`. Une frame sans cellule modifiée n’écrit rien dans la console. [`ARCHITECTURE.md`](ARCHITECTURE.md) décrit le pipeline de rendu.

<!-- s:8b78543399 -->
Paquets

<!-- s:cf0456d221 -->
| Paquet | Version | Description |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` et gestionnaires de route |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Réconciliateur, composants et hooks |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Tampon de cellules, layout et pilote de console `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analyseur et moteur de rendu de polices FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Passerelle locale entre textjs.org/opencode et un serveur OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Générateur de projets |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Règles ESLint pour les applications Text.js |

<!-- s:8b249e49fa -->
Les extensions pour l’éditeur et le navigateur se trouvent également ici :

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs) : l’[extension VS Code](https://textjs.org/docs/vscode), avec un aperçu en direct, la génération de structures App Router et des liens vers les codes d’erreur
- [`packages/devtools-extension`](packages/devtools-extension) : l’[extension Chrome DevTools](https://textjs.org/docs/devtools-extension), avec un arbre de composants, un inspecteur de frames et une chronologie

<!-- s:08b48c3d0b -->
Développement

<!-- s:5facd29c1d -->
Le site s’exécute à l’adresse [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) décrit les autres applications, les scripts de test de bout en bout et le processus de publication.

<!-- s:47964f2d9e -->
Contribuer

<!-- s:b236bea0a4 -->
Les signalements de bugs et les pull requests sont les bienvenus. Lisez d’abord [CONTRIBUTING.md](CONTRIBUTING.md) et signalez les problèmes de sécurité comme indiqué dans [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Licence

<!-- s:a950c8684e -->
[MIT](LICENSE). Les fichiers tiers inclus conservent leurs propres licences : les polices FIGlet dans [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) et les polices dans `apps/web` et `merch/fonts` (SIL Open Font License 1.1).
