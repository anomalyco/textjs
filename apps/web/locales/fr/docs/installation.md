<!-- s:98c33b0a07 -->
Prérequis

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ ou Node.js 22+
- Chrome, Edge, Firefox ou Safari sur ordinateur

<!-- s:d7f4dad213 -->
Créer une application

<!-- s:b32738e24d -->
Choisissez un modèle (`starter`, `dashboard` ou `opencode`), puis démarrez le serveur de développement :

<!-- s:21fb743289 -->
Ouvrir la console

<!-- s:14e4fdc5be -->
Accédez à `http://localhost:3000` et ouvrez la console.

<!-- s:a370660339 -->
| Navigateur | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome, Edge, Arc, Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | macOS uniquement |

<!-- s:de7134a591 -->
Dans Safari, activez d’abord **« Afficher les fonctionnalités pour les développeurs web »** dans Réglages → Avancés.

<!-- s:8f6c6cf39e -->
Cliquez sur la page pour lui donner le focus, puis saisissez du texte. Ancrer DevTools en bas donne la grille la plus large.

<!-- s:9807a8b582 -->
Paramètres de la console

<!-- s:803094bd72 -->
Désactivez **« Conserver le journal »** dans les paramètres de la console. Text.js ajoute à la suite un message par frame et efface la console pour libérer les anciennes frames. Lorsque « Conserver le journal » est activé, DevTools ignore l’effacement et les anciennes frames s’accumulent.

<!-- s:35e7d1d33e -->
Installation manuelle

<!-- s:ff78ccae69 -->
Sans le framework

<!-- s:26f8520062 -->
Montez n’importe quel arbre React dans la console depuis un site existant :
