<!-- s:0e310a2cb9 -->
Naciśnięcia klawiszy trafiają do twojej aplikacji przez ukryte pole tekstowe na stronie, więc strona musi mieć fokus. Dlatego każda aplikacja Text.js prosi najpierw o kliknięcie strony. Gdy strona ma fokus, każdy naciśnięty klawisz trafia do biblioteki React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` to niskopoziomowy hook, z którego korzystasz do tej pory. Otrzymuje zdarzenie `KeyEvent` ze znormalizowaną wartością `key` (`"up"`, `"return"`, `"escape"`), wpisanym znakiem w `input` oraz polami `ctrl`, `alt`, `shift` i `meta`.

<!-- s:bc64f58619 -->
Wywołaj `e.stopPropagation()`, aby klawisz nie trafił do handlerów dalej w drzewie.

<!-- s:d899f69427 -->
Mapy klawiszy

<!-- s:9b0867a5d5 -->
Gdy ekran obsługuje więcej niż kilka klawiszy, opisz je za pomocą `useKeymap`. Powiązania to ciągi znaków: `"up, k"` oznacza dowolny z tych klawiszy, `"g g"` to sekwencja, a `"ctrl+k"` to kombinacja klawiszy. Powiązania z etykietami pojawiają się też w `<KeyHelp>`, `<KeyHints>` i palecie poleceń.

<!-- s:8a9f2678dd -->
Na razie `DEPLOYMENTS` to zwykła tablica w pliku `lib/deployments.ts`. W rozdziale 6 przeniesiesz dostęp do niej do handlera trasy.

<!-- s:c2982612c3 -->
Nakładka pomocy

<!-- s:5001b36935 -->
`<KeyHelp />` nasłuchuje klawisza `?` i otwiera okno modalne z pogrupowaną listą wszystkich aktualnie aktywnych powiązań z etykietami. Naciśnij `?` w konsoli, a potem `?` lub `q`, aby je zamknąć. Powiązania wewnątrz okna modalnego zatrzymują w nim fokus, więc lista pod spodem przestaje reagować do czasu jego zamknięcia.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:27a5e2c6bc -->
Komponenty takie jak `<Input>`, `<Select>` i `<Table>` odbierają klawisze tylko wtedy, gdy mają fokus. `Tab` przenosi fokus między nimi; `useFocus()` i `useFocusManager()` pozwalają sterować nim samodzielnie.
