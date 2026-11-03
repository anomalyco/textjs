<!-- s:da329a4f1b -->
Handlery tras definiują endpointy API w katalogu `app`, korzystając z interfejsów Web API `Request` i `Response`.

<!-- s:895d99d1b5 -->
Konwencja

<!-- s:ac1d1b9fcb -->
Eksportuj `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` lub `OPTIONS`. Handlery działają przy uruchomieniu `text dev`, `text start` i na każdym serwerowym [adapterze wdrożenia](/docs/deploying), po [middleware](/docs/middleware). Buforuj handlery `GET` za pomocą [konfiguracji segmentu trasy](/docs/caching).

<!-- s:53eeba0ff3 -->
Handlery dynamiczne

<!-- s:bfa759b36e -->
Wartości `params` są dekodowane. Ścieżka z zakodowanym ukośnikiem lub ukośnikiem odwrotnym (`%2F`, `%5C`) otrzymuje kod `400`, więc przekazuj identyfikatory, które mogą zawierać `/`, w parametrze zapytania lub koduj je jako base64url.

<!-- s:6c694827e4 -->
Przesyłanie strumieniowe

<!-- s:734a652dda -->
Zwróć `ReadableStream` dla zdarzeń wysyłanych przez serwer:

<!-- s:9ff4b304cc -->
Reguły Rewrite

<!-- s:7ca1bb6854 -->
Serwer pośredniczy w połączeniach do zewnętrznych adresów docelowych, więc przeglądarka nie wysyła żądań do innego źródła.

<!-- s:82320e9df7 -->
Pośredniczenie w połączeniach z lokalnym demonem

<!-- s:7730eaa5fb -->
Użyj `proxy`, aby połączyć się z procesem na swoim komputerze:

<!-- s:c00af013ff -->
W ten sposób [szablon OpenCode](/docs/opencode) łączy się z lokalnym serwerem.
