<!-- s:263d7e4a86 -->
A extensão Text.js DevTools adiciona um painel **Text.js** ao lado do Console. Ela inspeciona o app que está renderizando no console.

<!-- s:becd3b25ff -->
- **Componentes:** a árvore React de cada raiz do console, com props, hooks, chaves e os nós de cena `tx-box` / `tx-text` por trás deles, dispostos em células.
- **Quadro:** o quadro atual como uma grade de células. Passe o cursor sobre uma célula para ver qual componente a pintou. Clique para selecionar o nó. Ele fica destacado no console ao vivo.
- **Linha do tempo:** tempos de React, layout, pintura e codificação por quadro, quadros ignorados versus emitidos, cadência dos quadros e spans `%c`.
- **Controles:** pausar e retomar a saída, alternar o wireframe do layout, fixar ou ajustar o tamanho da grade, copiar o quadro como texto.

<!-- s:98304b8243 -->
Instalação

<!-- s:2452819f12 -->
A extensão é compilada a partir de `packages/devtools-extension` e carregada sem compactação:

<!-- s:3754c750b3 -->
1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione `packages/devtools-extension/dist`.
3. Recarregue seu app e abra o DevTools. O painel **Text.js** aparece assim que a página cria uma raiz do console.

<!-- s:e0c59fa53a -->
O build também gera `release/textjs-devtools-<version>.zip`, pronto para a Chrome Web Store.

<!-- s:364bc3ef6f -->
Componentes

<!-- s:e1204a3559 -->
Selecione um componente para ver suas props, seus hooks na ordem de chamada (`State`, `Ref`, `Memo`, `Effect` e assim por diante, com os valores atuais) e o nó de cena que ele renderiza, com posição, tamanho e recuos da caixa em células. Passar o cursor sobre uma linha destaca o nó no console. **Nós host** mostra ou oculta os elementos `tx-box` e `tx-text` entre os componentes.

<!-- s:77b62adc9c -->
A árvore é atualizada após os commits enquanto o painel está aberto. Os valores são resumos para exibição, não objetos ao vivo.

<!-- s:a0d819048c -->
Quadro

<!-- s:2cceea6000 -->
O inspetor de quadros desenha o buffer de células do renderizador: cada glifo, cor de primeiro plano, fundo e atributo. Passar o cursor sobre uma célula informa seu caractere e suas cores, o nó de cena sobre ela na ordem de pintura (respeitando `overflow`, deslocamentos de rolagem e `zIndex`) e os componentes que renderizaram esse nó. Clicar seleciona o nó em **Componentes** e o destaca no console ao vivo com a própria sobreposição de destaque do renderizador.

<!-- s:57a8990372 -->
Linha do tempo

<!-- s:2187cf7a17 -->
Cada barra é um quadro do renderizador:

<!-- s:f53def4922 -->
| Fase | Medição |
| --- | --- |
| React | Trabalho síncrono do React executado no início do quadro |
| Layout | Layout do Yoga |
| Pintura | Rasterização da cena no buffer de células |
| Codificação | Construção da string de formato `%c` e chamada a `console.log()` |

<!-- s:9b988f3cfb -->
Os quadros ignorados aparecem esmaecidos: nada mudou, então nada foi registrado. O gráfico de cadência mostra o intervalo entre os quadros emitidos em relação ao intervalo mínimo de 66 ms.

<!-- s:8abccb04ec -->
A medição dos tempos termina em `console.log()`. A formatação e a pintura da mensagem acontecem dentro do DevTools e não podem ser observadas pela página, por isso a linha do tempo não as mostra. Renderizações concorrentes que fazem commit entre quadros são contadas como commits, sem medição de tempo.

<!-- s:5ae438610c -->
Funcionamento

<!-- s:1dda342130 -->
Assim como o React DevTools, a extensão instala um hook global antes de a página executar:

<!-- s:9a7af3e89c -->
Cada raiz do console se registra nele. A primeira raiz de uma página carrega o código que se comunica com o painel (cerca de 5 KB com gzip) e se registra assim que ele chega. As raízes seguintes se registram conforme são criadas. Sem a extensão, o hook não existe, então cada raiz verifica sua presença uma vez, não carrega nada e não executa nenhum trabalho por quadro. Com a extensão instalada, mas com o painel fechado, os quadros custam uma leitura de propriedade. As árvores e os quadros só são calculados quando o painel os solicita.

<!-- s:843fc9a8ad -->
As mensagens seguem o fluxo página → script de conteúdo → service worker → painel. Os scripts de conteúdo executam em todas as páginas para que o hook exista antes de seu app iniciar. Esse é o único acesso que a extensão solicita. Ela não carrega código remoto nem envia nada para fora da máquina.

<!-- s:e425f181df -->
Privacidade

<!-- s:f2cd52a110 -->
A extensão não coleta dados. Ela não faz requisições de rede, não armazena nada e não tem análise de uso. Árvores de componentes, quadros e medições de tempo trafegam apenas entre a página e o painel do DevTools no mesmo navegador e são descartados quando você fecha o DevTools. **Copiar quadro** grava o texto do quadro na sua área de transferência quando você clica nele.

<!-- s:639d5ea4c0 -->
Limitações

<!-- s:05616a1196 -->
- Chrome e navegadores baseados em Chromium, versão 111 ou posterior.
- Apps iniciados antes da instalação da extensão precisam ser recarregados.
- Apenas o quadro superior de uma aba é inspecionado.
- A linha do tempo registra quadros a partir da conexão do painel.
- Os tempos vêm de `performance.now()`, cuja precisão os navegadores reduzem para cerca de 0,1 ms.
