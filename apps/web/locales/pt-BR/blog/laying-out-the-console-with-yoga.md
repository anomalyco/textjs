<!-- s:e4dabd0578 -->
O Yoga, o motor de flexbox usado pelo React Native e compilado para WebAssembly, calcula o layout de cada quadro do Text.js. Caixas e texto compartilham uma única árvore do Yoga. O console é uma grade de células de caracteres, então toda posição e todo tamanho resultantes precisam ser um número inteiro de células.

<!-- s:9c86e1b16d -->
Um ponto é uma célula

<!-- s:9026ebff4f -->
O Yoga arredonda seus resultados para uma grade de pixels definida pelo fator de escala de pontos. Com o fator em 2, como em uma tela Retina, as bordas podem cair em meios pontos. O Text.js carrega o Yoga uma vez e define o fator como 1:

<!-- s:f5193c7abd -->
Com um fator de 1, o Yoga arredonda cada borda para uma unidade inteira, e o Text.js trata uma unidade como uma célula. O Yoga arredonda a posição absoluta de cada borda e deriva os tamanhos das bordas arredondadas, de modo que caixas vizinhas compartilhem uma borda. Divida uma linha de 81 colunas em duas caixas com `width="50%"` e uma ficará com 40 colunas, a outra com 41, sem espaço entre elas nem sobreposição.

<!-- s:4f9619621a -->
O próprio Text.js aplica os padrões do CSS: `flexDirection` é `row` e `flexShrink` é `1`, como em um navegador.

<!-- s:5240062c19 -->
Medir texto

<!-- s:25f0052f43 -->
Os nós de texto são folhas do Yoga com uma função de medição. O Yoga a chama com a largura disponível, e o Text.js retorna o tamanho do texto em células:

<!-- s:a543588dc9 -->
O texto que cabe é retornado em seu tamanho natural. O texto que não cabe é quebrado na largura disponível, e sua altura é o número de linhas. O nó mantém sua última quebra de linhas, então medir a mesma largura novamente não repete a quebra do texto.

<!-- s:3c253fdc4c -->
Medir agrupamentos de grafemas

<!-- s:7d52c4b9c9 -->
O `length` de uma string conta unidades de código UTF-16, o que diz pouco sobre quantas células ela preenche. Primeiro, o texto é dividido em agrupamentos de grafemas com `Intl.Segmenter`, de modo que `e` seguido de um acento combinante seja um único agrupamento, assim como uma sequência de emojis unida por caracteres de junção de largura zero. Em seguida, cada agrupamento recebe uma largura:

<!-- s:f36acd4206 -->
| Texto | Células | Motivo |
| :-- | --: | :-- |
| `abc` | 3 | Uma célula por caractere |
| `你好` | 4 | Caracteres largos do leste asiático ocupam duas |
| `🚀` | 2 | A apresentação como emoji ocupa duas |
| `é` (`e` + U+0301) | 1 | Marcas combinantes não ocupam nenhuma |
| `─│┌▼←⠋` | 6 | Caracteres de desenho de caixas, formas geométricas, setas e braille têm largura fixada em uma |

<!-- s:75d5c21868 -->
Bordas, a marca `▼`, setas e quadros de indicadores de carregamento são sempre medidos como uma célula, então a borda de uma caixa nunca desalinha seu conteúdo.

<!-- s:cee20acd8c -->
O ASCII imprimível dispensa a segmentação, e as demais larguras são armazenadas em cache por ponto de código e por agrupamento.

<!-- s:5f37d5a215 -->
Quebra de linhas

<!-- s:b59adefd34 -->
`<Text>` aceita um modo `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (o padrão) quebra nos espaços e dentro de uma palavra quando ela é mais larga que a linha.
- `nowrap` mantém uma linha e deixa a caixa recortá-la.
- `truncate-end`, `truncate-middle` e `truncate-start` mantêm uma linha e substituem o que não cabe por `…`.

<!-- s:73ec8f197a -->
O truncamento também conta células, então uma linha de texto em chinês é cortada no limite de um caractere, e as reticências ocupam exatamente uma célula.

<!-- s:1d11d6a370 -->
Na prática

<!-- s:50e47bf264 -->
Aqui, uma barra lateral de 30 colunas fica ao lado de um painel que ocupa a largura restante:

<!-- s:f9394d30d6 -->
Em um console de 100 colunas, a barra lateral ocupa 30 colunas incluindo sua borda, e o painel de conversa ocupa as outras 70. Uma borda ocupa uma célula de cada lado, então o título da sessão é truncado em 28 células.
