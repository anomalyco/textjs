<!-- s:7929eb6998 -->
Text.js enthält Formularsteuerelemente, Dialoge und Toasts. Jedes Steuerelement ist Teil der `Tab`-Reihenfolge und reagiert auf `Space` oder `Enter`.

<!-- s:0c4878f82e -->
Steuerelemente

<!-- s:920d5e74e5 -->
| Komponente | Tasten | Wert |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (oder `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Alle akzeptieren `autoFocus`, `focused`, `id` und `disabled`. Sowohl kontrollierte als auch unkontrollierte Varianten (`defaultChecked`, `defaultValue`) funktionieren.

<!-- s:0a2857b66b -->
Buttons

<!-- s:1981291f42 -->
`variant` ist `primary`, `secondary`, `ghost` oder `danger`. Bei Fokus füllt die Akzentfarbe den Button, ohne seine Größe zu ändern.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Ein `<Modal>` mit einer Beschreibung und einer Aktionszeile.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Ja oder nein. `y` und `n` antworten direkt; `←` `→` wechseln zwischen den Buttons. `destructive` gestaltet den Bestätigungsbutton und fokussiert zuerst „Abbrechen“.

<!-- s:fecae30a60 -->
Toasts

<!-- s:76abda6137 -->
Rendere einen `<Toaster />` und rufe dann `useToast()` an beliebiger Stelle im selben Root auf.

<!-- s:d5c6b1208e -->
| Option | Beschreibung |
| :-- | :-- |
| `duration` | Millisekunden (Standard `4000`; Lade-Toasts bleiben sichtbar) |
| `id` | Wiederverwenden, um einen Toast an Ort und Stelle zu aktualisieren |
| `position` | Auf `<Toaster>`: `bottom-right` (Standard), `top-center`, … |
| `max` | Auf `<Toaster>`: gleichzeitig sichtbar (Standard `3`) |

<!-- s:476f42f2b3 -->
Toasts erscheinen über Modals und übernehmen nie den Fokus.
