<!-- s:68d1688157 -->
Zastąp ręcznie tworzone wiersze komponentami: `<Table>` z nawigacją klawiaturą i sortowaniem, `<List>` z wirtualizowanym przewijaniem oraz wykresami rysowanymi za pomocą bloków o wysokości jednej ósmej komórki i kropek kwadrantowych.

<!-- s:05c3784661 -->
Tabela z sortowaniem

<!-- s:7c978a7876 -->
Kolumny to tablica obiektów. Kolumna bez `width` dzieli pozostałą przestrzeń według `grow`, `value` określa wartość porównywaną przy sortowaniu, a `render` rysuje komórkę.

<!-- s:d77f425e4a -->
Gdy tabela ma fokus, `↑` `↓` przesuwają podświetlenie, `s` przełącza kolumnę sortowania, `S` odwraca kierunek, a `Enter` wywołuje `onSelect`. Długie tabele rysują tylko widoczne wiersze.

<!-- s:0d24a40c2e -->
Wykres nad tabelą

<!-- s:146f64e4f0 -->
`<Sparkline>` wypełnia swój obszar najnowszymi punktami. `<BarChart>` wyrównuje etykiety i wartości za ciebie.

<!-- s:62ad31a083 -->
Obszar wykresu ma stałą wysokość, więc przełączanie wykresów nigdy nie przesuwa tabeli, a jej wiersze nie są ponownie kodowane.

<!-- s:335111e821 -->
Więcej komponentów

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` i inne opisano w sekcji [Komponenty](/docs/components-data).
