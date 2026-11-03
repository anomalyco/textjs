<!-- s:510651334f -->
Stany ładowania i granice błędów renderują się w konsoli. Zdefiniuj je dla każdego segmentu trasy w plikach `loading.tsx` i `error.tsx`.

<!-- s:28d65d04f2 -->
Interfejs ładowania

<!-- s:d64d19effc -->
Dodaj plik `loading.tsx`, aby wyświetlać interfejs zastępczy, gdy renderowanie strony jest zawieszone.

<!-- s:4445f6cf6c -->
Błędy

<!-- s:3834711277 -->
Dodaj plik `error.tsx`, aby przechwytywać błędy renderowania. Otrzymuje on błąd i funkcję `reset`.

<!-- s:5b439d0e88 -->
Nie znaleziono

<!-- s:c01c20f824 -->
Wywołaj `notFound()`, aby wyrenderować najbliższy plik `not-found.tsx`.

<!-- s:dc40d65e00 -->
Redbox w konsoli

<!-- s:2ec3bf8f2e -->
W trybie deweloperskim nieprzechwycone błędy otwierają nakładkę w konsoli z komunikatem i lokalizacją w kodzie źródłowym. Poprawienie pliku zamyka nakładkę.

<!-- s:35c9c3ef6b -->
Nakładka deweloperska

<!-- s:e2a34a83d6 -->
W trybie deweloperskim przycisk `[▼]` w lewym dolnym rogu konsoli to nakładka deweloperska. Naciśnij `F2` lub `` Ctrl+` ``, aby ją otworzyć i sprawdzić trasę, czasy klatek i layout. Wyłącz ją za pomocą `devIndicators: false`.
