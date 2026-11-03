<!-- s:7929eb6998 -->
Text.js inclut des contrôles de formulaire, des boîtes de dialogue et des notifications toast. Chaque contrôle s’inscrit dans l’ordre de tabulation avec `Tab` et répond à `Space` ou `Enter`.

<!-- s:0c4878f82e -->
Contrôles

<!-- s:920d5e74e5 -->
| Composant | Touches | Valeur |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (ou `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Tous acceptent `autoFocus`, `focused`, `id` et `disabled`. Les modes contrôlé et non contrôlé (`defaultChecked`, `defaultValue`) fonctionnent tous les deux.

<!-- s:0a2857b66b -->
Boutons

<!-- s:1981291f42 -->
`variant` vaut `primary`, `secondary`, `ghost` ou `danger`. Le focus remplit le bouton avec la couleur d’accent sans modifier sa taille.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Un `<Modal>` avec une description et une rangée d’actions.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Oui ou non. `y` et `n` répondent directement ; `←` `→` déplacent le focus entre les boutons. `destructive` applique un style au bouton de confirmation et place d’abord le focus sur Annuler.

<!-- s:fecae30a60 -->
Notifications toast

<!-- s:76abda6137 -->
Affichez un seul `<Toaster />`, puis appelez `useToast()` n’importe où dans la même racine.

<!-- s:d5c6b1208e -->
| Option | Description |
| :-- | :-- |
| `duration` | Millisecondes (par défaut `4000` ; les notifications de chargement restent affichées) |
| `id` | Identifiant à réutiliser pour mettre à jour une notification sur place |
| `position` | Sur `<Toaster>` : `bottom-right` (par défaut), `top-center`, … |
| `max` | Sur `<Toaster>` : nombre de notifications visibles à la fois (par défaut `3`) |

<!-- s:476f42f2b3 -->
Les notifications toast s’affichent au-dessus des fenêtres modales et ne prennent jamais le focus.
