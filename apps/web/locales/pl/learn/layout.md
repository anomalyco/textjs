<!-- s:b2d192945b -->
Konsola to siatka komórek. Text.js układa ją za pomocą Yoga, tego samego silnika flexbox, którego używa React Native, więc `<Box>` stosuje reguły CSS flexbox. Jednostkami są komórki: `p-1` to jedna kolumna i jeden wiersz wewnętrznego odstępu.

<!-- s:029cc40e38 -->
Górny pasek

<!-- s:4708298213 -->
Większość ekranów ma układ kolumnowy: pasek o wysokości jednego wiersza, a pod nim cała reszta. Nadaj paskowi stałą wysokość za pomocą `h-1` i pozwól treści zająć resztę za pomocą `grow`.

<!-- s:5f781355bb -->
`<Spacer>` to rosnący kontener: wszystko za nim jest przesuwane do prawej krawędzi.

<!-- s:0c01f22e11 -->
Panel boczny i karty

<!-- s:7bf034d9ab -->
Dodaj panel boczny o stałej szerokości z prawym obramowaniem oraz trzy karty, które dzielą pozostałą szerokość. `basis-0` wraz z `grow` daje każdej karcie równy udział niezależnie od jej zawartości.

<!-- s:493f8816f0 -->
Naciśnij `s` i `d` w konsoli. Yoga przelicza layout, a ponownie rysowane są tylko zmienione wiersze, więc przełączenie widoczności panelu bocznego kosztuje jedno wywołanie `console.log`.

<!-- s:66bd0231a6 -->
Domyślna responsywność

<!-- s:7d3f8e46eb -->
Siatka dopasowuje się do zadokowanego panelu DevTools. Przeciągnij krawędź konsoli, aby zwiększyć jej szerokość lub wysokość, a karty zmienią układ. Gdy potrzebujesz progów responsywności, `useBreakpoint()` zwraca aktualny próg w komórkach.
