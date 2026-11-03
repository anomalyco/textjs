<!-- s:3ddc060411 -->
`text run` uruchamia tę samą aplikację w terminalu. Layout, komponenty, mapy klawiszy i handlery tras są wspólne, a wynik to ANSI z pełną paletą kolorów zamiast spanów CSS `%c`.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
Dodaj skrypt i uruchom go:

<!-- s:ad1db08664 -->
`text run` importuje każdy plik z `app/`, montuje App Router z historią w pamięci i rysuje go na pełnym ekranie. `<Link>`, `useRouter()`, `notFound()` i `redirect()` działają bez zmian, a wywołania `fetch("/api/…")` do tego samego źródła uruchamiają twoje handlery tras w tym samym procesie. `Ctrl+C` kończy działanie i przywraca historię przewijania. Wymaga środowiska Bun.

<!-- s:86d6034750 -->
Kończenie działania klawiszem `q`

<!-- s:f06966bd5c -->
Użytkownicy terminala oczekują klawisza `q`. `useApp().exit()` odmontowuje aplikację i przywraca terminal; w przeglądarce odmontowuje aplikację konsolową.

<!-- s:62111506f4 -->
Własne CLI

<!-- s:e5f8a30037 -->
Dla pojedynczego komponentu użyj `renderToTerminal`. Montuje jeden element bez App Router, a `fetch("/api/…")` dociera do twoich handlerów tras tylko przy uruchomieniu przez `text run`, więc przekaż komponentowi jego dane:

<!-- s:718df08aaf -->
Uruchom go poleceniem `bun cli.tsx`. `DeploymentsPage` pobiera swoje wiersze, więc wymaga `text run`.

<!-- s:76d0fa5082 -->
Różnice

<!-- s:505bd1bfa2 -->
Terminale odmalowują ekran szybciej (do 60 klatek/s zamiast ~15) i dopasowują siatkę do okna zamiast do zadokowanej konsoli. Obrazy wymagają danych pikseli zamiast adresu URL. Cała reszta, w tym ten panel, korzysta z tego samego kodu.
