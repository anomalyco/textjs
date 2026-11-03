<!-- s:e4dabd0578 -->
Il layout di ogni frame di Text.js è calcolato da Yoga, il motore flexbox usato da React Native, compilato in WebAssembly. I riquadri e il testo condividono un unico albero Yoga. La console è una griglia di celle di caratteri, quindi ogni posizione e dimensione risultante deve corrispondere a un numero intero di celle.

<!-- s:9c86e1b16d -->
Un punto corrisponde a una cella

<!-- s:9026ebff4f -->
Yoga arrotonda i risultati a una griglia di pixel definita dal fattore di scala dei punti. Con un fattore di 2, come su uno schermo Retina, i bordi possono cadere su mezzi punti. Text.js carica Yoga una sola volta e imposta il fattore a 1:

<!-- s:f5193c7abd -->
Con un fattore di 1, Yoga arrotonda ogni bordo a un’unità intera e Text.js considera ogni unità come una cella. Yoga arrotonda la posizione assoluta di ogni bordo e ricava le dimensioni dai bordi arrotondati, così i riquadri adiacenti condividono un bordo. Dividi una riga di 81 colonne in due riquadri con `width="50%"`: uno avrà 40 colonne, l’altro 41, senza spazi né sovrapposizioni.

<!-- s:4f9619621a -->
Text.js applica direttamente i valori predefiniti CSS: `flexDirection` è `row` e `flexShrink` è `1`, come in un browser.

<!-- s:5240062c19 -->
Misurazione del testo

<!-- s:25f0052f43 -->
I nodi di testo sono foglie di Yoga con una funzione di misurazione. Yoga la chiama con la larghezza disponibile e Text.js restituisce le dimensioni del testo in celle:

<!-- s:a543588dc9 -->
Il testo che rientra nello spazio viene restituito con le sue dimensioni naturali. Il testo che non rientra va a capo alla larghezza disponibile e la sua altezza corrisponde al numero di righe. Il nodo conserva l’ultima suddivisione in righe, quindi una nuova misurazione con la stessa larghezza non suddivide di nuovo il testo.

<!-- s:3c253fdc4c -->
Misurazione dei cluster di grafemi

<!-- s:7d52c4b9c9 -->
La proprietà `length` di una stringa conta le unità di codice UTF-16, che dicono poco sul numero di celle occupate. Il testo viene prima suddiviso in cluster di grafemi con `Intl.Segmenter`, quindi `e` seguito da un accento combinante forma un solo cluster, così come una sequenza di emoji unita da caratteri di giunzione a larghezza zero. A ogni cluster viene poi assegnata una larghezza:

<!-- s:f36acd4206 -->
| Testo | Celle | Motivo |
| :-- | --: | :-- |
| `abc` | 3 | Una cella per carattere |
| `你好` | 4 | I caratteri larghi dell’Asia orientale ne occupano due |
| `🚀` | 2 | La rappresentazione come emoji ne occupa due |
| `é` (`e` + U+0301) | 1 | I segni combinanti non ne occupano nessuna |
| `─│┌▼←⠋` | 6 | I caratteri per disegnare riquadri, le forme geometriche, le frecce e il braille hanno una larghezza fissa di una cella |

<!-- s:75d5c21868 -->
I bordi, il simbolo `▼`, le frecce e i frame dell’indicatore di caricamento sono sempre misurati come una cella, quindi il bordo di un riquadro non disallinea mai il contenuto.

<!-- s:cee20acd8c -->
I caratteri ASCII stampabili saltano la segmentazione e le altre larghezze sono memorizzate nella cache per punto di codice e per cluster.

<!-- s:5f37d5a215 -->
Ritorno a capo

<!-- s:b59adefd34 -->
`<Text>` accetta una modalità `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (predefinita) interrompe le righe in corrispondenza degli spazi e all’interno di una parola quando questa è più larga della riga.
- `nowrap` mantiene una sola riga e lascia che il riquadro la ritagli.
- `truncate-end`, `truncate-middle` e `truncate-start` mantengono una sola riga e sostituiscono ciò che non rientra con `…`.

<!-- s:73ec8f197a -->
Anche il troncamento conta le celle, quindi una riga di testo cinese viene tagliata tra un carattere e l’altro e i puntini di sospensione occupano esattamente una cella.

<!-- s:1d11d6a370 -->
In pratica

<!-- s:50e47bf264 -->
Qui una barra laterale di 30 colonne affianca un pannello che occupa la larghezza rimanente:

<!-- s:f9394d30d6 -->
In una console di 100 colonne, la barra laterale occupa 30 colonne incluso il bordo e il pannello della conversazione occupa le altre 70. Il bordo occupa una cella per lato, quindi il titolo della sessione viene troncato a 28 celle.
