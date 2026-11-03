<!-- s:16c98cd381 -->
Text.js renderuje aplikacje React w konsoli DevTools przeglądarki Chrome. Poza ukrytym polem wejściowym strona nie ma interfejsu użytkownika. Każda klatka aplikacji to jedno wywołanie `console.log`.

<!-- s:fe9cd991d4 -->
Konsola jako wyświetlacz

<!-- s:5ae20a07fc -->
`console.log` przyjmuje ciąg formatujący. Każde `%c` stosuje CSS z następnego argumentu do tekstu, który po nim następuje, aż do kolejnego `%c`:

<!-- s:2822a0243c -->
Te style pozwalają ustawiać kolory, tła, pogrubienie, kursywę i podkreślenie, a czcionka konsoli ma stałą szerokość znaków (Menlo w systemie macOS). Dzięki czcionce o stałej szerokości i kolorom, które mogą się zmieniać dla każdego ciągu znaków, konsola działa jak siatka komórek znakowych ze stylami. Można na niej rysować obramowania, panele, pola wejściowe i wykresy.

<!-- s:585742694b -->
Klatka jako siatka komórek

<!-- s:04a12244bc -->
Renderer przechowuje każdą klatkę w `CellBuffer`. Znaki znajdują się w jednej tablicy typowanej, kolory tekstu i tła w dwóch kolejnych, a atrybuty takie jak pogrubienie i podkreślenie w czwartej. Tablice są alokowane raz dla danego rozmiaru i używane ponownie w każdej klatce.

<!-- s:2ff86351b3 -->
Aby zapisać klatkę w konsoli, sterownik przechodzi przez każdy wiersz i grupuje sąsiednie komórki o wspólnym stylu w ciągi. Każdy ciąg staje się jednym spanem `%c`, a wiersze są łączone za pomocą `\n`. Nasz testowy pulpit 100×32, czyli 3200 komórek, jest kodowany do około 200 spanów.

<!-- s:48a9b4f008 -->
Jedno wywołanie na klatkę

<!-- s:aa2cafe395 -->
Zapisywanie każdego wiersza jako osobnego komunikatu nie działa. Każdy komunikat dostaje własne obramowanie i link do źródła w DevTools, a DevTools zwija identyczne kolejne komunikaty pod licznikiem powtórzeń, więc dwa identyczne wiersze tabeli połączyłyby się w jeden. Klatka zapisana jako jeden komunikat pozostaje w całości.

<!-- s:ea38228d16 -->
Najpierw trzeba zabezpieczyć dwa elementy tekstu przed specjalną interpretacją. Dosłowny znak `%` zapisuje się jako `%%`, więc tekst taki jak `100%` nie może zużyć argumentu stylu. DevTools zamienia też adresy URL w linki i rysuje je ponownie we własnych kolorach, dlatego do `://` i `www.` dodawany jest word joiner (U+2060), który nie ma szerokości:

<!-- s:ec8783435a -->
Bezczynne klatki bez wpisów w konsoli

<!-- s:8b7f1f9d06 -->
Dla każdego wiersza bufora obliczany jest hash. Jeśli żaden hash nie zmienił się od ostatniej klatki, sterownik kończy działanie przed zbudowaniem ciągu znaków i nie dotyka konsoli. Aplikacja czekająca na dane wejściowe nie wykonuje żadnych wywołań.

<!-- s:43c3523265 -->
Gdy wiersz się zmieni, sterownik czyści konsolę i zapisuje nową klatkę:

<!-- s:5b584e930a -->
Ponownie kodowane są tylko wiersze, których hash się zmienił. Pozostałe używają spanów z poprzedniej klatki.

<!-- s:99a3c4d459 -->
Dane wejściowe

<!-- s:e95aae4719 -->
Konsola nie odbiera naciśnięć klawiszy, więc zbiera je strona. Ukryty element `<textarea>` odbiera naciśnięcia klawiszy, wklejanie i kompozycję IME, po czym zamienia je w zdarzenia klawiatury dla aplikacji. Kliknięcie strony ustawia na nim fokus.

<!-- s:88cae4fc43 -->
Dalsze kroki

<!-- s:cb5f6bd294 -->
Prototypy `@textjs/core` 0.0.x w npm zawierają wszystko w jednym pakiecie. Text.js 0.1 przenosi opisany tutaj renderer do `@textjs/core`, reconciler React do `@textjs/react` i dodaje App Router.
