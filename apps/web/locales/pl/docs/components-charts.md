<!-- s:8f99ab8d5a -->
Wykresy są rysowane znakami blokowymi. Słupki używają ośmiu poziomów na komórkę, a linie siatki 2×2 punktów na komórkę.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Wykresy liniowe z punktów, z osią Y i legendą.

<!-- s:977778a73f -->
| Prop | Opis |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Skrót dla jednej serii |
| `height` | Wiersze (domyślnie `8`) |
| `min` / `max` | Stałe granice (domyślnie: zakres danych) |
| `axis` | Oś Y z etykietami minimum i maksimum |
| `formatValue` | Etykiety osi (domyślnie `1.2k`) |
| `marker` | `quadrant` (domyślnie) lub `braille` |

<!-- s:3827b070cb -->
`braille` mieści 2×4 punkty w komórce. Używaj go w terminalach: Menlo, font konsoli DevTools w systemie macOS, nie zawiera znaków brajlowskich, a glify zastępcze są szersze niż komórka.

<!-- s:a1d8752203 -->
Domyślne kolory serii to `accent`, `success`, `warning`, `info` i `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Poziome słupki z wyrównanymi etykietami i wartościami, z dokładnością do jednej ósmej komórki.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Wypełnia swoją szerokość najnowszymi punktami. `height` powyżej `1` renderuje wypełniony obszar.

<!-- s:9b515e6ed1 -->
`sparkline(values)` zwraca ten sam sparkline jako ciąg znaków.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Opis |
| :-- | :-- |
| `value` / `max` | Postęp (pomiń dla nieokreślonego postępu) |
| `variant` | `block` (płynny) `line` `thin` |
| `width` | Komórki (domyślnie: wypełnienie) |
| `label` | Tekst na początku |
| `formatValue` | Tekst na końcu (domyślnie `42%`) |

<!-- s:39c076d22f -->
Paski nieokreślonego postępu przesuwają się w tempie klatek renderera i zatrzymują się po wstrzymaniu wyjścia.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolacja koloru dla każdej komórki. Wielowierszowe ciągi znaków współdzielą jeden gradient, więc można go łączyć z `<AsciiFont>`.

<!-- s:99155d62a4 -->
Nazwane gradienty: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Konsole przeglądarek Chromium i Firefox rysują obraz jako sprite pikselowy. Pixel art (256 kolorów lub mniej, bez częściowo przezroczystych pikseli) zachowuje do 8 × 16 pikseli na komórkę, a zdjęcia do 4 × 8. W przeglądarce Safari, terminalach, kopiach tekstowych i na stronach z [`runtime = "server"`](/docs/server-rendering) używane są półbloki `▀`: każda komórka mieści dwa piksele, górny w kolorze pierwszego planu, a dolny w kolorze tła. Przekaż `renderMode="halfblock"`, aby wszędzie rysować półbloki, tak jak robił to komponent `<Image>` w wersji 1.3.

<!-- s:70bb4fc454 -->
| Prop | Opis |
| :-- | :-- |
| `src` | URL obrazu (tylko w przeglądarce) |
| `pixels` | Surowe RGBA jako `{ width, height, data }`, 4 bajty na piksel w kolejności wierszy |
| `width` / `height` | Szerokość w komórkach, wysokość w wierszach. Przekaż jeden parametr, aby zachować proporcje, lub pomiń oba, aby uzyskać 1 × 2 piksele na komórkę (`src` skaluje do maksymalnie 256 × 256 px) |
| `fit` | `contain` (domyślnie), `cover` lub `fill` |
| `alt` | Tekst wyświetlany podczas ładowania `src` lub po jego niepowodzeniu |
| `renderMode` | `auto` (domyślnie: sprite tam, gdzie jest obsługiwany, półbloki `▀` w pozostałych miejscach) lub `halfblock` |

<!-- s:c106665c64 -->
`<Image>` przyjmuje też właściwości layoutu.

<!-- s:20dac26bff -->
`src` ładuje obraz przez canvas, więc obrazy z innych źródeł wymagają CORS. `pixels` przyjmuje surowe RGBA wszędzie, także w terminalu.

<!-- s:4e3b06ef0e -->
Obraz jest też rysowany jako półbloki w przeglądarkach Chromium i Firefox, gdy nie może być pojedynczym sprite’em:

<!-- s:00d2e660eb -->
- Dwa obrazy obok siebie w tych samych wierszach, jak w galerii.
- Zdjęcie z tekstem obok. Pixel art obok tekstu pozostaje sprite’em.
- Obraz przycięty przez pole z `overflow="hidden"` lub częściowo zasłonięty innym polem.
- Przezroczyste piksele nad tekstem lub nad więcej niż jednym kolorem tła.

<!-- s:dd4fefaac0 -->
`<Pixels>` (eksperymentalny)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` eksportuje `<Pixels>` dla aktualizowanych na żywo buforów klatek `0xRRGGBBAA`, używanych w grach, emulatorach i wideo. Zapisuj spakowane piksele bezpośrednio w `source.data` i zwiększaj `frame`, aby odrysować obraz.

<!-- s:2d12b69e81 -->
| Prop | Opis |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` w kolejności `0xRRGGBBAA` |
| `frame` | Licznik klatek; zwiększ po zmianie `source.data` |
| `width` / `height` | Rozmiar pola w komórkach i wierszach |
| `fit` | `contain` (domyślnie) lub `fill` |
| `pixelAspect` | Wyświetlana szerokość podzielona przez wysokość jednego piksela źródłowego (domyślnie `1`) |
| `palette` | Opcjonalna paleta `PackedColor[]` do kwantyzacji kolorów |
| `sample` | Filtr dla zastępczego renderowania półblokami: `nearest` (domyślnie) lub `average` |
| `renderMode` | `auto` (domyślnie: sprite tam, gdzie jest obsługiwany, półbloki `▀` w pozostałych miejscach) lub `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` rysuje pikselowy sprite w przeglądarce Chromium oraz w przeglądarce Firefox zgodnie z regułami stylów jej konsoli (bez pomiarów wydajności), a w przeglądarce Safari, terminalach, kopiach tekstowych i na stronach z [`runtime = "server"`](/docs/server-rendering) używa zastępczo półbloków `▀`. Przekaż `renderMode="halfblock"`, aby wszędzie rysować półbloki.

<!-- s:5d2bbbc47b -->
Aby rysować piksele bez React, zaimportuj `drawPixels` z `@textjs/core/experimental` wraz z `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` i `PixelRect`. Opcja `encoding: "rgba"` zachowuje ponad 256 kolorów i płynną przezroczystość nieruchomych obrazów, a `fallback` rysuje twoje własne komórki wszędzie tam, gdzie nie można wyświetlić sprite’a. Zobacz [Zmiany niezgodne wstecznie](/docs/support-policy#breaking-changes), aby dowiedzieć się, jak wersjonowane są eksperymentalne eksporty.
