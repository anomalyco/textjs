<!-- s:fe58dc6ae4 -->
Każda klatka Text.js to jedno wywołanie `console.log`. Do wersji 0.4 każdą klatkę poprzedzało też `console.clear()`. Pod obciążeniem konsola między klatkami na moment stawała się pusta.

<!-- s:7a82fe5fe2 -->
Pomiar migotania

<!-- s:1d16f5a106 -->
Aby to zmierzyć, stworzyliśmy `bench/devtools`. Uruchamia Chrome for Testing, otwiera rzeczywisty frontend DevTools jako stronę i dodaje do niego instrumentację:

<!-- s:4da6ef7009 -->
- Przy każdym `requestAnimationFrame` we frontendzie DevTools sprawdza, czy w obszarze widocznym konsoli znajduje się pełna klatka o 32 wierszach. Odmalowania bez niej to puste odmalowania.
- Następnie dekoduje klatki `Page.startScreencast`, aby potwierdzić wynik na poziomie pikseli.
- Każda klatka zawiera `FRAME:<id> · T:<epochMs>` w wierszu 0, dzięki czemu frontend rozpoznaje wyświetlaną klatkę i jej opóźnienie.

<!-- s:cb3c553c37 -->
Przy `console.clear()` przed każdą klatką dashboard 100×32 przy 15 fps był pusty w **70,6%** odmalowań DevTools. Przy 60 fps było to **81,1%**.

<!-- s:7076ddd27d -->
Przyczyna

<!-- s:1e65554dc0 -->
Komponent `ConsoleView` w DevTools obsługuje te dwa wywołania inaczej:

<!-- s:56484b5ac3 -->
1. `console.clear()` wywołuje `consoleCleared()`, które **synchronicznie** unieważnia obszar widoczny. Wszystkie komunikaty znikają w tym samym zadaniu.
2. `console.log()` wywołuje `addConsoleMessage()`, które jedynie planuje odświeżenie przez `viewportThrottler`, instancję `Throttler` z limitem czasu **50 ms**.

<!-- s:8a656fe37a -->
Każda klatka usuwa więc starą klatkę od razu, a nową odmalowuje później. Przy 15 fps przez około 50 z każdych 66 ms nic nie widać.

<!-- s:8bb24ac9a4 -->
Dopisywanie klatek

<!-- s:1092cc0920 -->
Od wersji 0.4 Turbolog dopisuje klatki. DevTools utrzymuje widok przy dole konsoli, więc nowa klatka zastępuje starą w jednym odmalowaniu. Początkowy span o zerowej szerokości z `margin-top:100vh` (kurtyna) wypycha wcześniejsze klatki poza widok i kończy własny wiersz, dzięki czemu link do źródła w DevTools nigdy nie zwęża wiersza 0.

<!-- s:6e8cb684de -->
Konsolę nadal trzeba w końcu opróżnić. Czyszczenie następuje tylko przy pierwszej klatce, po `invalidate()`, w bezczynności po zgromadzeniu 100 klatek oraz po osiągnięciu sztywnego limitu 300.

<!-- s:58637d56ab -->
Dostosowanie tempa do mechanizmu ograniczającego

<!-- s:14c65af87d -->
Wysyłanie klatek szybciej, niż DevTools może je odmalować, niczego nie przyspiesza. Wpis, który dociera, gdy mechanizm ograniczający czeka, uruchamia go ponownie, więc klatki są pomijane: przy 60 fps DevTools odmalowało 67 z 295 wysłanych klatek. Turbolog zachowuje odstępy co najmniej **66 ms** między klatkami, czyli około 15 fps, i nadal renderuje pojedyncze zdarzenia wejściowe synchronicznie, gdy odstęp na to pozwala.

<!-- s:8a90fd55c3 -->
Usuwanie blokady fazowej

<!-- s:e96505e7a5 -->
Czyszczenie dodawało też około 50 ms opóźnienia do każdej kolejnej klatki. Po wyczyszczeniu DevTools wstawia syntetyczny wiersz `Console was cleared`. Zajmuje on miejsce na natychmiastowe wykonanie w mechanizmie ograniczającym i przesuwa następną klatkę na timer 50 ms, a przy stałym rytmie 66 ms każda kolejna klatka pozostaje zsynchronizowana z tym timerem.

<!-- s:57527b9818 -->
Renderer czeka teraz jednorazowo **110 ms** po każdym wyczyszczeniu. Następnie każda klatka dociera ponad 50 ms po zakończeniu poprzedniego odświeżenia i korzysta z natychmiastowej ścieżki DevTools. Mediana opóźnienia wyświetlania spadła z **63 ms do 10,4 ms**.

<!-- s:003645d0bf -->
Wyniki

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, dashboard 100×32, rzeczywisty frontend DevTools:

<!-- s:9ee75054af -->
| Tryb | FPS | Puste odmalowania | Odmalowane / wysłane | Opóźnienie p50 |
| :-- | --: | --: | --: | --: |
| Czyszczenie co klatkę | 15 | 70,6% | 70 / 75 | 60,4 ms |
| **Dopisywanie (1.0)** | **15** | **1,0%** | **74 / 75** | **10,4 ms** |
| Czyszczenie co klatkę | 60 | 81,1% | 45 / 300 | 9,8 ms |
| Dopisywanie bez regulacji tempa | 60 | 0,8% | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
Pozostały 1% przypada na pierwszą klatkę, która celowo czyści konsolę. Jej puste odmalowania to wiersz `Console was cleared`, a nie pusta konsola.

<!-- s:315471c65a -->
Mniej właściwości na span

<!-- s:e210e7e85d -->
Kod źródłowy DevTools ujawnił jeszcze jeden koszt. Kopiuje każdą *właściwość składową* stylu `%c` do każdego elementu opakowującego wiersz, więc skrócone zapisy `font:` i `margin:` rozwijały się do około 33 właściwości na span. Spany używają teraz wyłącznie właściwości składowych, około 7 na każdy, z kolorami w zapisie szesnastkowym.

<!-- s:5b341c4930 -->
Tryb dopisywania pojawił się w Text.js 0.4, a poprawka blokady fazowej trafia do wersji 1.0. Żadna z tych zmian nie wymaga zmian w kodzie aplikacji.
