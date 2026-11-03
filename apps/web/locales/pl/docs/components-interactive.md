<!-- s:06b0e11de4 -->
Te pola obsługuje się klawiaturą i same zarządzają swoim fokusem.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:bc06482880 -->
`Tab` i `Shift+Tab` cyklicznie przenoszą fokus. `autoFocus` przejmuje fokus przy montowaniu.

<!-- s:fca23dd943 -->
Edytory z fokusem przechwytują naciśnięcia klawiszy, więc wpisanie `1` nigdy nie wywołuje globalnego skrótu klawiszowego.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Jednowierszowe pole z edycją w stylu readline.

<!-- s:88cdcfc0ea -->
| Prop | Opis |
| :-- | :-- |
| `value` / `onChange` | Wartość kontrolowana |
| `onSubmit` | Wywołanie po naciśnięciu `Enter` |
| `placeholder` | Tekst wyświetlany w pustym polu |
| `mask` | Znak maskujący poufne dane |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Wielowierszowe pole tekstowe. `Enter` zatwierdza, `Shift+Enter` dodaje nowy wiersz.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Lista opcji obsługiwana klawiaturą z opcjonalnym wyszukiwaniem przybliżonym.

<!-- s:70fe7d6c9b -->
| Prop | Opis |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Wywołanie po naciśnięciu `Enter` |
| `searchable` | Filtrowanie opcji podczas pisania |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Kursor bez fokusu

<!-- s:f0552feed5 -->
Gdy strona traci fokus, kursory zamierają, a klatki przestają się pojawiać, więc możesz zaznaczać i kopiować tekst konsoli.
