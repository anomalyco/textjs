<!-- s:3c9b7877c3 -->
W Text.js 0.3 dodano `@textjs/font`, parser i renderer fontów FIGlet. Pakiet zawiera 17 fontów z dystrybucji FIGlet 2.2.5, każdy jako osobny moduł ES, a jego wynik jest identyczny z wynikiem pliku binarnego `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Dlaczego FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` od wersji 0.1 ma dwa wbudowane kroje liter: `block` i `compact`. FIGlet jest standardem dla tego rodzaju napisów od 1991 roku, a fontów `.flf` istnieją setki. Obsługa tego formatu pozwala dodać dowolny z nich do aplikacji konsolowej.

<!-- s:7fdbff5714 -->
Font FIGlet to plik tekstowy. Wiersz nagłówka określa wysokość, znak hardblank i reguły layoutu, a następnie każdy znak jest rysowany jako blok wierszy ze znacznikiem końca na końcu każdego wiersza. W domyślnych layoutach FIGlet przesuwa każdy znak w lewo, aż zetknie się on z poprzednim, po czym na podstawie reguł łączenia fontu rozstrzyga, czy dwa stykające się znaki składowe połączą się w jeden.

<!-- s:4c761bba4d -->
Tryby layoutu

<!-- s:3f1c38cf92 -->
`figlet` ma pięć poziomych layoutów, a `renderFiglet` przyjmuje te same pięć przez `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Efekt |
| :-- | :-- | :-- |
| `"default"` | `-s` | Własny layout fontu, zwykle z łączeniem znaków |
| `"full"` | `-W` | Pełna szerokość; znaki nigdy się nie stykają |
| `"fitted"` | `-k` | Zbliżanie znaków aż do zetknięcia |
| `"smushed"` | `-S` | Łączenie znaków według reguł fontu |
| `"universal"` | `-o` | Nakładanie późniejszych znaków na wcześniejsze |

<!-- s:7a1307992e -->
Liczba od -1 do 63 to surowy tryb layoutu `-m`: `-1` oznacza pełną szerokość, `0` dopasowanie, a wartości od `1` do `63` wybierają reguły łączenia. Zaimplementowano wszystkie sześć poziomych reguł łączenia: jednakowy znak, podkreślenie, hierarchia, przeciwstawna para, duże X i hardblank. Parser obsługuje też pozostałe elementy formatu: wiersze komentarzy, znaki oznaczone kodami dziesiętnymi, ósemkowymi i szesnastkowymi, glif brakującego znaku oraz fonty pisane od prawej do lewej, takie jak `ivrit`.

<!-- s:0c920c94d3 -->
Zawijanie również działa tak jak w FIGlet. `width` łamie wiersze na granicach słów, a gdy słowo jest szersze niż wiersz, także wewnątrz słowa, w tych samych miejscach co `figlet -w`. `figlet -w 80` wypisuje najwyżej 79 kolumn, więc `-w N` odpowiada `width: N - 1`.

<!-- s:729dda48fc -->
Zgodność z plikiem binarnym

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` zawiera 273 wyniki wygenerowane przez uruchomienie rzeczywistego programu `figlet` 2.2.5 dla każdego dołączonego fontu w każdym trybie layoutu, z zawijaniem, wyrównywaniem, tekstem od prawej do lewej, trybem akapitowym oraz własnymi danymi regresyjnymi FIGlet z flagami z jego pliku `run-tests.sh`. Każdy przypadek przechowuje argumenty, dane wejściowe i dokładny wynik, a test przekształca wiersz poleceń z powrotem w opcje:

<!-- s:d31215cb4b -->
Wszystkie 273 wyniki są zgodne. Aby ponownie wygenerować dane testowe, umieść `figlet` 2.2.5 w `PATH` i uruchom `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Fonty na siatce komórek

<!-- s:ede6764977 -->
Każdy dołączony font rysuje za pomocą drukowalnych znaków ASCII lub Latin-1, więc każdy znak składowy zajmuje dokładnie jedną komórkę w kroju Menlo i pasuje do siatki. `<FigletText>` mierzy swoje wiersze w komórkach, więc napis mieści się w layoucie flexbox jak każdy inny `<Text>`, a `columns` i `align` zawijają go i wyrównują w jego obszarze.

<!-- s:3cedd51e92 -->
Każdy font jest osobnym modułem, więc aplikacja zawiera tylko te fonty, które importuje, a font jest parsowany przy pierwszym renderowaniu zamiast przy imporcie. `@textjs/font/all` eksportuje wszystkie fonty na potrzeby galerii.

<!-- s:9d54eeef4f -->
Dowolny inny font FIGfont można pobrać i sparsować w czasie działania:

<!-- s:f64649f401 -->
Licencje

<!-- s:67e882f6b4 -->
Dołączone fonty są identyczne bajt w bajt z tymi w `figlet-2.2.5.tar.gz` i są rozpowszechniane na licencji BSD 3-Clause projektu FIGlet. Każdy zachowuje informacje o autorach w wierszach komentarzy, dostępnych jako `font.comment`. Popularne fonty bez zgody na redystrybucję, takie jak Doom, Larry 3D, ANSI Shadow i Calvin S, nie są dołączone.

<!-- s:ee98166722 -->
Pełna dokumentacja znajduje się w sekcji [Fonty](/docs/fonts).
