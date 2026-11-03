<!-- s:ce06f5c491 -->
App Router mapuje pliki w `app/` na adresy URL zgodnie z konwencjami Next.js App Router. Pasek adresu i historia przeglądarki pozostają zsynchronizowane, więc przechodzenie wstecz i dalej oraz linki bezpośrednie działają, gdy interfejs renderuje się w konsoli.

<!-- s:00fe1aba85 -->
Pliki jako trasy

<!-- s:8bae70ad43 -->
Przenieś listę do osobnej trasy i dodaj stronę ustawień:

<!-- s:141a7c73d4 -->
Wspólny layout

<!-- s:cffa0eef2d -->
`layout.tsx` otacza każdą stronę i zachowuje swój stan podczas nawigacji. Umieść w nim górny pasek i nawigację.

<!-- s:9d98f5e58a -->
`shortcut` przypisuje pojedynczy klawisz do linku. Naciśnij `1`, `2` i `3` w konsoli; w rzeczywistej aplikacji adres URL zmieniałby się po każdym z nich.

<!-- s:53af99b059 -->
Powrót

<!-- s:d77cce0a86 -->
`useRouter()` umożliwia nawigację z kodu. Powiąż `Backspace` z `router.back()` w layoucie:

<!-- s:c2b3ba00ff -->
Segmenty dynamiczne

<!-- s:6a1dcfdf25 -->
Foldery `[id]` otrzymują swoją wartość w `params`:

<!-- s:8294e77b63 -->
Na hostingu statycznym takie segmenty dynamiczne wymagają reguły przepisywania adresów na `index.html`. Omawia to rozdział 10.
