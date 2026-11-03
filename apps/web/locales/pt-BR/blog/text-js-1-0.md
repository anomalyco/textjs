<!-- s:5a6798e6a5 -->
Hoje lançamos o Text.js 1.0, o framework de console para a Web.

<!-- s:e4787165f5 -->
O Text.js renderiza apps React 19 no console do Chrome DevTools, com layouts, roteamento, foco, entrada de dados, formulários, gráficos e Markdown em streaming desenhados com `console.log`.

<!-- s:48b184a262 -->
Novidades da versão 1.0

<!-- s:7f7f2a9a76 -->
- **O App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` e `api/*/route.ts`, sincronizados com `window.location`. Ele segue as convenções do App Router do Next.js.
- **Turbolog.** O Yoga flexbox organiza uma grade de células, um `CellBuffer` de arrays tipados a armazena, e um codificador por comprimento de sequência a transforma em uma única chamada a `console.log(format, ...css)`. Quadros ociosos não fazem chamadas ao console.
- **Um kit de componentes.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` virtualizada, `Table`, `Tree`, gráficos, caixas de diálogo, notificações toast e uma paleta de comandos `Ctrl+K` do `useKeymap`.
- **Quadros anexados.** Os quadros são anexados abaixo do anterior, para que o console não pisque vazio entre quadros. Mais sobre isso em [Turbolog: eliminando a piscada](/blog/turbolog-eliminating-the-flash).
- **Texto da direita para a esquerda.** Hebraico e árabe são renderizados em ordem visual com modelagem de caracteres árabes, a partir de uma implementação do UAX #9 que passa em todos os 770.241 casos de `BidiTest.txt`. Veja [Texto da direita para a esquerda no console](/blog/right-to-left-text).
- **Um console responsivo.** O Text.js se ajusta ao painel acoplado do DevTools, incluindo o zoom da página e uma barra de ferramentas com quebra de linha. Quando desacoplado, usa `120×36` como padrão.
- **`text run`.** O mesmo app App Router é renderizado em um terminal real.
- **Ferramentas para agentes e editores.** `text mcp` disponibiliza seu app para agentes de programação pelo Model Context Protocol, e a extensão Text.js DevTools adiciona um painel ao lado de “Console”. `eslint-plugin-textjs` e uma extensão para VS Code também fazem parte da versão 1.0.

<!-- s:b71c4a16bc -->
Uma mudança de nome

<!-- s:b47aa37902 -->
O pacote do framework agora é `@textjs/next`. O nome `textjs` já estava em uso no npm. Atualize suas importações:

<!-- s:e4005009f1 -->
**Atualização, 1.0.2:** o pacote agora é `@textjs/app`, e `@textjs/next` está descontinuado. Para mudar, execute `bun remove @textjs/next && bun add @textjs/app` e importe de `@textjs/app`.

<!-- s:5b35a47b90 -->
Números

<!-- s:2ee54da34c -->
Em um dashboard denso de `100×32` (46 nós de texto, 149 spans `%c`), medido com `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Quadro | Média |
| :-- | --: |
| Repintura completa (layout, pintura, codificação) | 0,163 ms |
| Edição de uma linha (digitação) | 0,011 ms |
| Ocioso | 0,000 ms, 0 chamadas ao console |

<!-- s:2fee8c4c3d -->
Um quadro sem alterações retorna antes de alocar uma string, então quadros ociosos medem 0,000 ms.

<!-- s:a0fa47c98f -->
Experimentar

<!-- s:aeb9cc2b5d -->
Abra [textjs.org](/) e pressione ⌘⌥J (Ctrl+Shift+J no Windows e no Linux). O site executa um app Text.js no seu console, com uma visualização por página. O [Playground](/playground) tem um dashboard, Markdown em streaming e Snake. O [OpenCode](/opencode) se conecta ao seu servidor OpenCode local.

<!-- s:31dd2e762c -->
A lista completa de mudanças está no [registro de alterações](/changelog), e o código-fonte está no [GitHub](https://github.com/anomalyco/textjs).
