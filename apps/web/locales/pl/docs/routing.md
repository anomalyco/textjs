<!-- s:07e7af1eca -->
App Router mapuje foldery w `app/` na adresy URL i synchronizuje je z paskiem adresu oraz historią przeglądarki.

<!-- s:9c68fe3a82 -->
Strony

<!-- s:c4bd849316 -->
Wyeksportuj komponent jako eksport domyślny z pliku `page.tsx`:

<!-- s:66a6e1dc46 -->
Layouty

<!-- s:7d310a5d74 -->
Layouty otaczają trasy i zachowują swój stan podczas nawigacji.

<!-- s:c2b3ba00ff -->
Segmenty dynamiczne

<!-- s:44ffd1d0a7 -->
Nawigacja

<!-- s:50bb76e84e -->
`<Link>`

<!-- s:d785ff2211 -->
Komponent `<Link>` może otrzymać fokus i obsługuje jednoklawiszowe skróty klawiszowe.

<!-- s:328e16abd4 -->
| Prop | Opis |
| :-- | :-- |
| `href` | Ścieżka docelowa |
| `shortcut` | Klawisz otwierający link |
| `replace` | Zastąpienie wpisu w historii |

<!-- s:c6bd4ebc06 -->
`useRouter`

<!-- s:97ca5cffaf -->
Nawiguj z poziomu kodu:

<!-- s:4d9f7f9c5b -->
`usePathname` i `useParams`

<!-- s:2545c9aaa2 -->
Odczytaj bieżącą trasę:

<!-- s:a5386906c8 -->
Nawigacja wstecz, do przodu i bezpośrednie linki działają. Na hostingu statycznym segmenty dynamiczne wymagają obsługi zastępczej przez `index.html`. Adapter `static` zapisuje taki plik jako `404.html`.
