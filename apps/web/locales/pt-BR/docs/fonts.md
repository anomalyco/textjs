<!-- s:dd02562b57 -->
`@textjs/font` analisa arquivos FIGfont 2 (`.flf`) e organiza seu layout exatamente como o programa `figlet`. Cada fonte é um módulo ES, então apenas as fontes que você importa são incluídas.

<!-- s:a15d12503b -->
Instalação

<!-- s:63bfd61a05 -->
Uso

<!-- s:fdffc4b786 -->
`<FigletText>` recebe uma fonte e uma string. As linhas são medidas em células, então as letras se encaixam em layouts flexbox como qualquer outro `<Text>`.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) aceita as mesmas fontes, mantendo seus estilos de letras integrados `block` e `compact`:

<!-- s:9fc6ab3e8b -->
Fora do React, `renderFiglet` retorna uma string por linha:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
O layout horizontal segue as flags do FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Efeito |
| :-- | :-- | :-- |
| `"default"` | `-s` | O layout da fonte, geralmente com fusão de caracteres |
| `"full"` | `-W` | Largura total; os caracteres nunca se tocam |
| `"fitted"` | `-k` | Kerning; os caracteres se aproximam até se tocarem |
| `"smushed"` | `-S` | Fusão de caracteres com as regras da fonte, mesmo para fontes ajustadas |
| `"universal"` | `-o` | Caracteres posteriores se sobrepõem aos anteriores |
| `0`–`63` | `-m` | Modo explícito de fusão de caracteres |

<!-- s:d9f3601792 -->
Todas as seis regras de fusão horizontal estão implementadas: caractere igual, sublinhado, hierarquia, par oposto, X grande e hardblank.

<!-- s:889b1e19ef -->
`verticalLayout` se aplica a textos com várias linhas. O FIGlet 2.2.5 nunca aproxima as linhas verticalmente, então o padrão é `"full"`; `"fitted"`, `"smushed"` e `"universal"` implementam as cinco regras verticais, incluindo a superfusão de linhas verticais, e `"default"` usa as regras da fonte.

<!-- s:d4ec30b173 -->
Quebra de linha e alinhamento

<!-- s:f799453d05 -->
`columns` (ou `width` em `renderFiglet`) quebra as linhas entre palavras e, depois, no meio delas, exatamente onde `figlet -w` faria. `align` pode ser `"left"`, `"center"` ou `"right"`; sem uma largura, as linhas se alinham dentro da largura da maior linha. Fontes da direita para a esquerda, como `ivrit`, imprimem da direita para a esquerda e se alinham à direita; sobrescreva esse comportamento com `direction`.

<!-- s:f8ccfce091 -->
Fontes incluídas

<!-- s:15e0b8eca7 -->
| Importação | Linhas | Observações |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Padrão do FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Itálico |
| `@textjs/font/small` | 5 | Compacta |
| `@textjs/font/big` | 8 | Inclui grego |
| `@textjs/font/banner` | 8 | Letras com `#`, katakana e cirílico |
| `@textjs/font/block`, `lean` | 8 | Contorno, vertical e inclinado |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Sombra projetada |
| `@textjs/font/script`, `smscript` | 7, 5 | Cursiva |
| `@textjs/font/mini` | 4 | Minúscula |
| `@textjs/font/bubble`, `digital` | 4, 3 | Letras em círculos e caixas |
| `@textjs/font/ivrit` | 6 | Hebraico, da direita para a esquerda |
| `@textjs/font/term` | 1 | Entrada sem alterações |

<!-- s:a8ecd7e9c1 -->
Todo glifo usa ASCII imprimível ou Latin-1, então cada subcaractere ocupa exatamente uma célula na fonte Menlo do DevTools. `@textjs/font/all` exporta todas as fontes, além de `BUNDLED_FONTS` para galerias. A análise das fontes ocorre na primeira renderização, não na importação.

<!-- s:74ff0f95fa -->
Fontes personalizadas

<!-- s:093892bc6a -->
Qualquer FIGfont funciona. Busque o arquivo e depois analise-o:

<!-- s:c2f4ef471e -->
O analisador lê o cabeçalho, as linhas de comentários, os hardblanks, os marcadores de fim, os 102 caracteres obrigatórios e os caracteres identificados por código em decimal, octal ou hexadecimal. Fontes TOIlet `.tlf` são renderizadas como texto simples. Prefira fontes desenhadas com ASCII ou caracteres de desenho de caixas; braille e emoji não têm largura de uma célula em Menlo.

<!-- s:f64649f401 -->
Licenciamento

<!-- s:adad99f0de -->
As fontes incluídas são as fontes da distribuição FIGlet 2.2.5, byte por byte, sob a licença BSD de 3 cláusulas do FIGlet. Cada uma mantém seus créditos nas linhas de comentários, disponíveis em tempo de execução como `font.comment`. Fontes populares sem permissão de redistribuição, como Doom, Larry 3D, ANSI Shadow e Calvin S, não estão incluídas.

<!-- s:2a50d4cddc -->
Verificação com `figlet`

<!-- s:111c132fa2 -->
A suíte de testes reproduz 273 saídas gravadas do binário real do `figlet` 2.2.5: todas as fontes incluídas em todos os modos de layout, quebra de linha, justificação, texto da direita para a esquerda, modo de parágrafo e a própria entrada de regressão do FIGlet. Todas correspondem exatamente.
