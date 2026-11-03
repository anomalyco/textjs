<!-- s:3c9b7877c3 -->
O Text.js 0.3 adicionou `@textjs/font`, um parser e renderizador de fontes FIGlet. Ele inclui as 17 fontes da distribuição FIGlet 2.2.5, cada uma em um módulo ES, e sua saída corresponde exatamente à do binário `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Por que FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` tem dois estilos de letras integrados, `block` e `compact`, desde a versão 0.1. FIGlet é o padrão para esse tipo de lettering desde 1991, e existem centenas de fontes `.flf`. O suporte ao formato permite incluir qualquer uma delas em um app de console.

<!-- s:7fdbff5714 -->
Uma fonte FIGlet é um arquivo de texto simples. Uma linha de cabeçalho define a altura, o caractere hardblank e as regras de layout; em seguida, cada caractere é desenhado como um bloco de linhas com um marcador no fim de cada linha. Nos layouts padrão, o FIGlet move cada caractere para a esquerda até encostar no anterior e usa as regras de fusão da fonte para decidir se os dois subcaracteres que se tocam se fundem em um só.

<!-- s:4c761bba4d -->
Modos de layout

<!-- s:3f1c38cf92 -->
`figlet` tem cinco layouts horizontais, e `renderFiglet` aceita os mesmos cinco por meio de `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Efeito |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout da própria fonte, geralmente com fusão |
| `"full"` | `-W` | Largura total; os caracteres nunca se tocam |
| `"fitted"` | `-k` | Caracteres aproximados até se tocarem |
| `"smushed"` | `-S` | Fusão com as regras da fonte |
| `"universal"` | `-o` | Caracteres posteriores sobrepostos aos anteriores |

<!-- s:7a1307992e -->
Um número de -1 a 63 é um modo de layout `-m` bruto: `-1` é largura total, `0` é ajustado, e `1` a `63` selecionam regras de fusão. Todas as seis regras de fusão horizontal estão implementadas: caractere igual, sublinhado, hierarquia, par oposto, X grande e hardblank. O parser também processa o restante do formato: linhas de comentário, caracteres identificados por código em decimal, octal e hexadecimal, o glifo de caractere ausente e fontes da direita para a esquerda, como `ivrit`.

<!-- s:0c920c94d3 -->
A quebra de linha também segue o FIGlet. `width` quebra nos limites das palavras e dentro de uma palavra quando ela é mais larga que a linha, nos mesmos pontos que `figlet -w`. `figlet -w 80` imprime no máximo 79 colunas, então `-w N` corresponde a `width: N - 1`.

<!-- s:729dda48fc -->
Correspondência com o binário

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` contém 273 saídas geradas ao executar o `figlet` 2.2.5 real com cada fonte incluída em todos os modos de layout, com quebra de linha, justificação, texto da direita para a esquerda, modo de parágrafo e a própria entrada de regressão do FIGlet com as flags de seu `run-tests.sh`. Cada caso armazena os argumentos, a entrada e a saída exata, e o teste converte a linha de comando de volta em opções:

<!-- s:d31215cb4b -->
Todas as 273 correspondem. Para gerar os dados de teste novamente, coloque `figlet` 2.2.5 no seu `PATH` e execute `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Fontes na grade de células

<!-- s:ede6764977 -->
Todas as fontes incluídas desenham com ASCII imprimível ou Latin-1, então cada subcaractere ocupa exatamente uma célula em Menlo e se alinha à grade. `<FigletText>` mede suas linhas em células, então o lettering ocupa um layout flexbox como qualquer outro `<Text>`, e `columns` e `align` controlam a quebra e a justificação dentro de sua caixa.

<!-- s:3cedd51e92 -->
Cada fonte tem seu próprio módulo, então um app inclui apenas as fontes que importa, e uma fonte é analisada na primeira renderização, em vez de na importação. `@textjs/font/all` exporta todas as fontes para galerias.

<!-- s:9d54eeef4f -->
Qualquer outra FIGfont pode ser buscada e analisada em tempo de execução:

<!-- s:f64649f401 -->
Licenciamento

<!-- s:67e882f6b4 -->
As fontes incluídas são idênticas byte a byte às de `figlet-2.2.5.tar.gz` e são distribuídas sob a licença BSD de 3 cláusulas do FIGlet. Cada uma mantém seus créditos nas linhas de comentário, disponíveis em `font.comment`. Fontes populares sem permissão de redistribuição, como Doom, Larry 3D, ANSI Shadow e Calvin S, não estão incluídas.

<!-- s:ee98166722 -->
A referência completa está em [Fontes](/docs/fonts).
