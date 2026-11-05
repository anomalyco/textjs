<!-- s:674f346b70 -->
Les hooks relient les composants aux entrées, au focus et à la zone d’affichage.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Champ | Description |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Texte produit par la touche |
| `ctrl` `meta` `shift` `alt` | Modificateurs |
| `stopPropagation()` | Arrêter les gestionnaires de priorité inférieure |

<!-- s:0764796164 -->
Les raccourcis du navigateur comme `⌘⌥J` et `⌘R` restent toujours actifs.

<!-- s:550c6a7dd5 -->
`usePaste` et `useWheel` acceptent les mêmes options. `ambient` n’a aucun effet sur `useWheel`.

<!-- s:9248f9b147 -->
| Option | Description |
| :-- | :-- |
| `isActive` | `false` désactive le gestionnaire sans le démonter (par défaut `true`) |
| `priority` | Les priorités les plus élevées s’exécutent en premier (par défaut `0`). Les composants ayant le focus utilisent `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Continuer à recevoir les entrées lorsqu’un `<Modal>` extérieur à ce composant est ouvert (par défaut `false`) |
| `ambient` | Ne pas prendre en compte ce gestionnaire pour l’[indication de focus](#usepagefocus) (par défaut `false`) |

<!-- s:e4e842287a -->
Le raccourci du Dev Overlay (`F2` ou `` Ctrl+` ``) est ambiant, donc une page sans autre entrée clavier n’affiche pas l’indication.

<!-- s:617ae1bfe8 -->
`usePaste` et `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (expérimental)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` exporte `useKeyState` pour suivre les touches physiques maintenues enfoncées via `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Interroger `keys.isDown(code)` ou lire `keys.pressed` ne déclenche pas de nouveaux rendus React. Passez une fonction de rappel pour réagir aux appuis et aux relâchements des touches au moment où ils se produisent.

<!-- s:d9e1465ae0 -->
Les touches maintenues enfoncées sont automatiquement relâchées lorsque la page perd le focus. Consultez [Changements incompatibles](/docs/support-policy#breaking-changes) pour connaître les règles de versionnement des exports expérimentaux.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` indique si la page a le focus. Les frappes clavier n’atteignent l’application que lorsque c’est le cas. Cette valeur est identique à `useViewport().focused`, mais le hook ne déclenche un nouveau rendu que lorsque le focus change.

<!-- s:e1075d4220 -->
Lorsque la page n’a pas le focus et que l’application possède un gestionnaire `useInput` ou `usePaste`, un hook `useKeyState` ou une cible de focus accessible avec Tab, la dernière ligne de la frame de console devient une barre ambrée indiquant « Cliquez sur la page pour utiliser le clavier ». Les gestionnaires marqués [`ambient`](#useinput) ne sont pas pris en compte. L’indication n’apparaît ni dans un terminal, ni dans les tests, ni dans les miroirs intégrés. Chaque fois que l’indication apparaît, elle clignote pendant environ 6 secondes, sauf si le paramètre système de réduction des animations est activé. Pour décider vous-même quand elle s’affiche, définissez `focusHint: false` dans `text.config.ts` ou `createConsoleRoot` et affichez `<FocusHint>` :

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
Le REPL `window.text`

<!-- s:420cc7f125 -->
Chaque application ajoute des fonctions utilitaires à `window.text`. Saisissez-les dans l’invite de DevTools.

<!-- s:195573d803 -->
Chargement à l’intention d’utiliser la console (expérimental)

<!-- s:97014ecad1 -->
`@textjs/core/experimental` exporte `onConsoleIntent` pour les pages qui téléchargent leur application console uniquement lorsqu’un visiteur souhaite l’utiliser. Il appelle votre fonction une seule fois, avec le motif :

<!-- s:444b1ebdd7 -->
| Motif | Quand |
| :-- | :-- |
| `dock` | DevTools est ancré au chargement de la page, ou s’ancre plus tard. Text.js le détecte à partir de la taille de la fenêtre |
| `shortcut` | Le visiteur appuie sur F12 ou Ctrl+Shift+J, I, C ou K, ou ⌘⌥J, I, C ou K sur un Mac. Le navigateur ouvre toujours DevTools |
| `engage` | Un clic principal sur un élément correspondant à `engageSelector`, Enter ou Space sur un bouton `[data-textjs-engage]`, ou une taille choisie dans `<ViewportControl>` avant le démarrage de l’application. Les clics sur les liens, boutons et champs de formulaire à l’intérieur d’un élément correspondant ne comptent pas, sauf s’ils portent aussi `data-textjs-engage` |
| `session` | L’un des événements ci-dessus s’est déjà produit dans cet onglet, donc un rechargement démarre immédiatement l’application |
| `manual` | Vous avez appelé `trigger()` sur le handle renvoyé |

<!-- s:894b97fac4 -->
DevTools ouvert dans sa propre fenêtre depuis un menu du navigateur ne se reflète pas dans la taille de la fenêtre. Ces visiteurs démarrent l’application depuis un élément `engage`, et `session` maintient son démarrage lors des rechargements dans cet onglet.

<!-- s:06cdcf713e -->
Rien ne se déclenche automatiquement sur les écrans tactiles. Appelez `trigger()` depuis votre propre commande.

<!-- s:d7006796c2 -->
| Option | Description |
| :-- | :-- |
| `engageSelector` | Éléments qui démarrent l’application au clic (par défaut `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` n’ajoute aucun écouteur |
| `persist` | Mémoriser l’intention pour l’onglet dans `sessionStorage` sous `CONSOLE_INTENT_KEY` (par défaut `true`) |
| `prefetch` | Appelé au plus une fois, lorsque le pointeur ou le focus entre dans un élément `engageSelector` |
| `idlePrefetch` | Appeler aussi `prefetch` lorsque le navigateur est inactif après `load` (par défaut `false`) |

<!-- s:4460da3205 -->
`prefetch` ne s’exécute jamais sur les écrans tactiles, lorsque l’économiseur de données est activé, ni sur les connexions plus lentes que la 4G. `canPrefetchConsole()` renvoie le résultat de la même vérification. La méthode `dispose()` du handle supprime tous les écouteurs.

<!-- s:9128a9d98f -->
`<ViewportControl>` fonctionne avant que la racine de la console existe. Choisir une taille l’enregistre, déclenche `engage` pour que `onConsoleIntent` démarre l’application, et applique la taille une fois `root` défini. Consultez [Changements incompatibles](/docs/support-policy#breaking-changes) pour connaître les règles de versionnement des exports expérimentaux.
