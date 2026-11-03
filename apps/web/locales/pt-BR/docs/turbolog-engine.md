<!-- s:aca2697522 -->
Turbolog transforma cada commit do React em uma chamada a `console.log`, ou nenhuma se nenhuma célula mudou.

<!-- s:d01b048a1d -->
Objetivos

<!-- s:53b8b34f5a -->
1. **Uma chamada por quadro alterado.**
2. **Zero chamadas quando ocioso.** Um quadro sem alterações retorna antes de construir uma string.
3. **Poucos argumentos de estilo.** 149 spans `%c` para as 3.200 células de um painel denso de `100×32`.

<!-- s:e284ac0068 -->
Pipeline

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
O quadro fica em arrays tipados planos para caracteres, cores e atributos, alocados uma única vez.

<!-- s:6215aa69f7 -->
Filtro de alterações

<!-- s:617da960c4 -->
Cada linha recebe um hash. Se nada mudou, o driver retorna antecipadamente:

<!-- s:524a0717a4 -->
Troca de quadros

<!-- s:3c7194b785 -->
Turbolog anexa quadros e limpa o console apenas no primeiro quadro, após `invalidate()`, quando ocioso depois de acumular 100 quadros, e aos 300. DevTools remove as mensagens apagadas de imediato, mas limita a pintura de novas mensagens a intervalos de 50 ms, então limpar a cada quadro faz o console vazio piscar. Os quadros anexados são trocados em uma única pintura, e um span de largura zero que funciona como cortina mantém o quadro anterior fora de vista. Role para cima para ver os quadros anteriores.

<!-- s:7845be2cbb -->
Os quadros são cadenciados a cerca de 15 fps. Quadros mais rápidos reiniciam o intervalo de limitação do DevTools e são descartados.

<!-- s:a36177ad5b -->
Codificação por comprimento de sequência

<!-- s:d4079278eb -->
Células iguais se unem em um único span `%c`. Os spans continuam pelas quebras de linha, e as strings CSS são internadas.

<!-- s:7fe20496b0 -->
Detalhes do Chromium

<!-- s:ff8301db1f -->
- O `%` literal é escapado como `%%`.
- URLs e textos `path:line` recebem um word joiner para que o DevTools não altere seus estilos.
- Os spans usam apenas propriedades CSS por extenso. DevTools copia cada propriedade expandida para cada linha.
- Os spans são ajustados para que os fundos se encaixem sem lacunas.

<!-- s:41e36e3179 -->
Firefox e Safari

<!-- s:8b2f3136a1 -->
Chromium dispõe cada linha de um span `%c` como um bloco inline. Firefox e Safari mantêm os spans inline, então ignoram margens verticais e quebram linhas longas. `CssConsoleDriver` detecta o navegador com testes de recursos CSS e, para esses dois consoles, define uma altura de linha de 14 px sem margens, desativa a quebra de linha com `text-wrap-mode: nowrap` e empurra quadros anteriores para fora de vista com uma cortina `line-height: 100vh`. O ajuste ao console reserva espaço para a coluna de links de origem do Firefox. Safari coloca Menlo em primeiro lugar na lista de fontes, porque suas páginas não podem usar uma SF Mono instalada pelo usuário que o Web Inspector pode usar para desenhar o texto. Passe `browser` para `createConsoleRoot` para escolher um console por conta própria.

<!-- s:66b07a5809 -->
Benchmarks

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` em um painel denso de `100×32`, média de 1.000 quadros (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Quadro | Tempo | Spans `%c` |
| :-- | --: | --: |
| Repintura completa (layout, pintura, codificação) | **0,163 ms** | 149 |
| Edição de uma linha | **0,011 ms** | 149 |
| Ocioso | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
A página [Status](/status) executa o mesmo pipeline no seu navegador. Execute `text.stats()` no DevTools enquanto uma demonstração do [Playground](/playground) estiver em execução.
