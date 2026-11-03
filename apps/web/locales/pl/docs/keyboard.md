<!-- s:3bfcfe41ce -->
Zadeklaruj skróty klawiszowe raz za pomocą `useKeymap`. Text.js kieruje je do obsługi, wyświetla w nakładce `?` i w stopce oraz pozwala je wyszukiwać w palecie poleceń.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Składnia | Znaczenie |
| :-- | :-- |
| `ctrl+k` | Modyfikatory: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` lub `Ctrl`, zależnie od tego, który jest wciśnięty |
| `j, down` | Alternatywy |
| `g g` | Sekwencja (1 sekunda między klawiszami) |
| `G` | Wielka litera oznacza `Shift` |
| `?` | Klawisze drukowalne są dopasowywane do znaku |

<!-- s:ef55b4b9de -->
Wartością jest handler lub powiązanie z `label`, `group`, `hint`, `disabled` i `noRepeat`. Powiązania bez etykiet działają, ale nie pojawiają się w nakładce pomocy.

<!-- s:01f344cdbe -->
`useKeymapBindings()` zwraca aktualnie aktywne powiązania z etykietami do wykorzystania we własnych stopkach i menu.

<!-- s:dd8af5eb69 -->
Mapy klawiszy działają przez `useInput`, więc obowiązują zwykłe reguły: pola z fokusem mają pierwszeństwo, dopasowany klawisz zatrzymuje propagację, a otwarty `<Modal>` wyłącza powiązania poza nim. Przekaż `{ priority, global, isActive }`, aby to zmienić.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Naciśnij `?`, aby wyświetlić wszystkie powiązania z etykietami, podzielone na grupy. Lista pokazuje powiązania aktywne w miejscu otwarcia nakładki.

<!-- s:3cebb95bfc -->
`<KeyHints>` i `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` pokazuje powiązania oznaczone `hint: true` lub jawnie podane `items`. `<StatusBar>` to jednowierszowa stopka ze slotem `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` renderuje pojedynczy klawisz. `formatKeys("ctrl+shift+p")` daje `⌃⇧P` w systemie macOS, a `ctrl+shift+P` w pozostałych systemach.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (lub `Ctrl+P`) otwiera wyszukiwarkę poleceń i wszystkich powiązań z etykietami, z dopasowaniem przybliżonym i podświetleniem dopasowanych liter.

<!-- s:e88bab4eab -->
| Prop | Opis |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Skrót klawiszowy otwierający paletę (domyślnie `ctrl+k, ctrl+p`; `null` wyłącza) |
| `includeKeymap` | Wyświetlanie powiązań mapy klawiszy (domyślnie `true`) |
| `open` / `onOpenChange` | Sterowanie zewnętrzne |

<!-- s:ddd093fe85 -->
Paleta zamyka się przed uruchomieniem polecenia, więc polecenia mogą otwierać własne okna modalne. Funkcje `fuzzyMatch` i `fuzzyFilter` są eksportowane do wykorzystania we własnych listach.
