<!-- s:d7ae3c23f0 -->
Ogni cella ha un carattere, un colore di primo piano, uno sfondo e un insieme di attributi. Text.js li compila in span CSS `%c`, così la console mostra colori reali, grassetto e corsivo.

<!-- s:45433c474e -->
Attributi del testo

<!-- s:32c37753d8 -->
`<Text>` accetta `bold`, `dim`, `italic`, `underline` e `strikethrough`. Gli elementi `<Text>` annidati diventano span con stili all’interno di una singola riga.

<!-- s:661b7c60b6 -->
Token del tema

<!-- s:f312d78237 -->
La prop `color` accetta valori esadecimali, nomi di colori semplici (`emerald`) e token del tema; le tonalità della palette Tailwind si applicano tramite classi (`text-emerald-400`). I token seguono il tema attivo, quindi preferiscili per tutto ciò che ha un significato semantico. Aggiungi un componente di stato:

<!-- s:4d4d36a0bd -->
Una scheda di deploy

<!-- s:108bb076c9 -->
`bg-surface` fa risaltare la scheda rispetto allo sfondo. L’ID del deploy assume il colore dello stato, passa al corsivo durante la build e diventa barrato in caso di errore.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` termina i messaggi di commit lunghi con `…` invece di mandarli a capo su una seconda riga.

<!-- s:087abce968 -->
Temi

<!-- s:8f993e0ab8 -->
Text.js include cinque temi: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT e Geist Light. Premi `t` nella console per scorrerli. L’intero frame viene ridisegnato con la nuova palette, perché ogni colore usato sopra è un token.
