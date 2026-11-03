<!-- s:329a4263b5 -->
`@textjs/app/testing` renderuje twoją aplikację poza ekranem, naciska klawisze i zwraca klatkę jako zwykły tekst. Testy działają bez przeglądarki ani DevTools.

<!-- s:22ea22bed4 -->
Pierwszy test

<!-- s:79e830f1ed -->
Strona pobiera `/api/deployments`, dla którego podczas `bun test` nie działa serwer, więc `beforeEach` zastępuje `fetch` atrapą zwracającą te same dane. `render` domyślnie używa siatki 80×24. `lastFrame()` zwraca całą klatkę jako tekst, `lines()` zwraca ją wiersz po wierszu, a `cell(x, y)` udostępnia znak i kolory pojedynczej komórki.

<!-- s:e8fdbe8cac -->
Naciskanie klawiszy

<!-- s:8db83c740c -->
`press` przyjmuje te same ciągi znaków określające klawisze co `useKeymap`. Każde wywołanie działa wewnątrz `act()` i renderuje wszystkie wynikowe klatki, więc następna asercja widzi aktualizację.

<!-- s:7c6ee6548f -->
Tabela rysuje `›` przed podświetlonym wierszem, więc test ↓ znajduje ten wiersz i sprawdza jego commit. Cyfry sortują według kolumny, a czwarta kolumna to Build.

<!-- s:5350d592a4 -->
Uruchamianie

<!-- s:88993d5c83 -->
Działa z każdym narzędziem do uruchamiania testów, które obsługuje testy `async`: Bun, Vitest lub Jest. W konsoli naciśnij `Enter`, aby uruchomić zestaw testów, i `f`, aby zepsuć test i zobaczyć, jak wygląda niepowodzenie.

<!-- s:26f93acae3 -->
Migawki

<!-- s:b458212c22 -->
`toAnsi()` zwraca klatkę w formacie ANSI z kolorami truecolor, co pozwala tworzyć migawki wykrywające także regresje kolorów:
