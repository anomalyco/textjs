<!-- s:09c9709272 -->
`text build` tworzy statycznego klienta oraz, jeśli masz handlery tras, serwer dla `text start`.

<!-- s:b09ff23eb8 -->
Budowanie

<!-- s:34d9f1bf54 -->
`text start` udostępnia zbudowaną aplikację i uruchamia twoje handlery tras. Działa na dowolnym hoście z Bun 1.2+ lub Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Ustaw tytuł karty przeglądarki w głównym layoucie. Strony mogą go nadpisać.

<!-- s:0467501ecc -->
Hosting statyczny

<!-- s:f5f06a38ae -->
Bez handlerów tras zbudowana aplikacja jest zwykłą statyczną witryną. Każda statyczna trasa otrzymuje własny plik HTML. Trasy dynamiczne, takie jak `/deployments/[id]`, są obsługiwane przez `index.html`.

<!-- s:c33282e322 -->
Na platformach Vercel i Cloudflare Pages polecenie `text build` wykrywa platformę i samo zapisuje regułę zastępczą. Inne hostingi statyczne wymagają reguły przepisywania adresów. Na platformie Netlify dodaj plik `_redirects` do `public/`:

<!-- s:ec502dd4e6 -->
Netlify udostępnia istniejące pliki przed zastosowaniem reguły, więc nie wpływa ona na zasoby ani trasy po prerenderowaniu.

<!-- s:0b1dc034aa -->
Przed wdrożeniem

<!-- s:463de18e39 -->
- Wyłącz opcję **Zachowaj dziennik** w ustawieniach konsoli. Twoi użytkownicy też muszą ją wyłączyć.
- Przetestuj wąskie rozmiary, takie jak 80×24. DevTools zadokowane z boku daje wąską siatkę.
- Uruchom `bun test`.

<!-- s:c5fa27231d -->
Naciśnij `Enter` w konsoli, aby wdrożyć aplikację. Potem odbierz certyfikat.
