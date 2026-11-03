<!-- s:bd59ce7974 -->
Text.js renderuje teraz pismo hebrajskie, arabskie, perskie i inne pisma od prawej do lewej we właściwej kolejności, z połączonymi literami arabskimi, na tej samej siatce komórek co resztę treści.

<!-- s:4673b00c8b -->
Każdy akapit wybiera kierunek bazowy na podstawie pierwszego znaku o silnej kierunkowości, tak jak `dir="auto"` w HTML, a akapity pisane od prawej do lewej są wyrównane do prawej. W zagnieżdżonym komponencie `<Text>` atrybut `dir` izoluje span tak jak `<bdi>`, więc nazwa użytkownika o nieznanym kierunku pisma nie może zmienić kolejności otaczającego ją tekstu.

<!-- s:9026fc3194 -->
Algorytm

<!-- s:f13f3bb4af -->
Obsługa pisma od prawej do lewej to implementacja algorytmu dwukierunkowego Unicode (UAX #9, Unicode 18.0), napisana od podstaw w `@textjs/core`. Wyznacza poziomy osadzenia dla każdego akapitu, uwzględniając jawne osadzenia i izolaty, typy słabe i neutralne oraz pary nawiasów. Następnie kolejność znaków jest zmieniana osobno w każdym zawiniętym wierszu, a znaki lustrzane są zamieniane na poziomach od prawej do lewej, więc `(abc)` pozostaje `(abc)` wewnątrz tekstu hebrajskiego.

<!-- s:82ed91ab82 -->
Unicode publikuje dwa pliki testów zgodności dla tego algorytmu. Oba są zapisane w repozytorium, skompresowane gzipem, a zestaw testów uruchamia każdy przypadek:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` zawiera dane wejściowe jako sekwencje klas bidi, każdą z kierunkami akapitu, do których się odnosi. Text.js przechodzi wszystkie 770 241 przypadków.
- `BidiCharacterTest.txt` zawiera rzeczywiste ciągi znaków z oczekiwanymi poziomami i kolejnością. Text.js przechodzi wszystkie 91 707.

<!-- s:3939cd5f43 -->
Od kolejności logicznej do komórek

<!-- s:e682972504 -->
Wiersz tekstu pisanego od prawej do lewej przechodzi cztery etapy, zanim trafi do konsoli:

<!-- s:a497c14c9c -->
1. **Zawijanie w kolejności logicznej.** Wiersze są łamane tam, gdzie byłyby łamane w tekście pisanym od lewej do prawej, według szerokości komórek.
2. **Zmiana kolejności w każdym wierszu.** Wyznaczone poziomy określają kolejność wyświetlania grafemów wiersza.
3. **Kształtowanie pisma arabskiego.** Litery przyjmują formy kontekstowe (izolowaną, początkową, środkową, końcową) z bloków Arabic Presentation Forms. Jedna litera zajmuje jedną komórkę, a formy łączone zachowują się mimo kursora lub zmiany koloru w środku słowa.
4. **Utrwalanie kolejności.** Komórki zawierają teraz glify w kolejności wyświetlania.

<!-- s:5d1156720d -->
Ostatni etap jest potrzebny, ponieważ DevTools uruchomiłoby algorytm bidi na tekście po raz drugi i ponownie odwróciło jego kolejność. Styl `%c` nie może tego wyłączyć, ponieważ mechanizm oczyszczania w DevTools usuwa `direction` i `unicode-bidi`. Dlatego sterownik otacza każdy span zawierający znaki pisane od prawej do lewej znakami `LRO` i `PDF` (U+202D i U+202C), co wymusza wyświetlanie od lewej do prawej dokładnie tego, co zawierają komórki.

<!-- s:aba313fc71 -->
Przesunięcie o pół komórki

<!-- s:1109446b98 -->
Ani SF Mono, ani Menlo nie zawiera glifów hebrajskich czy arabskich, więc przeglądarka dobiera czcionkę zastępczą dla każdego znaku. W systemie macOS jest to Courier New, również o stałej szerokości, z glifem o szerokości 7,2012 px przy rozmiarze 12 px, wobec 7,2246 px w Menlo. Jest o 0,3% węższa, co wystarcza, by cały wiersz tekstu hebrajskiego przesunął się o około pół komórki.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` mierzy każdy span pisany od prawej do lewej za pomocą elementu canvas z czcionką konsoli, który korzysta z tego samego mechanizmu dobierania czcionek zastępczych silnika Blink co DevTools, i uzupełnia szerokość spanu o dokładną różnicę w LayoutUnits (1/64 px). Każdy span ma ostatecznie taką szerokość jak zajmowane przez niego komórki siatki. Span jest zwężany najwyżej o pół komórki, więc znacznie szersza czcionka zastępcza wychodzi poza obszar, zamiast nakładać się na następny span.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` mierzy wynik w rzeczywistym interfejsie DevTools, na klatce 64×21 z wierszami hebrajskimi, arabskimi, mieszanymi oraz z emoji w tekście hebrajskim:

<!-- s:e6a33dfaa2 -->
| Klatka | Przesunięcie prawej krawędzi między wierszami |
| :-- | --: |
| Komórki wypisane bez utrwalania kolejności | 14,5 px |
| Utrwalona kolejność, bez dopasowania szerokości | 2,22 px |
| Sterownik w wydanej wersji | 0,156 px |
| Próba kontrolna: każdy glif RTL zastąpiony przez `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
Próba kontrolna to ta sama klatka z tekstem łacińskim. Sterownik w wydanej wersji wyrównuje tekst lepiej niż próba kontrolna, ponieważ emoji wewnątrz spanów pisanych od prawej do lewej są dopasowywane razem z nimi.

<!-- s:d37099863b -->
Tekst pisany od lewej do prawej bez zmian

<!-- s:41ce31b66a -->
Tekst bez znaków pisanych od prawej do lewej pomija wszystkie te etapy. Sprawdzenie odbywa się podczas segmentacji grafemów, jedno porównanie na grafem, a tekst pisany wyłącznie od lewej do prawej jest renderowany tą samą ścieżką co wcześniej, więc jego klatki w konsoli są identyczne bajt po bajcie.

<!-- s:a8fff567e6 -->
Obsługa tekstu pisanego od prawej do lewej jest dostępna w Text.js 1.0. [Internacjonalizacja](/docs/internationalization) opisuje wprowadzanie tekstu, edycję, terminale i API.
