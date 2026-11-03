<!-- s:16c98cd381 -->
Text.js affiche des applications React dans la console DevTools de Chrome. À part un champ de saisie masqué, la page n’a pas d’interface. Chaque frame de l’application correspond à un seul appel à `console.log`.

<!-- s:fe9cd991d4 -->
La console comme écran

<!-- s:5ae20a07fc -->
`console.log` accepte une chaîne de format. Chaque `%c` applique le CSS de l’argument suivant au texte qui le suit, jusqu’au prochain `%c` :

<!-- s:2822a0243c -->
Ces styles peuvent définir les couleurs, les arrière-plans, le gras, l’italique et le soulignement, et la police de la console est à chasse fixe (Menlo sur macOS). Avec une police à chasse fixe et des couleurs qui peuvent changer à chaque séquence de caractères, la console fonctionne comme une grille de cellules de caractères stylisées. On peut y dessiner des bordures, des panneaux, des champs de saisie et des graphiques.

<!-- s:585742694b -->
Une frame comme grille de cellules

<!-- s:04a12244bc -->
Le moteur de rendu conserve chaque frame dans un `CellBuffer`. Les caractères occupent un tableau typé, les couleurs de premier plan et d’arrière-plan deux autres, et les attributs comme le gras et le soulignement un quatrième. Les tableaux sont alloués une fois pour une taille donnée et réutilisés à chaque frame.

<!-- s:2ff86351b3 -->
Pour écrire une frame dans la console, le pilote parcourt chaque ligne et regroupe en séquences les cellules voisines qui partagent un style. Chaque séquence devient un span `%c`, et les lignes sont jointes avec `\n`. Notre tableau de bord de test de 100×32, soit 3200 cellules, est encodé en environ 200 spans.

<!-- s:48a9b4f008 -->
Un appel par frame

<!-- s:aa2cafe395 -->
Écrire chaque ligne dans un message distinct ne fonctionne pas. Chaque message reçoit sa propre bordure et son propre lien vers la source dans DevTools, et DevTools regroupe les messages consécutifs identiques derrière un compteur de répétitions, si bien que deux lignes identiques d’un tableau fusionneraient en une seule. Une frame écrite dans un seul message reste d’un seul tenant.

<!-- s:ea38228d16 -->
Deux éléments du texte doivent d’abord être échappés. Un `%` littéral s’écrit `%%`, pour qu’un texte comme `100%` ne puisse pas consommer un argument de style. DevTools transforme aussi les URL en liens et les redessine avec ses propres couleurs, donc `://` et `www.` reçoivent un word joiner (U+2060), dont la largeur est nulle :

<!-- s:ec8783435a -->
Aucune écriture pour les frames inactives

<!-- s:8b7f1f9d06 -->
Chaque ligne du tampon est hachée. Si aucun hachage n’a changé depuis la dernière frame, le pilote retourne avant de construire une chaîne et ne touche jamais à la console. Une application qui attend une saisie ne fait aucun appel.

<!-- s:43c3523265 -->
Lorsqu’une ligne a changé, le pilote efface la console et y écrit la nouvelle frame :

<!-- s:5b584e930a -->
Seules les lignes dont le hachage a changé sont réencodées. Les autres réutilisent les spans de la frame précédente.

<!-- s:99a3c4d459 -->
Saisie

<!-- s:e95aae4719 -->
La console ne reçoit pas les frappes au clavier, c’est donc la page qui les recueille. Un `<textarea>` masqué reçoit les frappes, les collages et la composition IME, puis les transforme en événements clavier pour l’application. Un clic sur la page lui donne le focus.

<!-- s:88cae4fc43 -->
La suite

<!-- s:cb5f6bd294 -->
Les prototypes `@textjs/core` 0.0.x sur npm regroupent tout dans un seul paquet. Text.js 0.1 déplace le moteur de rendu décrit ici dans `@textjs/core`, le réconciliateur React dans `@textjs/react`, et ajoute un App Router.
