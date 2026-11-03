<!-- s:b2d192945b -->
La console è una griglia di celle. Text.js ne organizza il layout con Yoga, lo stesso motore flexbox usato da React Native, quindi `<Box>` segue le regole flexbox di CSS. Le unità sono celle: `p-1` corrisponde a una colonna e una riga di padding.

<!-- s:029cc40e38 -->
Una barra superiore

<!-- s:4708298213 -->
La maggior parte delle schermate è una colonna: una barra di una riga, poi tutto il resto. Assegna alla barra un’altezza fissa con `h-1` e lascia che il contenuto occupi lo spazio restante con `grow`.

<!-- s:5f781355bb -->
`<Spacer>` è un box che si espande: tutto ciò che lo segue viene spinto verso il bordo destro.

<!-- s:0c01f22e11 -->
Barra laterale e schede

<!-- s:7bf034d9ab -->
Aggiungi una barra laterale a larghezza fissa con un bordo destro e tre schede che si dividono la larghezza restante. `basis-0` con `grow` assegna a ogni scheda una quota uguale, indipendentemente dal contenuto.

<!-- s:493f8816f0 -->
Premi `s` e `d` nella console. Yoga ricalcola il layout e ridisegna solo le righe modificate, quindi mostrare o nascondere la barra laterale costa un solo `console.log`.

<!-- s:66bd0231a6 -->
Responsive per impostazione predefinita

<!-- s:7d3f8e46eb -->
La griglia segue il pannello DevTools ancorato. Trascina la console per allargarla o aumentarne l’altezza e le schede si ridispongono. Quando ti servono i breakpoint, `useBreakpoint()` restituisce quello corrente, in celle.
