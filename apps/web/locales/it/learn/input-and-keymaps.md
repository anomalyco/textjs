<!-- s:0e310a2cb9 -->
I tasti premuti raggiungono la tua app tramite un input nascosto nella pagina, quindi la pagina deve avere il focus. Per questo ogni app Text.js ti chiede prima di fare clic sulla pagina. Una volta che la pagina ha il focus, ogni tasto che premi viene trasmesso a React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` è l’hook di basso livello che hai usato finora. Riceve un `KeyEvent` con un `key` normalizzato (`"up"`, `"return"`, `"escape"`), il carattere digitato in `input` e `ctrl`, `alt`, `shift` e `meta`.

<!-- s:bc64f58619 -->
Chiama `e.stopPropagation()` per impedire che un tasto raggiunga gli handler più in basso nell’albero.

<!-- s:d899f69427 -->
Mappe dei tasti

<!-- s:9b0867a5d5 -->
Quando una schermata ha più di un paio di tasti, descrivili con `useKeymap`. Le associazioni sono stringhe: `"up, k"` indica uno dei due tasti, `"g g"` è una sequenza, `"ctrl+k"` una combinazione simultanea. Le associazioni con etichetta compaiono anche in `<KeyHelp>`, `<KeyHints>` e nella palette dei comandi.

<!-- s:8a9f2678dd -->
Per ora `DEPLOYMENTS` è un normale array in `lib/deployments.ts`. Il capitolo 6 lo sposta dietro un route handler.

<!-- s:c2982612c3 -->
La guida in sovrimpressione

<!-- s:5001b36935 -->
`<KeyHelp />` resta in ascolto di `?` e apre una finestra modale con l’elenco raggruppato di tutte le associazioni con etichetta attualmente attive. Premi `?` nella console, poi `?` o `q` per chiuderla. Le associazioni all’interno di una finestra modale trattengono il focus, quindi l’elenco sottostante smette di reagire finché la finestra non si chiude.

<!-- s:1d0d345c65 -->
Focus

<!-- s:27a5e2c6bc -->
I componenti come `<Input>`, `<Select>` e `<Table>` ricevono i tasti solo quando hanno il focus. `Tab` sposta il focus tra questi componenti; `useFocus()` e `useFocusManager()` ti permettono di gestirlo direttamente.
