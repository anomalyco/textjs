<!-- s:710c25737e -->
Em um framework DOM, os componentes se tornam nós DOM que o navegador organiza e pinta na página. No Text.js, os componentes se tornam células, e cada quadro de células alterado se torna uma chamada a `console.log` no DevTools. Chamamos isso de arquitetura invertida.

<!-- s:d00a01bf6f -->
O pipeline

<!-- s:12c6e8f741 -->
Cada etapa existe porque o console é uma tela incomum. Ele usa fonte monoespaçada e é orientado a linhas, recebe estilos com `%c`, e o DevTools decide quando repintá-lo.

<!-- s:db7daa7cf2 -->
Reconciliador

<!-- s:f3cdc101e1 -->
`@textjs/react` é um reconciliador do React 19 (`react-reconciler@0.34.0`) com dois elementos hospedeiros, `tx-box` e `tx-text`, além de instâncias de texto para filhos do tipo string. Tudo o que você importa, de `<Box>` a `<Markdown>`, é construído sobre eles. Os commits são agendados em `requestAnimationFrame`, e um pressionamento de tecla ou uma colagem dispara uma renderização síncrona na mesma tarefa.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, compilado para WebAssembly, organiza a árvore com `pointScaleFactor = 1`, para que cada caixa se alinhe a uma célula inteira. O texto é medido com `Intl.Segmenter` e tabelas de largura de caracteres do leste asiático, de modo que `你好` ocupa quatro células e `🚀` ocupa duas. Se uma edição não puder alterar o tamanho de um nó de texto, Yoga não é consultado novamente.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
O quadro é uma grade de arrays tipados alocados uma única vez: caracteres em um `Uint32Array`, cores de primeiro plano e fundo compactadas como `0xRRGGBBAA`, atributos como uma máscara de bits `Uint16Array`. A pintura escreve nesses arrays e rastreia quais linhas foram tocadas.

<!-- s:2a9b8dd7b1 -->
O filtro

<!-- s:1cdfa61881 -->
Cada linha tem um hash FNV-1a de 32 bits em cache. Apenas as linhas escritas desde o último quadro têm o hash recalculado. Se nenhuma linha mudou, o driver retorna antes de construir uma string e não faz nenhuma chamada ao console. Um indicador giratório em uma aba oculta não custa nada porque não está avançando.

<!-- s:a36177ad5b -->
Codificação por comprimento de sequência

<!-- s:c372fac68d -->
As linhas alteradas são percorridas novamente e agrupadas em sequências de estilo idêntico, e cada sequência se torna um span `%c`. As sequências continuam através das quebras de linha. As strings CSS são internadas e referenciadas por IDs inteiros de estilo, de modo que o caminho crítico nunca constrói a mesma string duas vezes. Um painel de 100×32 tem 3.200 células e 149 spans.

<!-- s:922d9e42bd -->
A string de formato também protege contra dois comportamentos do DevTools. Um `%` literal é escrito como `%%`. Um word joiner é inserido depois de `://`, dentro de `www.` e em `path:line`, para que o DevTools não transforme seu texto em um link e o repinte com suas próprias cores.

<!-- s:f55ed8e2b0 -->
Uma chamada

<!-- s:b57bb25475 -->
Cada quadro alterado é uma única chamada:

<!-- s:e3e37e3616 -->
Os quadros são anexados, cadenciados pelo limitador de 50 ms do DevTools e trocados dentro de uma única pintura. [Turbolog: eliminando o flash](/blog/turbolog-eliminating-the-flash) cobre essa parte.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:e569f67f37 -->
O console não pode receber entradas do teclado, então a página as recebe. Um `<textarea>` oculto coleta teclas, colagens e composição por IME, e eventos `wheel` rolam os componentes `ScrollBox`. No textjs.org, as páginas Playground e OpenCode são uma grande área de foco. Abra o console e clique na página para digitar.

<!-- s:7db6aa160c -->
O que a página vê

<!-- s:03e00f4b44 -->
A página não pode ler o tamanho do console, apenas o da própria janela, então o Text.js o infere: um painel acoplado reduz `innerWidth` ou `innerHeight` enquanto `outer*` permanece igual, e cada hipótese de acoplamento é calculada para os níveis de zoom do Chrome. O melhor ajuste vence. As constantes (56 px de espaçamento interno horizontal, 104 px de elementos da interface do console, 14 px de distância entre linhas) foram medidas no frontend real do DevTools.
