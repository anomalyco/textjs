<!-- s:23fef6717c -->
Acme Deploys potrzebuje rzeczywistych danych. Handlery tras znajdują się obok stron w `app/`, korzystają z internetowych API `Request` i `Response` i działają przy uruchomionych `text dev` oraz `text start`. Mają to samo pochodzenie co aplikacja, więc żądania nie wymagają konfiguracji CORS.

<!-- s:c6876ef862 -->
Handler trasy

<!-- s:b226d3ca25 -->
Wywołaj go z wiersza poleceń konsoli, gdy działa `text dev`:

<!-- s:9ce3eb974c -->
Pobieranie danych na stronie

<!-- s:c02131685f -->
Pobierz dane w efekcie i wyświetlaj `<Spinner>`, dopóki dane nie dotrą. `r` pobiera dane ponownie; `n` wysyła nowe wdrożenie, które pojawia się ze statusem budowania i przechodzi w stan gotowości po zakończeniu budowania.

<!-- s:34de603227 -->
Stany ładowania i błędów

<!-- s:8b95fe08be -->
Zamiast ręcznie obsługiwać `loading`, umieść obok strony plik `loading.tsx`, który jest wyświetlany, gdy strona wstrzymuje renderowanie, a `error.tsx` przechwytuje wszystko, co strona zgłasza. Oba są zwykłymi komponentami:

<!-- s:6c694827e4 -->
Strumieniowanie

<!-- s:c16e24a117 -->
Handlery mogą zwracać `ReadableStream`, dzięki czemu logi budowania trafiają strumieniowo do panelu, wiersz po wierszu. Informacje o zdarzeniach wysyłanych przez serwer i pośredniczeniu w komunikacji z lokalnym demonem znajdziesz w sekcji [Handlery tras](/docs/route-handlers).
