<!-- s:dd02562b57 -->
`@textjs/font` parsuje pliki FIGfont 2 (`.flf`) i układa je dokładnie tak jak program `figlet`. Każdy font jest modułem ES, więc do aplikacji trafiają tylko importowane fonty.

<!-- s:a15d12503b -->
Instalacja

<!-- s:63bfd61a05 -->
Użycie

<!-- s:fdffc4b786 -->
`<FigletText>` przyjmuje font i ciąg znaków. Wiersze są mierzone w komórkach, więc liternictwo mieści się w layoutach flexbox jak każdy inny `<Text>`.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) przyjmuje te same fonty, zachowując wbudowane liternictwo `block` i `compact`:

<!-- s:9fc6ab3e8b -->
Poza React funkcja `renderFiglet` zwraca jeden ciąg znaków na wiersz:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
Layout poziomy odpowiada flagom programu FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Efekt |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout fontu, zwykle ze scalaniem znaków |
| `"full"` | `-W` | Pełna szerokość; znaki nigdy się nie stykają |
| `"fitted"` | `-k` | Kerning; znaki zbliżają się do siebie, aż się zetkną |
| `"smushed"` | `-S` | Scalanie według reguł fontu, nawet dla fontów dopasowanych |
| `"universal"` | `-o` | Późniejsze znaki nakładają się na wcześniejsze |
| `0`–`63` | `-m` | Jawny tryb scalania |

<!-- s:d9f3601792 -->
Zaimplementowano wszystkie sześć reguł scalania poziomego: jednakowy znak, podkreślenie, hierarchia, przeciwna para, duży X i twarda spacja.

<!-- s:889b1e19ef -->
`verticalLayout` dotyczy tekstu wielowierszowego. FIGlet 2.2.5 nigdy nie zbliża wierszy do siebie, więc wartością domyślną jest `"full"`; `"fitted"`, `"smushed"` i `"universal"` implementują pięć reguł pionowych, w tym superscalanie linii pionowych, a `"default"` używa reguł fontu.

<!-- s:d4ec30b173 -->
Zawijanie i wyrównanie

<!-- s:f799453d05 -->
`columns` (lub `width` w `renderFiglet`) zawija tekst na granicach słów, a następnie wewnątrz słowa, dokładnie tam, gdzie zrobiłby to `figlet -w`. `align` ma wartość `"left"`, `"center"` lub `"right"`; bez podanej szerokości wiersze są wyrównywane w obrębie najszerszego wiersza. Fonty pisane od prawej do lewej, takie jak `ivrit`, wypisują tekst od prawej do lewej i wyrównują go do prawej; zmień to za pomocą `direction`.

<!-- s:f8ccfce091 -->
Dołączone fonty

<!-- s:15e0b8eca7 -->
| Import | Wiersze | Uwagi |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Domyślny font programu FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Kursywa |
| `@textjs/font/small` | 5 | Zwarty |
| `@textjs/font/big` | 8 | Z alfabetem greckim |
| `@textjs/font/banner` | 8 | Liternictwo ze znaków `#`, katakana i cyrylica |
| `@textjs/font/block`, `lean` | 8 | Konturowy, prosty i pochyły |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Cień |
| `@textjs/font/script`, `smscript` | 7, 5 | Pismo odręczne |
| `@textjs/font/mini` | 4 | Miniaturowy |
| `@textjs/font/bubble`, `digital` | 4, 3 | Litery w okręgach i ramkach |
| `@textjs/font/ivrit` | 6 | Hebrajski, od prawej do lewej |
| `@textjs/font/term` | 1 | Tekst wejściowy bez zmian |

<!-- s:a8ecd7e9c1 -->
Każdy glif to drukowalny znak ASCII lub Latin-1, więc każdy znak składowy zajmuje dokładnie jedną komórkę w kroju Menlo w DevTools. `@textjs/font/all` eksportuje je wszystkie, a także `BUNDLED_FONTS` do galerii. Fonty są parsowane przy pierwszym renderowaniu, nie przy imporcie.

<!-- s:74ff0f95fa -->
Własne fonty

<!-- s:093892bc6a -->
Działa każdy font FIGfont. Pobierz go, a następnie sparsuj:

<!-- s:c2f4ef471e -->
Parser odczytuje nagłówek, wiersze komentarzy, twarde spacje, znaczniki końca, 102 wymagane znaki oraz znaki oznaczone kodami dziesiętnymi, ósemkowymi lub szesnastkowymi. Fonty TOIlet `.tlf` są renderowane jako zwykły tekst. Wybieraj fonty zbudowane ze znaków ASCII lub znaków do rysowania ramek; znaki brajlowskie i emoji nie mają szerokości jednej komórki w kroju Menlo.

<!-- s:f64649f401 -->
Licencjonowanie

<!-- s:adad99f0de -->
Dołączone fonty pochodzą z dystrybucji FIGlet 2.2.5, są identyczne bajt po bajcie i podlegają licencji BSD 3-Clause programu FIGlet. Każdy zachowuje informacje o autorach w wierszach komentarzy, dostępnych w czasie działania jako `font.comment`. Popularne fonty bez zezwolenia na redystrybucję, takie jak Doom, Larry 3D, ANSI Shadow i Calvin S, nie są dołączone.

<!-- s:2a50d4cddc -->
Weryfikacja względem `figlet`

<!-- s:111c132fa2 -->
Zestaw testów odtwarza 273 wyniki zapisane z rzeczywistego pliku binarnego `figlet` 2.2.5: każdy dołączony font w każdym trybie layoutu, zawijanie, justowanie, tekst od prawej do lewej, tryb akapitowy i dane wejściowe testów regresji samego programu FIGlet. Wszystkie są dokładnie zgodne.
