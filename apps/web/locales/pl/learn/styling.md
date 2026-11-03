<!-- s:d7ae3c23f0 -->
Każda komórka ma znak, kolor tekstu, tło i zestaw atrybutów. Text.js kompiluje je do spanów CSS `%c`, dzięki czemu konsola wyświetla rzeczywiste kolory, pogrubienie i kursywę.

<!-- s:45433c474e -->
Atrybuty tekstu

<!-- s:32c37753d8 -->
`<Text>` przyjmuje `bold`, `dim`, `italic`, `underline` i `strikethrough`. Zagnieżdżone elementy `<Text>` stają się stylizowanymi spanami w obrębie jednego wiersza.

<!-- s:661b7c60b6 -->
Tokeny motywu

<!-- s:f312d78237 -->
Prop `color` przyjmuje wartości szesnastkowe, zwykłe nazwy kolorów (`emerald`) i tokeny motywu; odcienie z palety Tailwind stosuje się przez klasy (`text-emerald-400`). Tokeny dostosowują się do aktywnego motywu, więc wybieraj je do wszystkiego, co ma znaczenie semantyczne. Dodaj komponent statusu:

<!-- s:4d4d36a0bd -->
Karta wdrożenia

<!-- s:108bb076c9 -->
`bg-surface` wyróżnia kartę na tle. Identyfikator wdrożenia przyjmuje kolor statusu, podczas budowania jest zapisany kursywą, a przy błędzie zostaje przekreślony.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` kończy długie opisy commitów znakiem `…`, zamiast zawijać je do drugiego wiersza.

<!-- s:087abce968 -->
Motywy

<!-- s:8f993e0ab8 -->
Text.js zawiera pięć motywów: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT i Geist Light. Naciśnij `t` w konsoli, aby przełączać je po kolei. Cała klatka jest ponownie rysowana w nowej palecie, ponieważ każdy kolor powyżej jest tokenem.
