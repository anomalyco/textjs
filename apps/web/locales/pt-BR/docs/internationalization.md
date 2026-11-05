<!-- s:43751f7845 -->
Text.js renderiza hebraico, árabe, persa e outras escritas da direita para a esquerda na ordem correta, alinhadas à grade de células, no DevTools, em terminais e em espelhos DOM. Ele implementa o Algoritmo Bidirecional Unicode (UAX #9, Unicode 18.0) e passa nas suítes oficiais de conformidade: todos os 770.241 casos de `BidiTest.txt` (cada entrada em cada direção de parágrafo) e todos os 91.707 casos de `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Direção

<!-- s:0c7b144a82 -->
Cada parágrafo (cada linha de um `<Text>` separada por `\n`) escolhe sua própria direção base a partir do primeiro caractere forte, como `dir="auto"` faz no HTML. Parágrafos da direita para a esquerda se alinham à direita por padrão.

<!-- s:c17beb4498 -->
| `align` | Parágrafo da esquerda para a direita | Parágrafo da direita para a esquerda |
| :-- | :-- | :-- |
| `"start"` (padrão) | esquerda | direita |
| `"end"` | direita | esquerda |
| `"left"` / `"center"` / `"right"` | conforme especificado | conforme especificado |

<!-- s:6db8fa68bb -->
Em um `<Text>` aninhado, `dir` isola o span como o `<bdi>` do HTML: seu conteúdo tem layout independente e não pode reordenar o texto ao redor. Use isso para nomes, títulos e outros textos de direção desconhecida fornecidos por usuários.

<!-- s:68088feb2d -->
Como a renderização funciona

<!-- s:d401630cda -->
1. **Quebrar linhas na ordem lógica.** As linhas são quebradas exatamente como no texto da esquerda para a direita, pela largura das células.
2. **Reordenar cada linha.** O algoritmo resolve os níveis de incorporação de todo o parágrafo (incorporações explícitas e isolamentos, tipos fracos e neutros, colchetes pareados), depois reordena cada linha quebrada de forma independente (regras L1–L2). Colchetes e outros caracteres espelhados se invertem nos níveis da direita para a esquerda (L4), então `(abc)` permanece `(abc)` dentro do hebraico.
3. **Dar forma ao árabe.** As letras assumem suas formas contextuais (isolada, inicial, medial, final) dos blocos Arabic Presentation Forms, calculadas na ordem lógica dentro de cada trecho de mesmo nível da linha (ZWJ e ZWNJ contam onde estão). Uma letra ocupa uma célula, as formas conectadas se mantêm em qualquer limite de span (um cursor, uma mudança de cor), e o console nunca precisa dar forma a elas.
4. **Fixar a ordem.** As células agora contêm glifos na ordem de exibição. Navegadores e muitos terminais executariam bidi sobre eles uma segunda vez, então os drivers fixam a ordem:

<!-- s:153724c967 -->
| Saída | Como a ordem é fixada |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Spans com caracteres da direita para a esquerda são envolvidos em `LRO … PDF` (U+202D / U+202C). O sanitizador de `%c` do DevTools remove `direction` e `unicode-bidi`. |
| Terminais (`AnsiDriver`, `text run`) | Linhas com texto da direita para a esquerda são envolvidas em `LRO … PDF` para terminais que executam bidi por linha. `renderToTerminal` muda para o modo explícito BDSM da ECMA-48 (`CSI 8 l`, respeitado por terminais baseados em VTE) uma vez na entrada e volta ao modo implícito (`CSI 8 h`) na saída; quadros avulsos de `renderToAnsi` que contêm texto da direita para a esquerda começam com `CSI 8 l`. Passe `bidi: "none"` para emitir as células como estão. |
| Espelhos DOM (`<ConsoleMirror>`) | O espelho usa `direction: ltr` (para que uma página hospedeira RTL não possa invertê-lo), e spans com texto da direita para a esquerda recebem `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` e `<Divider title>` passam pelas mesmas etapas (`drawLogicalText(buffer, x, y, text, …)` desenha qualquer linha individual dessa forma), então seus rótulos aparecem na ordem correta e com as letras conectadas.

<!-- s:3b67946601 -->
Textos sem caracteres da direita para a esquerda pulam todas essas etapas. Um modelo de texto inteiramente da esquerda para a direita é detectado durante a segmentação de seus grafemas (uma comparação por grafema) e usa o caminho de pintura inalterado; os quadros do console são idênticos byte a byte.

<!-- s:6181d9259c -->
Carregamento do motor bidi

<!-- s:8bd0807fa0 -->
Nos apps Text.js (`text dev`, `text build`), o motor bidi e suas tabelas Unicode ficam em um chunk separado de 10,1 kB (gzip). O download ocorre na primeira vez que uma página renderiza texto da direita para a esquerda ou um `<Text>` com `dir="rtl"`, então as outras páginas nunca o carregam. Até ele chegar, esse texto é desenhado em ordem lógica. Depois, o console redesenha em ordem de exibição.

<!-- s:ed4299ea80 -->
Apps `text build` com um shell pré-renderizado iniciam o download por conta própria quando o shell tem texto da direita para a esquerda. Se você montar o console por conta própria, inicie o download junto com `createConsoleRoot()` para que o primeiro quadro esteja em ordem de exibição. Por exemplo, em páginas da direita para a esquerda:

<!-- s:8ebc8c3712 -->
`loadBidi()` rejeita se o chunk não carregar. Nesse caso, o texto da direita para a esquerda permanece em ordem lógica.

<!-- s:7adcf6764d -->
A renderização no servidor, `text run`, os testes e os bundles sem a condição de resolução `@textjs/client` incluem o motor, então sempre desenham texto da direita para a esquerda em ordem de exibição e `loadBidi()` resolve imediatamente.

<!-- s:26ac17c25a -->
Larguras das células

<!-- s:552e751976 -->
A pilha de fontes distribuída é `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Nenhuma dessas fontes tem glifos hebraicos ou árabes, então os navegadores recorrem a fontes alternativas por caractere. No macOS, essa fonte é Courier New, monoespaçada a 0,6 em: 7,2012 px por glifo a 12 px contra 7,2246 px da Menlo. Ela é 0,3% mais estreita, o suficiente para deslocar uma linha inteira de hebraico em cerca de meia célula.

<!-- s:851f84e769 -->
`CssConsoleDriver` mede cada span da direita para a esquerda com um canvas na fonte do console (a mesma modelagem de glifos e seleção de fontes alternativas do Blink que o DevTools usa), depois acrescenta espaçamento interno pela diferença exata em LayoutUnit (1/64 px). O span fica com a mesma largura das células da grade que cobre (um grafema largo, como um emoji, conta como duas). Um span é contraído em no máximo meia célula, então uma fonte alternativa proporcional (Times New Roman ao lado de Cascadia Mono no Windows) transborda em vez de deixar o próximo span sobrepor seus glifos. Medições no frontend real do DevTools (Chromium 151), em um quadro de 64×21 com linhas em hebraico, árabe, mistas e com emoji em hebraico, além de títulos RTL de caixas (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Quadro | Desvio da borda direita entre linhas |
| :-- | --: |
| Células registradas sem fixação | 14,5 px (o DevTools reordena e remodela os glifos) |
| Ordem fixada, sem ajuste de largura | 2,22 px |
| Driver distribuído | 0,156 px |
| Controle: mesmas células, cada glifo RTL substituído por `x` | 1,67 px |

<!-- s:a7ec844aae -->
O quadro distribuído corresponde ao controle inteiramente latino em todas as linhas, exceto na de emoji, em que se sai melhor: os emojis são ajustados junto com o span da direita para a esquerda ao redor deles (0,03 px), enquanto a linha de emoji da esquerda para a direita do controle não é ajustada (1,66 px).

<!-- s:318b8b5f4c -->
O DevTools pinta cada span de `%c` com `contain: paint` e alinha cada um aos pixels do dispositivo separadamente, então, onde dois fundos se encontram em uma posição fracionária, o pixel entre eles pode não pertencer a nenhum dos dois, deixando uma linha fina de 1 px. No Chrome e no Edge, um span com fundo o estende em 1 px sob um vizinho opaco à direita, e um span ajustado adiciona esse pixel ao seu espaçamento interno. Nenhum dos quatro quadros acima apresenta uma linha fina.

<!-- s:7deafc8e74 -->
Passe `measureText: false` para desativar o ajuste ou forneça seu próprio medidor `(text, bold, italic) => px`.

<!-- s:f088ff48f9 -->
Entrada e edição

<!-- s:6aca925fed -->
`<Input>` e `<Textarea>` mantêm um cursor lógico. As teclas de seta percorrem o texto na ordem de armazenamento, então, em texto da direita para a esquerda, ← move visualmente para a direita. O cursor em bloco fica sobre o caractere lógico que cobre, onde quer que a reordenação o coloque. Dentro de um trecho da direita para a esquerda, essa é a célula à esquerda do caractere anterior. A seleção também é um intervalo lógico, e seu destaque pode, portanto, cobrir células não contíguas em linhas de direção mista. A rolagem horizontal de um `<Input>` de linha única segue a coluna lógica, então um valor longo da direita para a esquerda pode tirar o cursor da área visível. Um cursor sobre um espaço ou no fim do texto é desenhado como um espaço inquebrável isolado, para permanecer neutro e nunca se juntar aos números de nenhum dos lados.

<!-- s:68c8d3995f -->
Limites

<!-- s:fbb8008232 -->
- **Separadores de parágrafo.** As linhas se dividem em `\n`. U+2029 e outros separadores de parágrafo encerram um parágrafo bidi, mas não iniciam uma nova linha.
- **Tabulações.** As tabulações são expandidas em espaços antes da execução de bidi, então atuam como espaços em branco (WS), não como separadores de segmento (S).
- **Modelagem de glifos.** Apenas letras com formas de apresentação são modeladas: árabe, persa, urdu e as outras letras em U+FB50–U+FDFF e U+FE70–U+FEFF. Lam-alef permanece como duas letras conectadas em duas células, não como a ligadura de um único glifo. Siríaco, N'Ko e outras escritas com conexão mantêm suas formas nominais.
- **Cópia.** O texto copiado do console fica na ordem de exibição (com as marcas `LRO`/`PDF`), não na ordem lógica.
- **Terminais.** Terminais que ignoram tanto BDSM quanto `LRO` e executam seu próprio bidi (por exemplo, com bidi ativado no iTerm2) podem reordenar novamente as linhas da direita para a esquerda.
- **Espelhos DOM.** `<ConsoleMirror>` não ajusta larguras, então trechos da direita para a esquerda podem apresentar um desvio de até 0,3% de sua largura.

<!-- s:f4d4dadbf6 -->
Traduzir o painel de foco

<!-- s:7791d4db4e -->
O `<FocusPad>` de `@textjs/react/dom` (também renderizado por `<TextCanvas>`) orienta os visitantes a abrir o console, clicar na página e pressionar uma tecla. Seu texto é em inglês por padrão. Para traduzi-lo, passe `messages` com as strings que você quer substituir. As chaves que você omitir mantêm o texto em inglês, listado em `defaultFocusPadMessages`.

<!-- s:66c2b8e3e2 -->
Uma string que contém um valor é uma função que retorna a frase inteira, para que a tradução possa colocar o valor em qualquer posição nela. `step`, `pressShortcut`, `then`, `defaultAction` e `shortcutOpens` são funções. `step` recebe o número da etapa e a quantidade de etapas. `then` recebe a prop `action`, ou o texto de `defaultAction` quando não há `action`. `defaultAction` recebe as teclas da primeira dica, ou `null` quando não há dicas. `pressShortcut` recebe as teclas do atalho para leitores de tela, e `shortcutOpens` recebe o atalho como elementos `<kbd>`.

<!-- s:e9475554da -->
`messages` também abrange os rótulos anunciados pelos leitores de tela e o controle de tamanho do console (`sizeControl`). `<TextCanvas>` aceita a mesma prop `messages`. `<ViewportControl>` também a aceita e usa as chaves do controle de tamanho. As representações de teclas como ⌘⌥J, Ctrl+Shift+J e Enter não são traduzidas.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` e `reorderIndices` expõem o próprio algoritmo: regras P1–I2, L1 e L2.
