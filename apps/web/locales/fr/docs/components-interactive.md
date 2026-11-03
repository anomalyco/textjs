<!-- s:06b0e11de4 -->
Ces champs se pilotent au clavier et gèrent leur propre focus.

<!-- s:1d0d345c65 -->
Focus

<!-- s:bc06482880 -->
`Tab` et `Shift+Tab` font passer le focus d’un élément à l’autre. `autoFocus` prend le focus au montage.

<!-- s:fca23dd943 -->
Les éditeurs qui ont le focus interceptent leurs touches, donc saisir `1` ne déclenche jamais de raccourci global.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Champ de saisie sur une ligne avec édition de type readline.

<!-- s:88cdcfc0ea -->
| Prop | Description |
| :-- | :-- |
| `value` / `onChange` | Valeur contrôlée |
| `onSubmit` | Appelé sur `Enter` |
| `placeholder` | Affiché quand le champ est vide |
| `mask` | Caractère de masquage pour les secrets |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Champ de rédaction multiligne. `Enter` envoie le contenu, `Shift+Enter` ajoute un saut de ligne.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Liste d’options au clavier avec recherche approximative facultative.

<!-- s:70fe7d6c9b -->
| Prop | Description |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Appelé sur `Enter` |
| `searchable` | Saisie filtrant les options |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Curseur sans focus

<!-- s:f0552feed5 -->
Quand la page perd le focus, les curseurs se figent et les frames s’arrêtent, vous pouvez donc sélectionner et copier le texte de la console.
