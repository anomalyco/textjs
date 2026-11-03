<!-- s:16c98cd381 -->
Text.js renderiza apps React no console do Chrome DevTools. Além de um campo de entrada oculto, a página não tem interface. Cada quadro do app é uma única chamada a `console.log`.

<!-- s:fe9cd991d4 -->
O console como tela

<!-- s:5ae20a07fc -->
`console.log` aceita uma string de formatação. Cada `%c` aplica o CSS do próximo argumento ao texto que vem depois dele, até o próximo `%c`:

<!-- s:2822a0243c -->
Esses estilos podem definir cores, fundos, negrito, itálico e sublinhado, e a fonte do console é monoespaçada (Menlo no macOS). Com uma fonte monoespaçada e cores que podem mudar a cada sequência de caracteres, o console funciona como uma grade de células de caracteres estilizadas. Bordas, painéis, campos de entrada e gráficos podem ser desenhados nela.

<!-- s:585742694b -->
Um quadro é uma grade de células

<!-- s:04a12244bc -->
O renderizador mantém cada quadro em um `CellBuffer`. Os caracteres ficam em um array tipado, as cores de primeiro plano e de fundo em outros dois, e atributos como negrito e sublinhado em um quarto. Os arrays são alocados uma vez para um determinado tamanho e reutilizados em todos os quadros.

<!-- s:2ff86351b3 -->
Para registrar um quadro, o driver percorre cada linha e agrupa células vizinhas que compartilham um estilo em sequências. Cada sequência se torna um span `%c`, e as linhas são unidas com `\n`. Nosso painel de teste de 100×32, com 3.200 células, é codificado em cerca de 200 spans.

<!-- s:48a9b4f008 -->
Uma chamada por quadro

<!-- s:aa2cafe395 -->
Registrar cada linha como uma mensagem separada não funciona. Cada mensagem recebe sua própria borda e seu próprio link para o código-fonte no DevTools, e o DevTools agrupa mensagens consecutivas idênticas sob um contador de repetições, então duas linhas idênticas de uma tabela seriam mescladas em uma só. Um quadro registrado como uma única mensagem permanece inteiro.

<!-- s:ea38228d16 -->
Dois elementos do texto precisam ser escapados primeiro. Um `%` literal é escrito como `%%`, para que um texto como `100%` não consuma um argumento de estilo. O DevTools também transforma URLs em links e os repinta com suas próprias cores, então `://` e `www.` recebem um word joiner (U+2060), que não tem largura:

<!-- s:ec8783435a -->
Quadros ociosos não registram nada

<!-- s:8b7f1f9d06 -->
Um hash é calculado para cada linha do buffer. Se nenhum hash mudou desde o último quadro, o driver retorna antes de montar uma string e não toca no console. Um app que aguarda entrada não faz chamadas.

<!-- s:43c3523265 -->
Quando uma linha muda, o driver limpa o console e registra o novo quadro:

<!-- s:5b584e930a -->
Apenas as linhas cujo hash mudou são recodificadas. As outras reutilizam os spans do quadro anterior.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:e95aae4719 -->
O console não recebe eventos de teclado, então a página os coleta. Um `<textarea>` oculto recebe pressionamentos de teclas, colagens e composição via IME e os transforma em eventos de teclado para o app. Clicar na página coloca o foco nele.

<!-- s:88cae4fc43 -->
Próximos passos

<!-- s:cb5f6bd294 -->
Os protótipos 0.0.x de `@textjs/core` no npm mantêm tudo em um único pacote. Text.js 0.1 move o renderizador descrito aqui para `@textjs/core`, o reconciler do React para `@textjs/react` e adiciona um App Router.
