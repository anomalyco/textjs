<!-- s:cf6b8fc694 -->
Dotychczas aplikacja Text.js obsługiwała klawisze w `useInput` i wymieniała je ponownie, ręcznie, w stopce `<KeyHint>`. `useKeymap` zastępuje oba te mechanizmy jedną deklaracją.

<!-- s:8ec88859eb -->
Naciśnięcie `j` uruchamia `next`. W systemie macOS `<KeyHints>` pokazuje w stopce `j/↓ Next` i `⌃S Save`, ponieważ te powiązania ustawiają `hint`. `?` otwiera ekran pomocy ze wszystkimi czterema powiązaniami w grupie Nawigacja, a `Ctrl+K` otwiera paletę, która umożliwia ich wyszukiwanie.

<!-- s:c7c1123a0d -->
Składnia klawiszy

<!-- s:e9843726ad -->
| Składnia | Znaczenie |
| :-- | :-- |
| `ctrl+k` | Modyfikatory: `ctrl`, `alt`, `shift`, `meta` i `mod` |
| `mod+k` | `⌘` lub `Ctrl`, zależnie od tego, który jest wciśnięty |
| `j, down` | Alternatywy |
| `g g` | Sekwencja z odstępem do 1 sekundy między klawiszami |
| `G` | Wielka litera oznacza `Shift` |
| `?` | Dopasowanie klawiszy drukowalnych według znaku |

<!-- s:5d4b81956d -->
Powiązanie to handler lub obiekt z polami `label`, `group`, `hint`, `command`, `disabled` i `noRepeat`. `command: false` wyklucza z palety powiązanie z etykietą. Powiązania bez etykiet działają, ale nie pojawiają się na ekranie pomocy ani w palecie.

<!-- s:7beff5bd29 -->
Kierowanie zdarzeń

<!-- s:5f000bf949 -->
Każda mapa klawiszy rejestruje jeden handler `useInput`, więc obowiązują dotychczasowe reguły obsługi wejścia. Komponent `<Input>` z fokusem obsługuje klawisze jako pierwszy, ponieważ edytory nasłuchują z priorytetem 10, a mapy klawiszy z priorytetem 0. Dopasowany klawisz zatrzymuje propagację. Otwarty `<Modal>` wyłącza powiązania poza nim, chyba że mapa klawiszy przekazuje `global: true`.

<!-- s:a6076c8127 -->
Sekwencje są dopasowywane wewnątrz tego handlera. Klawisz rozpoczynający sekwencję pozostaje w stanie oczekiwania i zatrzymuje propagację, a sekwencja jest resetowana, gdy następny klawisz pojawi się po czasie dłuższym niż `sequenceTimeout` (domyślnie 1000 ms):

<!-- s:aa0a9c8615 -->
Jeden rejestr na element główny

<!-- s:8a689d7ce6 -->
Powiązania z etykietami są publikowane w rejestrze należącym do elementu głównego konsoli. `<KeyHelp>`, `<KeyHints>` i `<CommandPalette>` odczytują z niego dane, podobnie jak twoje własne komponenty przez `useKeymapBindings()`. Gdy okno modalne jest otwarte, rejestr zwraca tylko powiązania z jego wnętrza, więc ekran pomocy pokazuje klawisze, które działają w tej chwili.

<!-- s:ab5f364d60 -->
Mapy klawiszy są zwykle definiowane bezpośrednio w kodzie komponentu, co tworzy nowy obiekt przy każdym renderowaniu. Aby ograniczyć koszt, mapa klawiszy publikuje ponownie swoje etykiety tylko wtedy, gdy zmienia się ich widoczna postać:

<!-- s:fa6b5ba7b8 -->
Handlery są odczytywane z referencji w chwili nadejścia klawisza, więc nowe domknięcie przy każdym renderowaniu nigdy nie jest nieaktualne.

<!-- s:1b173acf33 -->
Ekran pomocy i paleta

<!-- s:15201cd425 -->
`<KeyHelp>` otwiera się po naciśnięciu `?` i pokazuje wszystkie aktywne powiązania z etykietami, podzielone na grupy. `keys` i `title` zmieniają klawisz wywołujący i nagłówek.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` otwiera się po naciśnięciu `Ctrl+K` lub `Ctrl+P`. Stosuje dopasowanie przybliżone do twoich `commands` i każdego powiązania z etykietą oraz wyróżnia dopasowane litery. Zamyka się przed uruchomieniem polecenia, więc polecenie może otworzyć własne okno modalne.

<!-- s:bea7ebdffb -->
`formatKeys` renderuje powiązanie do wyświetlenia. `formatKeys("ctrl+shift+p")` zwraca `⌃⇧P` w systemie macOS i `ctrl+shift+P` na pozostałych systemach, a `<Kbd>` renderuje pojedynczy klawisz z tym samym formatowaniem.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` i `<CommandPalette>` są dostępne w Text.js 1.0. Dokumentację referencyjną znajdziesz w sekcji [Klawiatura](/docs/keyboard).
