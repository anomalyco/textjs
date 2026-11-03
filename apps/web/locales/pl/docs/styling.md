<!-- s:581711536b -->
Stylizuj komponenty za pomocą klas narzędziowych `className` lub typowanych propsów. Aplikacje Text.js nie mają arkuszy stylów.

<!-- s:e0ac1db626 -->
Klasy narzędziowe

<!-- s:2de571e2bf -->
`className` przyjmuje klasy narzędziowe w stylu Tailwind. Jedna jednostka to jedna komórka.

<!-- s:785b2c3db0 -->
| Kategoria | Przykłady |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Odstępy | `p-1` `px-2` `mt-1` |
| Obramowania | `border` `rounded` `border-accent` |
| Kolor | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Typowane propsy

<!-- s:4963259a42 -->
Każda klasa narzędziowa ma odpowiadający jej prop. Propsy mają pierwszeństwo przed `className`.

<!-- s:15a3834a24 -->
Kolory

<!-- s:d333dad27a -->
Używaj kolorów szesnastkowych, nazw Tailwind lub tokenów motywu, takich jak `fg`, `muted`, `surface`, `accent`, `success` i `danger`. Tokeny odpowiadają aktywnemu motywowi.

<!-- s:087abce968 -->
Motywy

<!-- s:abba2a3188 -->
Dostępnych jest pięć wbudowanych motywów: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` i `amberCrt`.

<!-- s:5dc490305b -->
Responsywne obszary widoku

<!-- s:419fb844db -->
Aplikacje domyślnie wypełniają zadokowaną konsolę DevTools (`viewport.responsive`) i zmieniają rozmiar podczas przeciągania panelu. Twórz layout za pomocą flex i odczytuj rozmiar, gdy go potrzebujesz:

<!-- s:3d847eadf9 -->
Strona widzi tylko zadokowany panel. Odłączony panel DevTools, powiększenie DevTools i panel boczny „Konsola” są dla niej niewidoczne, więc aplikacja używa `viewport.width × viewport.height` (domyślnie `120×36`) lub rozmiaru, który ustawisz na stałe:
