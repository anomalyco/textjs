<!-- s:68d1688157 -->
Sostituisci le righe scritte a mano con i componenti: `<Table>` con navigazione da tastiera e ordinamento, `<List>` con scorrimento virtualizzato e grafici disegnati con blocchi da un ottavo e punti a quadranti.

<!-- s:05c3784661 -->
Una tabella ordinabile

<!-- s:7c978a7876 -->
Le colonne sono un array di oggetti. Una colonna senza `width` condivide lo spazio rimanente in base a `grow`, `value` è ciò che l’ordinamento confronta e `render` disegna la cella.

<!-- s:d77f425e4a -->
Quando la tabella ha il focus, `↑` `↓` spostano l’evidenziazione, `s` passa alla colonna di ordinamento successiva, `S` inverte la direzione ed `Enter` chiama `onSelect`. Le tabelle lunghe disegnano solo le righe visibili.

<!-- s:0d24a40c2e -->
Un grafico sopra la tabella

<!-- s:146f64e4f0 -->
`<Sparkline>` riempie il proprio riquadro con i punti più recenti. `<BarChart>` allinea etichette e valori per te.

<!-- s:62ad31a083 -->
Il riquadro del grafico ha un’altezza fissa, quindi cambiare grafico non sposta mai la tabella e le sue righe non vengono ricodificate.

<!-- s:335111e821 -->
Altri componenti

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` e altri sono documentati nella sezione [Componenti](/docs/components-data).
