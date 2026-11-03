<!-- s:b7512b6ff1 -->
W ciągu dziesięciu rozdziałów zbudujesz **Acme Deploys**, panel wdrożeń renderowany w konsoli DevTools. Każdy rozdział kończy się aplikacją dokładnie w stanie wynikającym z twojego kodu, działającą na żywo w konsoli na tej stronie.

<!-- s:630c586fd9 -->
Tworzenie aplikacji

<!-- s:fd9f176938 -->
`create-text-app` tworzy szkielet projektu z App Router, TypeScript i interfejsem CLI `text`.

<!-- s:9eee556b8f -->
Otwórz `http://localhost:3000`, a następnie [otwórz konsolę przeglądarki](/docs/installation#open-the-console). Na stronie znajduje się panel fokusu. Twoja aplikacja renderuje się w konsoli.

<!-- s:7d69bcfbda -->
Twoja pierwsza strona

<!-- s:77df233a57 -->
Każda trasa to plik `page.tsx` w katalogu `app/`. Zastąp stronę startową kartą tytułową panelu:

<!-- s:efd190e3b6 -->
Zapisz plik. Fast Refresh przerysowuje klatkę i zachowuje stan komponentu.

<!-- s:f5e9f4301c -->
Reagowanie na klawisz

<!-- s:a9111ae891 -->
`useInput` odbiera każde naciśnięcie klawisza, gdy strona ma fokus. Zliczaj powitania:

<!-- s:c766a57c22 -->
To kompletna aplikacja Text.js. Ma stan React, kontener layoutu i jedno wywołanie `console.log` na każdą zmienioną klatkę, a w bezczynności niczego nie loguje.
