<!-- s:fe58dc6ae4 -->
Cada quadro do Text.js é uma chamada a `console.log`. Até a versão 0.4, cada quadro também era precedido por `console.clear()`. Sob carga, o console piscava vazio entre os quadros.

<!-- s:7a82fe5fe2 -->
Medir a piscada

<!-- s:1d16f5a106 -->
Para medir isso, criamos `bench/devtools`. Ele inicia o Chrome for Testing, abre o frontend real do DevTools como uma página e o instrumenta:

<!-- s:4da6ef7009 -->
- A cada `requestAnimationFrame` no frontend do DevTools, ele verifica se há um quadro completo de 32 linhas na área visível do console. Renderizações sem esse quadro são renderizações em branco.
- Depois, ele decodifica os quadros de `Page.startScreencast` para confirmar o resultado em pixels.
- Cada quadro traz `FRAME:<id> · T:<epochMs>` na linha 0, para que o frontend identifique qual quadro está exibindo e qual é o atraso.

<!-- s:cb3c553c37 -->
Com `console.clear()` antes de cada quadro, um painel de 100×32 a 15 fps ficou em branco em **70,6%** das renderizações do DevTools. A 60 fps, **81,1%**.

<!-- s:7076ddd27d -->
O motivo

<!-- s:1e65554dc0 -->
O `ConsoleView` do DevTools trata as duas chamadas de formas diferentes:

<!-- s:56484b5ac3 -->
1. `console.clear()` chama `consoleCleared()`, que invalida a área visível **de forma síncrona**. Todas as mensagens desaparecem na mesma tarefa.
2. `console.log()` chama `addConsoleMessage()`, que apenas agenda uma atualização por meio de `viewportThrottler`, um `Throttler` com um tempo limite de **50 ms**.

<!-- s:8a656fe37a -->
Assim, cada quadro remove o quadro anterior agora e renderiza o novo depois. A 15 fps, cerca de 50 de cada 66 ms não mostram nada.

<!-- s:8bb24ac9a4 -->
Anexar quadros

<!-- s:1092cc0920 -->
Desde a versão 0.4, o Turbolog anexa quadros. O DevTools mantém a rolagem no fim do console, então o novo quadro substitui o anterior em uma única renderização. Um span inicial de largura zero com `margin-top:100vh` (a cortina) empurra os quadros anteriores para fora da área visível e encerra sua própria linha para que o link do código-fonte do DevTools nunca reduza a largura da linha 0.

<!-- s:6e8cb684de -->
O console ainda precisa ser esvaziado em algum momento. A limpeza ocorre apenas no primeiro quadro, após `invalidate()`, durante a ociosidade quando 100 quadros já se acumularam e no limite máximo de 300.

<!-- s:58637d56ab -->
Ajustar o ritmo ao throttler

<!-- s:14c65af87d -->
Enviar quadros mais rápido do que o DevTools consegue renderizá-los não acelera nada. Um log que chega enquanto o throttler está pendente o reinicia, então quadros são descartados: a 60 fps, o DevTools renderizou 67 de 295 quadros emitidos. O Turbolog mantém um intervalo de pelo menos **66 ms** entre quadros, cerca de 15 fps, e ainda renderiza entradas discretas de forma síncrona quando o intervalo permite.

<!-- s:8a90fd55c3 -->
Romper o travamento de fase

<!-- s:e96505e7a5 -->
As limpezas também acrescentavam cerca de 50 ms de atraso a cada quadro seguinte. Após uma limpeza, o DevTools insere uma linha sintética `Console was cleared`. Ela ocupa a janela imediata do throttler e empurra o próximo quadro para o temporizador de 50 ms, e, com uma cadência constante de 66 ms, todos os quadros seguintes ficam presos a esse temporizador.

<!-- s:57527b9818 -->
O renderizador agora espera **110 ms** uma vez após qualquer limpeza. Depois disso, cada quadro chega mais de 50 ms após a conclusão da atualização anterior e segue o caminho imediato do DevTools. A mediana do atraso de exibição caiu de **63 ms para 10,4 ms**.

<!-- s:003645d0bf -->
Resultados

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, painel de 100×32, frontend real do DevTools:

<!-- s:9ee75054af -->
| Estratégia | FPS | Renderizações em branco | Renderizados / emitidos | Atraso p50 |
| :-- | --: | --: | --: | --: |
| Limpeza por quadro | 15 | 70,6% | 70 / 75 | 60,4 ms |
| **Anexar (1.0)** | **15** | **1,0%** | **74 / 75** | **10,4 ms** |
| Limpeza por quadro | 60 | 81,1% | 45 / 300 | 9,8 ms |
| Anexar, sem controle de ritmo | 60 | 0,8% | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
O 1% restante corresponde ao primeiro quadro, que limpa o console de propósito. Suas renderizações em branco são a linha `Console was cleared`, não um console vazio.

<!-- s:315471c65a -->
Menos propriedades por span

<!-- s:e210e7e85d -->
O código-fonte do DevTools revelou mais um custo. Ele copia cada *propriedade individual* de um estilo `%c` para cada contêiner de linha, então as propriedades abreviadas `font:` e `margin:` se expandiam para cerca de 33 propriedades por span. Agora os spans usam apenas propriedades individuais, cerca de 7 por span, com cores hexadecimais.

<!-- s:5b341c4930 -->
O modo de anexar quadros foi lançado no Text.js 0.4, e a correção do travamento de fase chega na versão 1.0. Nenhum dos dois exige alterações no código da aplicação.
