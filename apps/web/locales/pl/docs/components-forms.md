<!-- s:7929eb6998 -->
Text.js zawiera kontrolki formularzy, okna dialogowe i powiadomienia. Każda kontrolka jest uwzględniana w kolejności nawigacji klawiszem `Tab` i reaguje na `Space` lub `Enter`.

<!-- s:0c4878f82e -->
Kontrolki

<!-- s:920d5e74e5 -->
| Komponent | Klawisze | Wartość |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓` (lub `←` `→`) | `value` / `onChange` |
| `<Slider>` | `←` `→`, `Shift` ×5, `Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
Wszystkie przyjmują `autoFocus`, `focused`, `id` i `disabled`. Działają zarówno w trybie kontrolowanym, jak i niekontrolowanym (`defaultChecked`, `defaultValue`).

<!-- s:0a2857b66b -->
Przyciski

<!-- s:1981291f42 -->
`variant` ma wartość `primary`, `secondary`, `ghost` lub `danger`. Fokus wypełnia przycisk kolorem akcentu bez zmiany jego rozmiaru.

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
Komponent `<Modal>` z opisem i wierszem akcji.

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
Tak lub nie. `y` i `n` odpowiadają bezpośrednio; `←` `→` przenoszą fokus między przyciskami. `destructive` nadaje styl przyciskowi potwierdzenia i ustawia początkowy fokus na przycisku „Anuluj”.

<!-- s:fecae30a60 -->
Powiadomienia

<!-- s:76abda6137 -->
Wyrenderuj jeden komponent `<Toaster />`, a następnie wywołaj `useToast()` w dowolnym miejscu w obrębie tego samego korzenia.

<!-- s:d5c6b1208e -->
| Opcja | Opis |
| :-- | :-- |
| `duration` | Milisekundy (domyślnie `4000`; powiadomienia o ładowaniu pozostają) |
| `id` | Ponowne użycie do aktualizacji powiadomienia w miejscu |
| `position` | W komponencie `<Toaster>`: `bottom-right` (domyślnie), `top-center`, … |
| `max` | W komponencie `<Toaster>`: liczba widocznych jednocześnie (domyślnie `3`) |

<!-- s:476f42f2b3 -->
Powiadomienia renderują się nad oknami modalnymi i nigdy nie przejmują fokusu.
