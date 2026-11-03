<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (ou `@textjs/react/testing`) renderiza seu app fora da tela, pressiona teclas e retorna o quadro como texto. Os testes rodam sem navegador ou DevTools.

<!-- s:9bc71b1ad2 -->
Funciona com qualquer executor que aceite testes `async`, incluindo Bun, Vitest e Jest.

<!-- s:f7898e6b92 -->
Renderização

<!-- s:fc969a7928 -->
| Método | Descrição |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Montar fora da tela (padrão 80×24) |
| `lastFrame()` | O quadro como texto puro |
| `lines()` | O quadro como um array de linhas |
| `frames` | Todos os quadros distintos até agora |
| `toAnsi()` | ANSI truecolor, para snapshots |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` da primeira correspondência |
| `rerender(el)` / `unmount()` | Atualizar ou desmontar |

<!-- s:893f22353a -->
`renderToString(el, options)` renderiza uma vez e retorna o texto.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:105149560b -->
Cada chamada roda dentro de `act()` e processa os quadros resultantes, para que a próxima asserção veja a atualização.

<!-- s:1f65c071dc -->
Tempo

<!-- s:ab365d9403 -->
Animações, indicadores de carregamento e notificações temporárias usam temporizadores reais, então `wait` e `waitFor` são a maneira confiável de observá-los.

<!-- s:26f93acae3 -->
Snapshots

<!-- s:05724c9883 -->
Os espaços em branco à direita e na parte inferior dos quadros são removidos, para que os snapshots não mudem por causa deles.
