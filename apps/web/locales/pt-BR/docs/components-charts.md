<!-- s:8f99ab8d5a -->
Os gráficos são desenhados com elementos de bloco. As barras usam oito níveis por célula, e as linhas usam uma grade de 2×2 pontos por célula.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Gráficos de linha em matriz de pontos com eixo y e legenda.

<!-- s:977778a73f -->
| Prop | Descrição |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Atalho para uma série |
| `height` | Linhas (padrão `8`) |
| `min` / `max` | Limites fixos (padrão: os dados) |
| `axis` | Eixo y com rótulos de mínimo / máximo |
| `formatValue` | Rótulos do eixo (padrão `1.2k`) |
| `marker` | `quadrant` (padrão) ou `braille` |

<!-- s:3827b070cb -->
`braille` agrupa 2×4 pontos por célula. Use em terminais: Menlo, a fonte do console do DevTools no macOS, não tem braille, e os glifos substitutos são mais largos que uma célula.

<!-- s:a1d8752203 -->
As cores padrão das séries são `accent`, `success`, `warning`, `info` e `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Barras horizontais com rótulos e valores alinhados, com precisão de um oitavo de célula.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Preenche sua largura com os pontos mais recentes. `height` acima de `1` renderiza uma área preenchida.

<!-- s:9b515e6ed1 -->
`sparkline(values)` retorna a mesma sparkline como uma string.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Descrição |
| :-- | :-- |
| `value` / `max` | Progresso (omita para indeterminado) |
| `variant` | `block` (suave) `line` `thin` |
| `width` | Células (padrão: preencher) |
| `label` | Texto inicial |
| `formatValue` | Texto final (padrão `42%`) |

<!-- s:39c076d22f -->
As barras indeterminadas avançam no ritmo dos quadros do renderizador e param quando a saída é pausada.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolação de cores por célula. Strings com várias linhas compartilham um gradiente, por isso ele combina com `<AsciiFont>`.

<!-- s:99155d62a4 -->
Gradientes nomeados: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Os consoles do Chromium e do Firefox desenham a imagem como um sprite de pixels. Pixel art (256 cores ou menos, sem pixels parcialmente transparentes) mantém até 8 × 16 pixels por célula, e fotos até 4 × 8. Safari, terminais, cópias em texto puro e páginas com [`runtime = "server"`](/docs/server-rendering) recebem meios-blocos `▀`: cada célula contém dois pixels, o superior no primeiro plano e o inferior no fundo. Passe `renderMode="halfblock"` para desenhar meios-blocos em todos os lugares, como `<Image>` fazia na versão 1.3.

<!-- s:70bb4fc454 -->
| Prop | Descrição |
| :-- | :-- |
| `src` | URL da imagem (somente no navegador) |
| `pixels` | RGBA bruto como `{ width, height, data }`, 4 bytes por pixel em ordem de linhas |
| `width` / `height` | Largura em células, altura em linhas. Passe uma delas para manter a proporção, ou nenhuma para 1 × 2 pixels por célula (`src` redimensiona para no máximo 256 × 256 px) |
| `fit` | `contain` (padrão), `cover` ou `fill` |
| `alt` | Texto exibido enquanto `src` carrega ou se falhar |
| `renderMode` | `auto` (padrão: sprite onde houver suporte, meios-blocos `▀` nos demais casos) ou `halfblock` |

<!-- s:c106665c64 -->
`<Image>` também aceita props de layout.

<!-- s:20dac26bff -->
`src` carrega por meio de um canvas, então imagens de outras origens precisam de CORS. `pixels` aceita RGBA bruto em qualquer ambiente, incluindo o terminal.

<!-- s:4e3b06ef0e -->
Uma imagem também é desenhada como meios-blocos no Chromium e no Firefox quando não pode ser um único sprite:

<!-- s:00d2e660eb -->
- Duas imagens lado a lado nas mesmas linhas, como em uma galeria.
- Uma foto com texto ao lado. Pixel art ao lado de texto continua sendo um sprite.
- Uma imagem recortada por uma caixa com `overflow="hidden"`, ou parcialmente coberta por outra caixa.
- Pixels transparentes sobre texto ou sobre mais de uma cor de fundo.

<!-- s:dd4fefaac0 -->
`<Pixels>` (experimental)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` exporta `<Pixels>` para buffers de quadros `0xRRGGBBAA` em tempo real, como os de jogos, emuladores e vídeo. Grave pixels compactados diretamente em `source.data` e incremente `frame` para repintar.

<!-- s:2d12b69e81 -->
| Prop | Descrição |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` na ordem `0xRRGGBBAA` |
| `frame` | Contador de quadros; incremente após alterar `source.data` |
| `width` / `height` | Tamanho da caixa em células e linhas |
| `fit` | `contain` (padrão) ou `fill` |
| `pixelAspect` | Largura exibida dividida pela altura de um pixel de origem (padrão `1`) |
| `palette` | Paleta `PackedColor[]` opcional usada como referência para quantizar as cores |
| `sample` | Filtro para a alternativa em meios-blocos: `nearest` (padrão) ou `average` |
| `renderMode` | `auto` (padrão: sprite onde houver suporte, meios-blocos `▀` nos demais casos) ou `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` desenha um sprite pixelado no Chromium e no Firefox conforme as regras de estilo do console dele (sem medição de desempenho), e usa meios-blocos `▀` como alternativa no Safari, em terminais, em cópias em texto puro e em páginas com [`runtime = "server"`](/docs/server-rendering). Passe `renderMode="halfblock"` para desenhar meios-blocos em todos os lugares.

<!-- s:5d2bbbc47b -->
Para desenhar pixels sem React, importe `drawPixels` de `@textjs/core/experimental` junto com `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` e `PixelRect`. A opção `encoding: "rgba"` mantém mais de 256 cores e transparência alfa gradual para imagens estáticas, e `fallback` pinta suas próprias células onde o sprite não puder ser exibido. Consulte [Alterações incompatíveis](/docs/support-policy#breaking-changes) para saber como as exportações experimentais são versionadas.
