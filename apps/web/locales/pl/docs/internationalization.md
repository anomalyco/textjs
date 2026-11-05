<!-- s:43751f7845 -->
Text.js renderuje pismo hebrajskie, arabskie, perskie i inne pisma od prawej do lewej we właściwej kolejności, wyrównane do siatki komórek, w DevTools, terminalach i odwzorowaniach DOM. Implementuje algorytm dwukierunkowy Unicode (UAX #9, Unicode 18.0) i przechodzi oficjalne zestawy testów zgodności: wszystkie 770 241 przypadków `BidiTest.txt` (każde wejście w każdym kierunku akapitu) i wszystkie 91 707 przypadków `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Kierunek

<!-- s:0c7b144a82 -->
Każdy akapit (każdy wiersz komponentu `<Text>` oddzielony przez `\n`) wybiera własny kierunek bazowy na podstawie pierwszego silnego znaku, tak jak `dir="auto"` w HTML. Akapity od prawej do lewej są domyślnie wyrównane do prawej.

<!-- s:c17beb4498 -->
| `align` | Akapit od lewej do prawej | Akapit od prawej do lewej |
| :-- | :-- | :-- |
| `"start"` (domyślnie) | do lewej | do prawej |
| `"end"` | do prawej | do lewej |
| `"left"` / `"center"` / `"right"` | zgodnie z wartością | zgodnie z wartością |

<!-- s:6db8fa68bb -->
W zagnieżdżonym komponencie `<Text>` właściwość `dir` izoluje span tak jak `<bdi>` w HTML: jego zawartość ma niezależny layout i nie może zmienić kolejności otaczającego tekstu. Używaj jej do nazw, tytułów i innych tekstów o nieznanym kierunku podawanych przez użytkowników.

<!-- s:68088feb2d -->
Przebieg renderowania

<!-- s:d401630cda -->
1. **Zawijanie w kolejności logicznej.** Wiersze są łamane dokładnie tak jak w tekście od lewej do prawej, według szerokości komórek.
2. **Zmiana kolejności w każdym wierszu.** Algorytm ustala poziomy osadzenia dla całego akapitu (jawne osadzenia i izolaty, typy słabe i neutralne, pary nawiasów), a następnie osobno zmienia kolejność w każdym zawiniętym wierszu (reguły L1–L2). Nawiasy i inne znaki lustrzane są odwracane na poziomach od prawej do lewej (L4), więc `(abc)` pozostaje `(abc)` w tekście hebrajskim.
3. **Kształtowanie pisma arabskiego.** Litery przyjmują formy kontekstowe (izolowaną, początkową, środkową, końcową) z bloków Arabic Presentation Forms, wyliczane w kolejności logicznej w każdym ciągu znaków o tym samym poziomie w wierszu (ZWJ i ZWNJ są uwzględniane tam, gdzie występują). Jedna litera zajmuje jedną komórkę, formy połączone są zachowywane na każdej granicy spanu (kursor, zmiana koloru), a konsola nigdy nie musi ich kształtować.
4. **Utrwalanie kolejności.** Komórki zawierają teraz glify w kolejności wyświetlania. Przeglądarki i wiele terminali zastosowałyby do nich bidi drugi raz, więc sterowniki blokują kolejność:

<!-- s:153724c967 -->
| Wyjście | Sposób utrwalania kolejności |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Spany zawierające znaki od prawej do lewej są otaczane przez `LRO … PDF` (U+202D / U+202C). Filtr sanitarny `%c` w DevTools usuwa `direction` i `unicode-bidi`. |
| Terminale (`AnsiDriver`, `text run`) | Wiersze z tekstem od prawej do lewej są otaczane przez `LRO … PDF` dla terminali stosujących bidi osobno do każdego wiersza. `renderToTerminal` przełącza się raz przy wejściu w tryb jawny ECMA-48 BDSM (`CSI 8 l`, respektowany przez terminale oparte na VTE), a przy wyjściu wraca do trybu niejawnego (`CSI 8 h`); jednorazowe klatki `renderToAnsi` zawierające tekst od prawej do lewej zaczynają się od `CSI 8 l`. Przekaż `bidi: "none"`, aby emitować komórki bez zmian. |
| Odwzorowania DOM (`<ConsoleMirror>`) | Odwzorowanie ma `direction: ltr` (więc strona nadrzędna RTL nie może go odwrócić), a spany zawierające tekst od prawej do lewej otrzymują `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` i `<Divider title>` przechodzą te same kroki (`drawLogicalText(buffer, x, y, text, …)` rysuje w ten sposób dowolny pojedynczy wiersz), więc ich etykiety wyświetlają się we właściwej kolejności i z połączonymi literami.

<!-- s:3b67946601 -->
Tekst bez znaków od prawej do lewej pomija wszystkie te operacje. Model tekstu wyłącznie od lewej do prawej jest wykrywany podczas segmentacji grafemów (jedno porównanie na grafem) i rysowany niezmienioną ścieżką; klatki konsoli są identyczne bajt po bajcie.

<!-- s:6181d9259c -->
Ładowanie silnika bidi

<!-- s:8bd0807fa0 -->
W aplikacjach Text.js (`text dev`, `text build`) silnik bidi i jego tabele Unicode stanowią osobny fragment o rozmiarze 10,1 kB (gzip). Jest pobierany, gdy strona po raz pierwszy renderuje tekst od prawej do lewej lub komponent `<Text>` z `dir="rtl"`, więc inne strony nigdy go nie ładują. Do czasu jego pobrania tekst jest rysowany w kolejności logicznej. Następnie konsola rysuje go ponownie w kolejności wyświetlania.

<!-- s:ed4299ea80 -->
Aplikacje budowane poleceniem `text build` z powłoką po prerenderowaniu same rozpoczynają pobieranie, gdy powłoka zawiera tekst od prawej do lewej. Jeśli samodzielnie montujesz konsolę, rozpocznij pobieranie równolegle z `createConsoleRoot()`, aby pierwsza klatka była w kolejności wyświetlania. Na przykład na stronach z tekstem od prawej do lewej:

<!-- s:8ebc8c3712 -->
`loadBidi()` odrzuca obietnicę, jeśli nie uda się załadować fragmentu. Tekst od prawej do lewej pozostaje wtedy w kolejności logicznej.

<!-- s:7adcf6764d -->
Renderowanie po stronie serwera, `text run`, testy i pakiety bez warunku rozwiązywania `@textjs/client` zawierają silnik, więc zawsze rysują tekst od prawej do lewej w kolejności wyświetlania, a `loadBidi()` od razu spełnia obietnicę.

<!-- s:26ac17c25a -->
Szerokości komórek

<!-- s:552e751976 -->
Dostarczany zestaw czcionek to `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Żadna z tych czcionek nie zawiera glifów hebrajskich ani arabskich, więc przeglądarki dobierają czcionkę zastępczą dla każdego znaku. W systemie macOS jest to Courier New o stałej szerokości 0,6 em: 7,2012 px na glif przy rozmiarze 12 px wobec 7,2246 px dla Menlo. Jest o 0,3% węższa, co wystarcza, by cały wiersz hebrajski przesunął się o około pół komórki.

<!-- s:851f84e769 -->
`CssConsoleDriver` mierzy każdy span od prawej do lewej za pomocą canvas z czcionką konsoli (to samo kształtowanie Blink i dobieranie czcionek zastępczych co w DevTools), a następnie dodaje dopełnienie równe dokładnej różnicy w jednostkach LayoutUnit (1/64 px). Span ma ostatecznie taką szerokość jak komórki siatki, które obejmuje (szeroki grafem, taki jak emoji, liczy się jako dwie). Span jest zwężany najwyżej o pół komórki, więc proporcjonalna czcionka zastępcza (Times New Roman obok Cascadia Mono w systemie Windows) wychodzi poza granice zamiast pozwalać następnemu spanowi nakładać się na jej glify. Pomiary w rzeczywistym interfejsie DevTools (Chromium 151) na klatce 64×21 z wierszami hebrajskimi, arabskimi, mieszanymi i emoji w tekście hebrajskim oraz tytułami ramek RTL (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Klatka | Rozbieżność prawej krawędzi między wierszami |
| :-- | --: |
| Komórki wypisane bez utrwalania kolejności | 14,5 px (DevTools zmienia kolejność i ponownie kształtuje znaki) |
| Utrwalona kolejność, bez dopasowania szerokości | 2,22 px |
| Dostarczany sterownik | 0,156 px |
| Próba kontrolna: te same komórki, każdy glif RTL zastąpiony przez `x` | 1,67 px |

<!-- s:a7ec844aae -->
Klatka z dostarczanego sterownika odpowiada w każdym wierszu próbie kontrolnej zawierającej wyłącznie znaki łacińskie, poza wierszem z emoji, gdzie wypada lepiej: emoji są dopasowywane wraz z otaczającym je spanem od prawej do lewej (0,03 px), podczas gdy wiersz z emoji od lewej do prawej w próbie kontrolnej nie jest dopasowywany (1,66 px).

<!-- s:318b8b5f4c -->
DevTools rysuje każdy span `%c` z `contain: paint` i osobno przyciąga go do pikseli urządzenia, więc tam, gdzie dwa tła stykają się na ułamkowej pozycji, piksel między nimi może nie należeć do żadnego z nich, pozostawiając szczelinę o szerokości 1 px. W przeglądarkach Chrome i Edge span z tłem rozciąga je o 1 px pod nieprzezroczystego sąsiada po prawej, a dopasowany span dodaje ten piksel do swojego dopełnienia. Żadna z czterech powyższych klatek nie ma szczeliny.

<!-- s:7deafc8e74 -->
Przekaż `measureText: false`, aby wyłączyć dopasowanie, lub podaj własną funkcję pomiarową `(text, bold, italic) => px`.

<!-- s:f088ff48f9 -->
Wprowadzanie i edycja

<!-- s:6aca925fed -->
`<Input>` i `<Textarea>` utrzymują kursor logiczny. Klawisze strzałek przemieszczają go przez tekst w kolejności zapisu, więc w tekście od prawej do lewej ← przesuwa go wizualnie w prawo. Kursor blokowy znajduje się na znaku logicznym, który obejmuje, niezależnie od tego, gdzie trafi on po zmianie kolejności. W ciągu od prawej do lewej jest to komórka na lewo od poprzedniego znaku. Zaznaczenie również jest zakresem logicznym, więc jego podświetlenie może obejmować nieprzylegające komórki w wierszach o mieszanych kierunkach. Przewijanie poziome jednowierszowego komponentu `<Input>` podąża za kolumną logiczną, więc długa wartość od prawej do lewej może przewinąć kursor poza widoczny obszar. Kursor na spacji lub na końcu tekstu jest rysowany jako izolowana spacja nierozdzielająca, więc pozostaje neutralny i nigdy nie łączy się z liczbami po żadnej ze stron.

<!-- s:68c8d3995f -->
Ograniczenia

<!-- s:fbb8008232 -->
- **Separatory akapitów.** Wiersze są dzielone na `\n`. U+2029 i inne separatory akapitów kończą akapit bidi, ale nie rozpoczynają nowego wiersza.
- **Tabulatory.** Tabulatory są rozwijane na spacje przed uruchomieniem bidi, więc działają jako białe znaki (WS), a nie separatory segmentów (S).
- **Kształtowanie.** Kształtowane są tylko litery mające formy prezentacyjne: arabskie, perskie, urdu i pozostałe litery w U+FB50–U+FDFF i U+FE70–U+FEFF. Lam-alef pozostaje dwiema połączonymi literami w dwóch komórkach, a nie ligaturą z jednym glifem. Pismo syryjskie, N'Ko i inne pisma łączące litery zachowują formy nominalne.
- **Kopiowanie.** Tekst skopiowany z konsoli ma kolejność wyświetlania (ze znacznikami `LRO`/`PDF`), a nie kolejność logiczną.
- **Terminale.** Terminale, które ignorują zarówno BDSM, jak i `LRO`, i stosują własne bidi (na przykład z włączonym bidi w iTerm2), mogą ponownie zmienić kolejność wierszy od prawej do lewej.
- **Odwzorowania DOM.** `<ConsoleMirror>` nie dopasowuje szerokości, więc ciągi od prawej do lewej mogą się tam rozjechać nawet o 0,3% swojej szerokości.

<!-- s:f4d4dadbf6 -->
Tłumaczenie panelu fokusu

<!-- s:7791d4db4e -->
`<FocusPad>` z `@textjs/react/dom` (renderowany też przez `<TextCanvas>`) instruuje odwiedzających, aby otworzyli konsolę, kliknęli stronę i nacisnęli klawisz. Domyślnie jego tekst jest po angielsku. Aby go przetłumaczyć, przekaż `messages` z tekstami, które chcesz zastąpić. Pominięte klucze zachowują angielskie teksty wymienione w `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
Tekst zawierający wartość jest funkcją zwracającą całe zdanie, więc tłumaczenie może umieścić tę wartość w dowolnym miejscu. `step`, `pressShortcut`, `then`, `defaultAction` i `shortcutOpens` są funkcjami. `step` otrzymuje numer kroku i liczbę kroków. `then` otrzymuje właściwość `action` lub tekst z `defaultAction`, gdy nie ma `action`. `defaultAction` otrzymuje klawisze pierwszej podpowiedzi lub `null`, gdy nie ma podpowiedzi. `pressShortcut` otrzymuje klawisze skrótu klawiszowego dla czytników ekranu, a `shortcutOpens` otrzymuje skrót klawiszowy jako elementy `<kbd>`.

<!-- s:e9475554da -->
`messages` obejmuje też etykiety odczytywane przez czytniki ekranu i kontrolkę rozmiaru konsoli (`sizeControl`). `<TextCanvas>` przyjmuje tę samą właściwość `messages`. `<ViewportControl>` również ją przyjmuje i używa kluczy kontrolki rozmiaru. Oznaczenia klawiszy, takie jak ⌘⌥J, Ctrl+Shift+J i Enter, nie są tłumaczone.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` i `reorderIndices` udostępniają sam algorytm: reguły P1–I2, L1 i L2.
