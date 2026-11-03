<!-- s:263d7e4a86 -->
Rozszerzenie Text.js DevTools dodaje panel **Text.js** obok panelu „Konsola”. Pozwala badać aplikację renderowaną w konsoli.

<!-- s:becd3b25ff -->
- **Komponenty:** drzewo React każdego korzenia konsoli, z propsami, hookami, kluczami i odpowiadającymi im węzłami sceny `tx-box` / `tx-text`, rozmieszczonymi w komórkach.
- **Klatka:** bieżąca klatka jako siatka komórek. Najedź na komórkę, aby zobaczyć, który komponent ją namalował. Kliknij, aby wybrać węzeł. Zostanie podświetlony w działającej konsoli.
- **Oś czasu:** czasy pracy React, layoutu, malowania i kodowania dla każdej klatki, klatki pominięte i wyemitowane, odstępy między klatkami i spany `%c`.
- **Sterowanie:** wstrzymywanie i wznawianie wyjścia, przełączanie widoku szkieletowego layoutu, ustalanie lub dopasowywanie rozmiaru siatki, kopiowanie klatki jako tekstu.

<!-- s:98304b8243 -->
Instalacja

<!-- s:2452819f12 -->
Rozszerzenie jest budowane z `packages/devtools-extension` i wczytywane jako rozpakowane:

<!-- s:3754c750b3 -->
1. Otwórz `chrome://extensions` i włącz **Tryb dewelopera**.
2. Kliknij **Załaduj rozpakowane** i wybierz `packages/devtools-extension/dist`.
3. Załaduj ponownie aplikację i otwórz DevTools. Panel **Text.js** pojawi się, gdy strona utworzy korzeń konsoli.

<!-- s:e0c59fa53a -->
Proces budowania zapisuje też plik `release/textjs-devtools-<version>.zip`, gotowy do publikacji w Chrome Web Store.

<!-- s:364bc3ef6f -->
Komponenty

<!-- s:e1204a3559 -->
Wybierz komponent, aby zobaczyć jego propsy, hooki w kolejności wywołań (`State`, `Ref`, `Memo`, `Effect` i tak dalej, z bieżącymi wartościami) oraz renderowany przez niego węzeł sceny, z pozycją, rozmiarem i wewnętrznymi odstępami pola w komórkach. Najechanie na wiersz podświetla węzeł w konsoli. Opcja **Węzły hosta** pokazuje lub ukrywa elementy `tx-box` i `tx-text` między komponentami.

<!-- s:77b62adc9c -->
Drzewo odświeża się po commitach, gdy panel jest otwarty. Wartości to podsumowania do wyświetlenia, a nie obiekty aktualizowane na żywo.

<!-- s:a0d819048c -->
Klatka

<!-- s:2cceea6000 -->
Inspektor klatki rysuje bufor komórek renderera: każdy glif, kolor pierwszego planu, tło i atrybut. Najechanie na komórkę pokazuje jej znak i kolory, węzeł sceny znajdujący się nad nią w kolejności malowania (z uwzględnieniem `overflow`, przesunięć przewijania i `zIndex`) oraz komponenty, które wyrenderowały ten węzeł. Kliknięcie wybiera węzeł w panelu **Komponenty** i podświetla go w działającej konsoli za pomocą własnej nakładki podświetlenia renderera.

<!-- s:57a8990372 -->
Oś czasu

<!-- s:2187cf7a17 -->
Każdy słupek to jedna klatka renderera:

<!-- s:f53def4922 -->
| Faza | Pomiar |
| --- | --- |
| React | Synchroniczna praca React wykonana na początku klatki |
| Layout | Layout Yoga |
| Malowanie | Rasteryzacja sceny do bufora komórek |
| Kodowanie | Budowanie ciągu formatującego `%c` i wywołanie `console.log()` |

<!-- s:9b988f3cfb -->
Pominięte klatki są przygaszone: nic się nie zmieniło, więc nic nie zapisano w konsoli. Wykres odstępów pokazuje przerwę między wyemitowanymi klatkami względem minimalnego odstępu 66 ms.

<!-- s:8abccb04ec -->
Pomiar czasu kończy się na `console.log()`. Formatowanie i malowanie komunikatu odbywają się wewnątrz DevTools i nie można ich obserwować ze strony, więc oś czasu ich nie pokazuje. Współbieżne renderowania zatwierdzone między klatkami są liczone jako commity, bez pomiaru czasu.

<!-- s:5ae438610c -->
Zasada działania

<!-- s:1dda342130 -->
Podobnie jak React DevTools, rozszerzenie instaluje globalny hook przed uruchomieniem strony:

<!-- s:5a865fb9ae -->
Każdy korzeń konsoli rejestruje się w nim podczas tworzenia. Bez rozszerzenia hook nie istnieje, a korzeń sprawdza jego obecność tylko raz i nie wykonuje żadnej pracy dla poszczególnych klatek. Gdy rozszerzenie jest zainstalowane, ale panel zamknięty, koszt każdej klatki to jeden odczyt właściwości. Drzewa i klatki są obliczane tylko na żądanie panelu.

<!-- s:843fc9a8ad -->
Komunikaty przepływają: strona → skrypt treści → service worker → panel. Skrypty treści działają na każdej stronie, dzięki czemu hook istnieje przed uruchomieniem aplikacji. To jedyny dostęp, o który prosi rozszerzenie. Nie ładuje zdalnego kodu i nie wysyła niczego poza komputer.

<!-- s:e425f181df -->
Prywatność

<!-- s:f2cd52a110 -->
Rozszerzenie nie zbiera danych. Nie wykonuje żądań sieciowych, niczego nie przechowuje i nie ma analityki. Drzewa komponentów, klatki i pomiary czasu są przesyłane wyłącznie między stroną a panelem DevTools w tej samej przeglądarce i są usuwane po zamknięciu DevTools. Kliknięcie **Kopiuj klatkę** zapisuje tekst klatki w schowku.

<!-- s:639d5ea4c0 -->
Ograniczenia

<!-- s:153a772b79 -->
- Chrome i przeglądarki oparte na Chromium w wersji 111 lub nowszej.
- Aplikacje uruchomione przed zainstalowaniem rozszerzenia wymagają ponownego załadowania.
- Inspekcja obejmuje tylko ramkę najwyższego poziomu karty.
- Czasy pochodzą z `performance.now()`, którego rozdzielczość przeglądarki ograniczają do około 0,1 ms.
