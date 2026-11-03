<!-- s:e4dabd0578 -->
Layout każdej klatki Text.js oblicza Yoga, silnik flexbox używany przez React Native, skompilowany do WebAssembly. Prostokąty i tekst współdzielą jedno drzewo Yoga. Konsola jest siatką komórek znakowych, więc każda wynikowa pozycja i każdy rozmiar muszą być całkowitą liczbą komórek.

<!-- s:9c86e1b16d -->
Jeden punkt to jedna komórka

<!-- s:9026ebff4f -->
Yoga zaokrągla wyniki do siatki pikseli określonej przez współczynnik skali punktów. Przy wartości 2, jak na ekranie Retina, krawędzie mogą wypadać w połowie punktu. Text.js ładuje Yoga raz i ustawia współczynnik na 1:

<!-- s:f5193c7abd -->
Przy współczynniku 1 Yoga zaokrągla każdą krawędź do pełnej jednostki, a Text.js traktuje jedną jednostkę jako jedną komórkę. Yoga zaokrągla bezwzględną pozycję każdej krawędzi i wylicza rozmiary z zaokrąglonych krawędzi, więc sąsiadujące prostokąty mają wspólną krawędź. Podziel wiersz o 81 kolumnach na dwa prostokąty z `width="50%"`, a jeden otrzyma 40 kolumn, drugi 41, bez odstępu i nakładania się.

<!-- s:4f9619621a -->
Text.js sam stosuje domyślne wartości CSS: `flexDirection` ma wartość `row`, a `flexShrink` ma wartość `1`, jak w przeglądarce.

<!-- s:5240062c19 -->
Pomiar tekstu

<!-- s:25f0052f43 -->
Węzły tekstowe są liśćmi drzewa Yoga z funkcją pomiaru. Yoga wywołuje ją z dostępną szerokością, a Text.js zwraca rozmiar tekstu w komórkach:

<!-- s:a543588dc9 -->
Tekst, który się mieści, jest zwracany w swoim naturalnym rozmiarze. Tekst, który się nie mieści, jest zawijany do dostępnej szerokości, a jego wysokość jest liczbą wierszy. Węzeł zachowuje ostatni wynik zawijania, więc ponowny pomiar tej samej szerokości nie powoduje ponownego zawijania tekstu.

<!-- s:3c253fdc4c -->
Pomiar klastrów grafemowych

<!-- s:7d52c4b9c9 -->
Właściwość `length` ciągu znaków zlicza jednostki kodowe UTF-16, co niewiele mówi o tym, ile komórek zajmuje tekst. Najpierw tekst jest dzielony na klastry grafemowe za pomocą `Intl.Segmenter`, więc `e` z następującym po nim akcentem łączącym stanowi jeden klaster, podobnie jak sekwencja emoji połączona łącznikami o zerowej szerokości. Następnie każdemu klastrowi przypisywana jest szerokość:

<!-- s:f36acd4206 -->
| Tekst | Komórki | Dlaczego |
| :-- | --: | :-- |
| `abc` | 3 | Jedna komórka na znak |
| `你好` | 4 | Szerokie znaki wschodnioazjatyckie zajmują dwie |
| `🚀` | 2 | Prezentacja emoji zajmuje dwie |
| `é` (`e` + U+0301) | 1 | Znaki łączące nie zajmują żadnej |
| `─│┌▼←⠋` | 6 | Znaki ramek, kształty geometryczne, strzałki i brajl mają stałą szerokość jednej komórki |

<!-- s:75d5c21868 -->
Obramowania, znak `▼`, strzałki i klatki wskaźnika ładowania są zawsze mierzone jako jedna komórka, więc obramowanie prostokąta nigdy nie przesuwa jego zawartości poza linię.

<!-- s:cee20acd8c -->
Drukowalne znaki ASCII pomijają segmentację, a pozostałe szerokości są buforowane dla każdego punktu kodowego i klastra.

<!-- s:5f37d5a215 -->
Zawijanie

<!-- s:b59adefd34 -->
`<Text>` przyjmuje tryb `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (domyślny) łamie tekst na spacjach, a także wewnątrz słowa, gdy jest ono szersze od wiersza.
- `nowrap` zachowuje jeden wiersz i pozwala prostokątowi go przyciąć.
- `truncate-end`, `truncate-middle` i `truncate-start` zachowują jeden wiersz i zastępują to, co się nie mieści, znakiem `…`.

<!-- s:73ec8f197a -->
Skracanie również zlicza komórki, więc wiersz tekstu chińskiego jest ucinany na granicy znaku, a wielokropek zajmuje dokładnie jedną komórkę.

<!-- s:1d11d6a370 -->
W praktyce

<!-- s:50e47bf264 -->
Tutaj panel boczny o szerokości 30 kolumn znajduje się obok panelu, który zajmuje pozostałą szerokość:

<!-- s:f9394d30d6 -->
W konsoli o szerokości 100 kolumn panel boczny zajmuje 30 kolumn wraz z obramowaniem, a panel rozmowy zajmuje pozostałe 70. Obramowanie ma szerokość jednej komórki z każdej strony, więc tytuł sesji jest skracany do 28 komórek.
