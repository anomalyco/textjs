<!-- s:710c25737e -->
Dans un framework DOM, les composants deviennent des nœuds DOM que le navigateur dispose et dessine dans la page. Dans Text.js, les composants deviennent des cellules, et chaque frame de cellules modifiée devient un appel à `console.log` dans DevTools. Nous appelons cela l’architecture inversée.

<!-- s:d00a01bf6f -->
Le pipeline

<!-- s:12c6e8f741 -->
Chaque étape existe parce que la console est un affichage inhabituel. Elle utilise une police à chasse fixe et s’organise en lignes, ses styles sont appliqués avec `%c`, et DevTools décide quand la redessiner.

<!-- s:db7daa7cf2 -->
Réconciliateur

<!-- s:f3cdc101e1 -->
`@textjs/react` est un réconciliateur React 19 (`react-reconciler@0.34.0`) avec deux éléments hôtes, `tx-box` et `tx-text`, ainsi que des instances de texte pour les enfants de type chaîne de caractères. Tout ce que vous importez, de `<Box>` à `<Markdown>`, repose sur ces éléments. Les commits sont planifiés sur `requestAnimationFrame`, et un appui sur une touche ou un collage déclenche un rendu synchrone dans la même tâche.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, compilé en WebAssembly, dispose l’arbre avec `pointScaleFactor = 1`, de sorte que chaque boîte occupe des cellules entières. Le texte est mesuré avec `Intl.Segmenter` et des tables de largeur des caractères d’Asie de l’Est, si bien que `你好` occupe quatre cellules et `🚀` en occupe deux. Si une modification ne peut pas changer la taille d’un nœud de texte, Yoga n’est pas sollicité à nouveau.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
La frame est une grille de tableaux typés alloués une seule fois : les caractères dans un `Uint32Array`, les couleurs de premier plan et d’arrière-plan compactées en `0xRRGGBBAA`, les attributs sous forme de masque de bits `Uint16Array`. Le dessin écrit dans ces tableaux et garde la trace des lignes touchées.

<!-- s:2a9b8dd7b1 -->
Le filtre

<!-- s:1cdfa61881 -->
Chaque ligne possède un hash FNV-1a de 32 bits en cache. Seules les lignes écrites depuis la dernière frame voient leur hash recalculé. Si aucune ligne n’a changé, le pilote retourne avant de construire une chaîne et n’effectue aucun appel à la console. Un indicateur de chargement dans un onglet masqué ne coûte rien, car il ne s’anime pas.

<!-- s:a36177ad5b -->
Encodage par plages

<!-- s:c372fac68d -->
Les lignes modifiées sont à nouveau parcourues pour former des plages de style identique, et chaque plage devient un span `%c`. Les plages se poursuivent au-delà des sauts de ligne. Les chaînes CSS sont stockées dans une table et référencées par des identifiants de style entiers, de sorte que le chemin critique ne construit jamais deux fois la même chaîne. Un tableau de bord de 100×32 représente 3200 cellules et 149 spans.

<!-- s:922d9e42bd -->
La chaîne de format protège aussi contre deux comportements de DevTools. Un `%` littéral est écrit `%%`. Un word joiner est inséré après `://`, à l’intérieur de `www.` et dans `path:line`, afin que DevTools ne transforme pas votre texte en lien et ne le redessine pas avec ses propres couleurs.

<!-- s:f55ed8e2b0 -->
Un seul appel

<!-- s:b57bb25475 -->
Chaque frame modifiée correspond à un seul appel :

<!-- s:e3e37e3616 -->
Les frames sont ajoutées à la suite, cadencées selon le mécanisme de limitation de DevTools à 50 ms et remplacées au cours d’un seul rafraîchissement. [Turbolog : éliminer le flash](/blog/turbolog-eliminating-the-flash) traite de cette partie.

<!-- s:99a3c4d459 -->
Saisie

<!-- s:e569f67f37 -->
La console ne peut pas recevoir les frappes clavier, c’est donc la page qui les reçoit. Un `<textarea>` masqué recueille les frappes, le collage et la composition IME, et les événements `wheel` font défiler les composants `ScrollBox`. Sur textjs.org, les pages Playground et OpenCode constituent une grande zone de saisie. Ouvrez la console, puis cliquez sur la page pour saisir du texte.

<!-- s:7db6aa160c -->
Ce que voit la page

<!-- s:03e00f4b44 -->
La page ne peut pas lire la taille de la console, seulement celle de sa propre fenêtre, alors Text.js la déduit : un panneau ancré réduit `innerWidth` ou `innerHeight` tandis que `outer*` reste inchangé, et chaque hypothèse d’ancrage est évaluée pour les niveaux de zoom de Chrome. La meilleure correspondance est retenue. Les constantes (56 px d’espacement horizontal, 104 px d’interface de la console, un pas de ligne de 14 px) ont été mesurées dans l’interface réelle de DevTools.
