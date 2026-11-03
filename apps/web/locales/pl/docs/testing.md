<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (lub `@textjs/react/testing`) renderuje twoją aplikację poza ekranem, naciska klawisze i zwraca klatkę jako tekst. Testy działają bez przeglądarki ani DevTools.

<!-- s:9bc71b1ad2 -->
Działa z każdym narzędziem do uruchamiania testów, które obsługuje testy `async`, w tym Bun, Vitest i Jest.

<!-- s:f7898e6b92 -->
Renderowanie

<!-- s:fc969a7928 -->
| Metoda | Opis |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Montowanie poza ekranem (domyślnie 80×24) |
| `lastFrame()` | Klatka jako zwykły tekst |
| `lines()` | Klatka jako tablica wierszy |
| `frames` | Wszystkie dotychczasowe różne klatki |
| `toAnsi()` | ANSI Truecolor do migawek |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` pierwszego dopasowania |
| `rerender(el)` / `unmount()` | Aktualizacja lub odmontowanie |

<!-- s:893f22353a -->
`renderToString(el, options)` renderuje raz i zwraca tekst.

<!-- s:99a3c4d459 -->
Dane wejściowe

<!-- s:105149560b -->
Każde wywołanie działa wewnątrz `act()` i przetwarza wynikowe klatki, więc następna asercja widzi aktualizację.

<!-- s:1f65c071dc -->
Czas

<!-- s:ab365d9403 -->
Animacje, wskaźniki ładowania i powiadomienia używają rzeczywistych timerów, więc `wait` i `waitFor` pozwalają je wiarygodnie obserwować.

<!-- s:26f93acae3 -->
Migawki

<!-- s:05724c9883 -->
Klatki są przycinane po prawej stronie i na dole, więc białe znaki nie powodują zmian w migawkach.
