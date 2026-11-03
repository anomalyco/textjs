<!-- s:7929eb6998 -->
Text.js include controlli per moduli, finestre di dialogo e notifiche toast. Ogni controllo entra nell’ordine di navigazione con `Tab` e risponde a `Space` o `Enter`.

<!-- s:0c4878f82e -->
Controlli

<!-- s:920d5e74e5 -->
| Componente | Tasti | Valore |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (o `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Tutti accettano `autoFocus`, `focused`, `id` e `disabled`. Funzionano sia in modalità controllata sia in modalità non controllata (`defaultChecked`, `defaultValue`).

<!-- s:0a2857b66b -->
Pulsanti

<!-- s:1981291f42 -->
`variant` può essere `primary`, `secondary`, `ghost` o `danger`. Il focus riempie il pulsante con il colore di accento senza modificarne le dimensioni.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Un `<Modal>` con una descrizione e una riga di azioni.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Sì o no. `y` e `n` rispondono direttamente; `←` `→` spostano il focus tra i pulsanti. `destructive` applica uno stile al pulsante di conferma e imposta il focus iniziale su Annulla.

<!-- s:fecae30a60 -->
Notifiche toast

<!-- s:76abda6137 -->
Renderizza un solo `<Toaster />`, poi chiama `useToast()` in qualsiasi punto della stessa radice.

<!-- s:d5c6b1208e -->
| Opzione | Descrizione |
| :-- | :-- |
| `duration` | Millisecondi (valore predefinito `4000`; le notifiche toast di caricamento restano visibili) |
| `id` | Da riutilizzare per aggiornare una notifica toast sul posto |
| `position` | Su `<Toaster>`: `bottom-right` (valore predefinito), `top-center`, … |
| `max` | Su `<Toaster>`: notifiche visibili contemporaneamente (valore predefinito `3`) |

<!-- s:476f42f2b3 -->
Le notifiche toast sono renderizzate sopra le finestre modali e non prendono mai il focus.
