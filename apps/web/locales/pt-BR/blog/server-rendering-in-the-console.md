<!-- s:f0ba49aa8c -->
O Text.js 0.4 adicionou um segundo lugar para renderizar uma página. Por padrão, a árvore React de uma página é executada na aba do navegador. Uma página que exporta `runtime = "server"` é executada no servidor, e o navegador recebe seus quadros.

<!-- s:1a12ccffbb -->
`Load` é um componente `async function`. No servidor, ele suspende a renderização até o `<Suspense>` ou `loading.tsx` mais próximo até que sua promise seja resolvida, e pode ler arquivos, bancos de dados e módulos `node:*` diretamente. Componentes assíncronos carregam dados e não podem usar hooks. Os componentes regulares ao redor deles mantêm hooks, foco, `useInput`, `<Link>` e `useRouter()`, que se comportam da mesma forma nos dois ambientes de execução.

<!-- s:f6c454b214 -->
O que o navegador baixa

<!-- s:6764f4bb25 -->
Uma página renderizada no servidor não envia React, Yoga nem suas rotas. O navegador carrega um reprodutor de quadros de cerca de 21 kB em gzip, que mantém um `CellBuffer` e o mesmo `CssConsoleDriver` usado pelo renderizador do cliente. Ele cadencia os quadros nos mesmos 15 fps, de modo que um quadro renderizado no servidor produz a mesma chamada a `console.log` que o cliente produziria.

<!-- s:c1c4090983 -->
O protocolo

<!-- s:20c7e299b3 -->
Cada aba abre sua própria sessão no servidor: uma raiz React, um histórico do roteador em memória e um buffer de células. Um endpoint transporta os dados nas duas direções:

<!-- s:0cce1c98cc -->
O servidor envia apenas as linhas cujo hash mudou desde o último quadro recebido por aquela conexão. Cada linha é enviada como sequências de texto associadas a uma tabela de estilos que só permite anexar entradas. Grafemas largos, agrupamentos de emojis e cores translúcidas chegam intactos.

<!-- s:bff22f361e -->
Os quadros têm um intervalo mínimo de 66 ms, e cada um é comparado com o último estado aceito pelo socket. Quando uma conexão lenta para de escoar os dados, os estados intermediários são ignorados, e o próximo quadro salta para o estado mais recente.

<!-- s:f0809ea8c7 -->
Se o fluxo cair, o reprodutor se reconecta com o ID da sessão no cabeçalho `x-textjs-live` e retoma a mesma sessão a partir de um novo quadro-chave, com seu estado intacto. Os IDs de sessão são valores aleatórios de 192 bits mantidos em memória, nunca na URL. Uma sessão sem conexão para de renderizar e é desmontada após 30 segundos.

<!-- s:2c75bd5d29 -->
Ambos os endpoints rejeitam requisições entre sites, e cada evento de entrada é validado contra um esquema fixo. Uma sessão aceita no máximo 64 eventos por POST e cerca de 240 por segundo.

<!-- s:a36b73dab0 -->
Componentes assíncronos e dados

<!-- s:2620366315 -->
A promise de cada componente assíncrono é armazenada em cache por sessão, com o componente e suas props como chave, de modo que uma nova tentativa de renderização reutiliza a requisição já em andamento. O cache é limpo quando a rota muda e quando você chama `router.refresh()`:

<!-- s:64ce138e40 -->
Módulos exclusivos do servidor recebem o nome `*.server.ts`. O build falha se um código enviado ao navegador importar um desses módulos ou um módulo nativo `node:*`, e informa qual módulo fez a importação.

<!-- s:981308ad14 -->
Pré-renderização parcial

<!-- s:9142a7d770 -->
A pré-renderização parcial funciona sem um servidor. Agora, `text build` renderiza cada rota estática uma vez e incorpora seu primeiro quadro ao HTML da rota como um pequeno `<script>` clássico, para que o console pinte antes de qualquer módulo carregar.

<!-- s:d51b081ec7 -->
O shell é tudo que renderiza de forma síncrona. Um limite de `<Suspense>` que ainda está aguardando mostra seu fallback, incluindo componentes assíncronos, e `fetch()` nunca é resolvido durante a renderização do shell.

<!-- s:33ba4145a3 -->
Quando o JavaScript inicia, o renderizador do cliente ou o reprodutor de quadros transmite o quadro real. Como a versão 0.4 também anexa quadros em vez de limpar, o renderizador que faz a hidratação começa com `initialClear: false` e registra abaixo do shell, e sua cortina tira o shell de vista na mesma pintura do DevTools. O console é limpo exatamente uma vez, pelo shell.

<!-- s:f6986897ee -->
O shell é renderizado no tamanho de `viewport` configurado, `120 × 36` por padrão, porque o build não tem como saber o tamanho do console do visitante. Com `viewport.responsive` ativado, o primeiro quadro ao vivo se ajusta ao console acoplado. Rotas dinâmicas não renderizam um shell, e `ppr: false` em `text.config.ts` desativa a pré-renderização.

<!-- s:c61865edfd -->
Escolher um ambiente de execução

<!-- s:aa5baec7ef -->
O ambiente de execução do cliente continua sendo o padrão. As teclas pressionadas geram uma pintura na mesma tarefa, e o app pode ter seu deploy feito em qualquer hospedagem estática. O ambiente de execução do servidor atende a dashboards e telas administrativas que leem dados privados, e a rotas cujas dependências você não quer no bundle do navegador. Um app pode combinar os dois, e a navegação entre eles carrega a URL de destino como um novo documento.

<!-- s:68f8c75df7 -->
A referência completa está em [Renderização no servidor](/docs/server-rendering).
